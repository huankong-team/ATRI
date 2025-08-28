# 快速开始

## 安装

### 前置准备

- [Node.js](https://nodejs.org/) 20 及以上版本。

`ATRI` 使用 `pnpm` 作为默认包管理工具,

原则上兼容市面上大部分包管理器但不保证不出问题。

::: code-group

```sh [pnpm]
pnpm add @huan_kong/atri
```

:::

::: tip 注意

ATRI 是仅 ESM 的软件包。不要使用 `require()` 导入它，并确保最新的 `package.json` 包含 `"type": "module"`，或者更改相关文件的文件扩展名，例如 `config.js` 到 `.mjs`/`.mts`。

此外，在异步 CJS 上下文中，可以使用 `await import('@huan_kong/atri')` 代替。

:::

## 使用

```ts
// 导入 ATRI 类
import { ATRI } from '@huan_kong/atri'

// 使用 init 函数初始化
const atri = await ATRI.init(
  {
    base_dir: import.meta.dirname,
    prefix: ['/', '!', '.', '#'],
    admin_id: [10001],
    protocol: 'ws',
    host: '127.0.0.1',
    port: 3001,
    accessToken: '',
    reconnection: {
      enable: true,
      attempts: 1,
      delay: 5000,
    },
  },
  false,
)

// 加载插件
await atri.load_plugin('./plugins/ping')
```

## 编写插件

如果为单文件, 直接编写即可

如果为文件夹, 需要在 `index.ts/js` 文件中导出 `Plugin` 类

```ts
import { BasePlugin } from '@huan_kong/atri'
import { Command } from 'commander'
import { convertCQCodeToJSON, type SendMessageSegment } from 'node-napcat-ts'

export interface PingConfig {
  default_reply: string
}

//             ↓ 类名固定                   ↓ 传入配置文件的类型
export class Plugin extends BasePlugin<PingConfig> {
  name = 'ping'
  version = '1.0.0'
  // 和 package.json 使用一样的版本比较
  dependencies = {
    call: '^1.0.0',
  }

  // 默认配置, 会与本地的 json 文件进行同步和补全
  default_config: PingConfig = {
    default_reply: 'pong',
  }

  init() {
    this.reg_command_event({
      command_name: 'ping',
      commander: new Command()
        .description('检查Bot是否在线, 并返回指定内容')
        .argument('[content]', '要回复的内容', this.config.default_reply),
      callback: async ({ context, args }) => {
        // this.bot 上挂载了一些常用的发送消息函数, 具体请看 ts 类型提示
        await this.bot.send_msg(context, convertCQCodeToJSON(args[0]) as SendMessageSegment[], {
          reply: false,
          at: false,
        })
      },
    })

    // 可以手动指定类型, 第一个参数为 end_point
    // 默认为 message 如果有设定请与设定的 end_point 一致, 会影响 context 的类型
    // 第二个参数为 params 的类型
    this.reg_command_event<'message', { reply: string }>({
      command_name: 'ping2',
      commander: new Command()
        .description('检查Bot是否在线, 并返回指定内容')
        .option('-r, --reply <content>', '要回复的内容', this.config.default_reply),
      callback: async ({ context, params }) => {
        await this.bot.send_msg(
          context,
          convertCQCodeToJSON(params.reply) as SendMessageSegment[],
          {
            reply: false,
            at: false,
          },
        )
      },
    })
  }
}
```
