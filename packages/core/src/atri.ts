import { Bot } from '@/bot.js'
import { Logger } from '@/logger'
import type { BasePlugin } from '@/plugin.js'
import type { NonEmptyArray } from '@/utils.js'
import { satisfies } from 'compare-versions'
import type { NCWebsocketOptions } from 'node-napcat-ts'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

export type ATRIConfig = NCWebsocketOptions & {
  base_dir: string
  prefix: NonEmptyArray<string>
  admin_id: NonEmptyArray<number>
  auto_load_help_plugin?: boolean
}

export interface WaitingPlugin {
  plugin_path: string
  dependencies: { [key: string]: string }
}

export class ATRI {
  logger: Logger

  config: ATRIConfig
  debug: boolean

  bot!: Bot

  loaded_plugins: { [key: string]: BasePlugin<object> } = {}
  waiting_plugins: { [key: string]: WaitingPlugin } = {}

  protected constructor(config: ATRIConfig, debug: boolean) {
    this.logger = new Logger('ATRI', debug)

    this.config = config
    this.debug = debug

    this.logger.SUCCESS(`ATRI 初始化完成`)
  }

  static async init(config: ATRIConfig, debug = false) {
    const logger = new Logger('ATRI', debug)
    logger.DEBUG(`初始化 ATRI 实例`)
    logger.DEBUG(`配置信息:`, config)
    logger.INFO(`高性能ですから！`)

    const atri = new ATRI(config, debug)

    atri.bot = await Bot.init(config, debug)

    if (config.auto_load_help_plugin ?? true) {
      await atri.load_plugin('help', import.meta.dirname)
    }

    return atri
  }

  async load_plugin(plugin_path: string, base_dir = this.config.base_dir) {
    this.logger.DEBUG(`开始加载 ${plugin_path} 插件`)

    let plugin_dir = path.join(base_dir, plugin_path)
    this.logger.DEBUG(`插件目录: ${plugin_dir}`)

    if (!fs.existsSync(plugin_dir)) {
      // 加载 .ts 判断是否存在
      let plugin_file = `${plugin_dir}.ts`
      this.logger.DEBUG(`插件非文件夹插件, 尝试为单文件插件`)
      this.logger.DEBUG(`新插件目录: ${plugin_file}`)

      if (!fs.existsSync(plugin_file)) {
        // 加载 .js 判断是否存在
        const plugin_file_js = `${plugin_dir}.js`
        this.logger.DEBUG(`插件非但文件TS插件, 尝试为单文件JS插件`)
        this.logger.DEBUG(`新插件目录: ${plugin_file_js}`)

        if (!fs.existsSync(plugin_file_js)) {
          this.logger.ERROR(`插件 ${plugin_dir} 入口文件不存在`)
          return false
        }

        plugin_file = plugin_file_js
      }

      plugin_dir = plugin_file
    }

    let plugin_entity: BasePlugin | undefined
    try {
      const module = await import(url.pathToFileURL(plugin_dir).toString())
      const plugin_variable = module.Plugin

      if (!plugin_variable) {
        this.logger.ERROR(`插件 ${plugin_path} 加载失败, 插件未导出 Plugin 变量`)
        return false
      }

      if (typeof plugin_variable !== 'function' || !plugin_variable.toString().includes('class')) {
        this.logger.ERROR(`插件 ${plugin_path} 加载失败, 插件不是有效的类`)
        return false
      }

      plugin_entity = new plugin_variable(this) as BasePlugin
      if (!plugin_entity.name || !plugin_entity.version) {
        this.logger.ERROR(`插件 ${plugin_path} 加载失败, 插件缺少必要参数`)
        return false
      }

      if (this.loaded_plugins[plugin_entity.name]) {
        this.logger.INFO(`插件 ${plugin_entity.name} 已加载, 跳过本次加载`)
        return true
      }

      // 检查依赖
      if (plugin_entity.dependencies) {
        const result = this.check_dependencies(plugin_entity.name, plugin_entity.dependencies)
        if (!result) {
          this.waiting_plugins[plugin_entity.name] = {
            plugin_path,
            dependencies: plugin_entity.dependencies ?? {},
          }
          return false
        }
      }

      // 开始加载配置文件
      if (plugin_entity.auto_load_config ?? true) {
        const config = await this.load_config(
          plugin_entity.config_name ?? plugin_entity.name,
          plugin_entity.default_config,
        )
        plugin_entity.config = config
      } else {
        plugin_entity.config = {}
      }

      // 执行初始化
      await plugin_entity.init?.()
    } catch (error) {
      this.logger.ERROR(`加载插件 ${plugin_entity?.name ?? plugin_path} 失败`, error)
      return false
    }

    this.loaded_plugins[plugin_entity.name] = plugin_entity
    this.logger.SUCCESS(`插件 ${plugin_entity.name} 加载成功`)

    // 加载完成了, 检查等待队列
    if (Object.keys(this.waiting_plugins).length > 0) {
      for (const [plugin_name, waiting_plugin] of Object.entries(this.waiting_plugins)) {
        if (plugin_entity.name === plugin_name) continue
        // 检查依赖
        const result = this.check_dependencies(plugin_name, waiting_plugin.dependencies)
        if (result) {
          this.logger.INFO(`等待队列中的插件 ${plugin_name} 依赖满足, 开始加载`)
          const load_result = await this.load_plugin(waiting_plugin.plugin_path)
          // 移除等待队列
          if (load_result) delete this.waiting_plugins[plugin_name]
        }
      }
    }

    return true
  }

  private check_dependencies(
    plugin_name: string,
    dependencies: WaitingPlugin['dependencies'] = {},
  ) {
    for (const [name, version] of Object.entries(dependencies)) {
      const loaded_plugin = this.loaded_plugins[name]
      if (!loaded_plugin) {
        this.logger.ERROR(`插件 ${plugin_name} 加载失败, 缺少依赖插件 ${name}, 已加入等待队列`)
        return false
      }

      if (!satisfies(loaded_plugin.version, version)) {
        this.logger.ERROR(
          `插件 ${plugin_name} 加载失败, 依赖插件 ${name} 版本不匹配 (需要: ${version}, 当前: ${loaded_plugin.version})`,
        )
        return false
      }
    }

    return true
  }

  async load_config(config_name: string, default_config = {}) {
    this.logger.DEBUG(`开始加载 ${config_name} 配置`)

    const config_dir = path.join(this.config.base_dir, 'config')
    if (!fs.existsSync(config_dir)) fs.mkdirSync(config_dir)

    const config_file = path.join(config_dir, `${config_name}.json`)
    if (!fs.existsSync(config_file))
      fs.writeFileSync(config_file, JSON.stringify(default_config, null, 2))

    const config_text = fs.readFileSync(config_file, 'utf-8')
    let config_json: object | undefined

    try {
      config_json = JSON.parse(config_text) as object
      config_json = { ...default_config, ...config_json }
      fs.writeFileSync(config_file, JSON.stringify(default_config, null, 2))
    } catch (error) {
      this.logger.ERROR(`配置 ${config_name} 加载失败`, error)
      throw new Error(`配置 ${config_name} 加载失败`)
    }

    this.logger.DEBUG(`配置 ${config_name} 内容:`, config_json)
    this.logger.SUCCESS(`配置 ${config_name} 加载成功`)

    return config_json
  }
}
