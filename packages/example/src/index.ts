import { ATRI, Logger, performance_counter, type BotConfig } from '@huan_kong/atri'
import { config } from 'dotenv'
import type { NCWebsocketOptionsHost } from 'node-napcat-ts'
import path from 'node:path'
import process from 'node:process'

const get_elapsed_time = performance_counter()

config({
  path: path.join(import.meta.dirname, '../.env'),
  quiet: true,
})

const debug = process.argv.includes('--debug')

const logger = new Logger('KKBot', debug)
logger.INFO('开始加载 KKBOT')

const bot: BotConfig = {
  prefix: JSON.parse(process.env.PREFIX ?? '["/"]'),
  admin_id: JSON.parse(process.env.ADMIN_ID ?? '[10001]'),
  connection: {
    protocol: (process.env.NC_PROTOCOL ?? 'ws') as NCWebsocketOptionsHost['protocol'],
    host: process.env.NC_HOST ?? '127.0.0.1',
    port: parseInt(process.env.NC_PORT ?? '3001'),
    accessToken: process.env.NC_ACCESS_TOKEN,
  },
  reconnection: {
    enable: process.env.NC_RECONNECTION_ENABLE === 'true',
    attempts: parseInt(process.env.NC_RECONNECTION_ATTEMPTS ?? '10'),
    delay: parseInt(process.env.NC_RECONNECTION_DELAY ?? '5000'),
  },
}

const atri = await ATRI.init({
  bot,
  debug,
  base_dir: import.meta.dirname,
})

await atri.load_plugins(['./plugins/ping', './plugins/call'])

atri.check_waiting_plugins()

logger.INFO(`KKBOT 加载完成! 总耗时: ${get_elapsed_time()}ms`)
