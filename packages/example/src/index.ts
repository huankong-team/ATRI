import { ATRI, Logger } from '@huan_kong/atri'
import { config } from 'dotenv'
import { type NCWebsocketOptionsHost } from 'node-napcat-ts'
import path from 'node:path'
import process from 'node:process'

const start_time = performance.now()

// 清空终端
console.log('\x1Bc')

config({
  path: path.join(import.meta.dirname, '../.env'),
  quiet: true,
})

const logger = new Logger('KKBot')
logger.INFO('开始加载 KKBOT')

const atri = await ATRI.init(
  {
    base_dir: import.meta.dirname,
    prefix: ['/', '!', '.', '#'],
    admin_id: [2564076459],
    protocol: (process.env.NC_PROTOCOL as NCWebsocketOptionsHost['protocol']) ?? 'ws',
    host: process.env.NC_HOST ?? '127.0.0.1',
    port: parseInt(process.env.NC_PORT ?? '3001'),
    accessToken: process.env.NC_ACCESS_TOKEN,
    reconnection: {
      enable: true,
      attempts: 1,
      delay: 5000,
    },
  },
  process.argv.includes('--debug'),
)

await atri.load_plugin('./plugins/ping')
await atri.load_plugin('./plugins/call')

logger.SUCCESS(`所有插件已加载完成`)

const end_time = performance.now()

logger.INFO(`KKBOT 加载完成! 总耗时: ${(end_time - start_time).toFixed(2)}ms`)
