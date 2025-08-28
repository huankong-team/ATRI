import { BasePlugin } from '@huan_kong/atri'
import { Command } from 'commander'
import { convertCQCodeToJSON, type SendMessageSegment } from 'node-napcat-ts'

export interface PingConfig {
  default_reply: string
}

export class Plugin extends BasePlugin<PingConfig> {
  name = 'ping'
  version = '1.0.0'
  dependencies = {
    call: '^1.0.0',
  }
  default_config: PingConfig = {
    default_reply: 'pong',
  }

  init() {
    this.reg_command_event<'message', { reply: string }>({
      command_name: 'ping',
      commander: new Command()
        .description('检查Bot是否在线, 并返回指定内容')
        .argument('[content]', '要回复的内容', this.config.default_reply),
      callback: async ({ context, args }) => {
        await this.bot.send_msg(context, convertCQCodeToJSON(args[0]) as SendMessageSegment[], {
          reply: false,
          at: false,
        })
      },
    })
  }
}
