import type { Command, OptionValues } from 'commander'
import type { MessageHandler, NoticeHandler, RequestHandler } from 'node-napcat-ts'

export type CallbackReturnType = Promise<void | 'quit'> | void | 'quit'

export interface CommandEvent<
  T extends keyof MessageHandler = 'message',
  K extends OptionValues = object,
> {
  type: 'command'
  end_point?: T
  callback: (context: {
    context: MessageHandler[T]
    prefix: string
    command_name: string
    params: K
    args: string[]
  }) => CallbackReturnType
  plugin_name: string
  command_name: string | RegExp
  commander?: Command
  priority?: number
  need_hide?: boolean
  need_reply?: boolean
  need_admin?: boolean
}

export interface MessageEvent<T extends keyof MessageHandler = 'message'> {
  type: 'message'
  end_point?: T
  regexp?: RegExp
  callback: (context: { context: MessageHandler[T] }) => CallbackReturnType
  plugin_name: string
  priority?: number
  need_reply?: boolean
  need_admin?: boolean
}

export interface NoticeEvent<T extends keyof NoticeHandler = 'notice'> {
  type: 'notice'
  end_point?: T
  callback: (context: { context: NoticeHandler[T] }) => CallbackReturnType
  plugin_name: string
  priority?: number
}

export interface RequestEvent<T extends keyof RequestHandler = 'request'> {
  type: 'request'
  end_point?: T
  callback: (context: { context: RequestHandler[T] }) => CallbackReturnType
  plugin_name: string
  priority?: number
}

export type RegEventOptions = CommandEvent | MessageEvent | NoticeEvent | RequestEvent
