import { describe, it, expect, vi, afterEach } from 'vitest'
import { isBot, isLocalHost, GET, POST } from '../../api/visitors'

const CHROME = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36'

describe('фильтр ботов', () => {
  it('браузеры — не боты', () => {
    expect(isBot(CHROME)).toBe(false)
    expect(isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0')).toBe(false)
  })
  it('краулеры, превью и библиотеки — боты', () => {
    for (const ua of ['', 'Googlebot/2.1', 'Mozilla/5.0 (compatible; bingbot/2.0)', 'facebookexternalhit/1.1', 'curl/8.4', 'python-requests/2.31', 'Mozilla/5.0 HeadlessChrome/120', 'TelegramBot (like TwitterBot)'])
      expect(isBot(ua), ua).toBe(true)
  })
  it('локальные адреса', () => {
    expect(isLocalHost('localhost')).toBe(true)
    expect(isLocalHost('app.localhost')).toBe(true)
    expect(isLocalHost('srpski-dnevnik.vercel.app')).toBe(false)
  })
})

describe('API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })
  const mockRedis = () => {
    vi.stubEnv('KV_REST_API_URL', 'https://redis.example')
    vi.stubEnv('KV_REST_API_TOKEN', 't')
    const calls: string[][] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: { body: string }) => {
        const cmd = JSON.parse(init.body) as string[]
        calls.push(cmd)
        return new Response(JSON.stringify({ result: cmd[0] === 'INCR' ? 42 : '41' }))
      }),
    )
    return calls
  }
  it('POST от браузера увеличивает счётчик', async () => {
    const calls = mockRedis()
    const res = await POST(new Request('https://srpski-dnevnik.vercel.app/api/visitors', { method: 'POST', headers: { 'user-agent': CHROME } }))
    expect(await res.json()).toEqual({ count: 42 })
    expect(calls[0][0]).toBe('INCR')
  })
  it('POST от бота только читает', async () => {
    const calls = mockRedis()
    await POST(new Request('https://srpski-dnevnik.vercel.app/api/visitors', { method: 'POST', headers: { 'user-agent': 'Googlebot' } }))
    expect(calls[0][0]).toBe('GET')
  })
  it('GET возвращает число', async () => {
    mockRedis()
    expect(await (await GET()).json()).toEqual({ count: 41 })
  })
  it('без Upstash — 503, а не падение', async () => {
    vi.stubEnv('KV_REST_API_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    expect((await GET()).status).toBe(503)
  })
})
