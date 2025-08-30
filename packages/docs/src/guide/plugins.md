# 开发插件

如果为单文件, 直接编写即可

如果为文件夹, 需要在 `index.ts` / `index.js` 文件中导出 `Plugin` 类

还有一些高级用法, 可以查阅 `ts` 的类型文件

更多示例可以参考 [example](https://github.com/HkTeamX/ATRI/tree/main/packages/example)

```ts
import { BasePlugin } from '@huan_kong/atri'
import { Command } from 'commander'
import { convertCQCodeToJSON, type SendMessageSegment } from 'node-napcat-ts'

export interface PingConfig {
  default_reply: string
}

//             ↓ 类名固定                   ↓ 传入配置文件的类型
export class Plugin extends BasePlugin<PingConfig> {
  // ↓ 需要唯一
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
