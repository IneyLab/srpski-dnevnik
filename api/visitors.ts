// Счётчик уникальных посетителей: Vercel Function + Upstash Redis (REST API, без зависимостей).
//
// GET  /api/visitors → { count }
// POST /api/visitors → INCR, { count }
//
// Уникальность обеспечивает браузер: после первого POST он ставит в localStorage флажок
// «уже посчитан» (не идентификатор). Ограничение: считается браузер/устройство, а не человек.
// Сервер не хранит и не читает ни cookies, ни IP, ни других персональных данных.
//
// Переменные окружения создаёт интеграция Upstash в Vercel Marketplace:
// KV_REST_API_URL / KV_REST_API_TOKEN (или UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).

const KEY = 'srpski:visitors'

const BOT_UA =
  /bot|crawl|spider|slurp|archiver|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|curl|wget|python|httpclient|java\/|go-http|axios|node-fetch/i

/** Простой фильтр ботов: пустой User-Agent или известные краулеры и HTTP-библиотеки. */
export function isBot(ua: string): boolean {
  return !ua || BOT_UA.test(ua)
}

export function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost')
}

function redis(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

async function command(cmd: string[]): Promise<number> {
  const r = redis()
  if (!r) throw new Error('Upstash не подключён')
  const res = await fetch(r.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${r.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  })
  if (!res.ok) throw new Error(`Upstash: ${res.status}`)
  const data = (await res.json()) as { result: string | number | null }
  return Number(data.result ?? 0)
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

export async function GET(): Promise<Response> {
  try {
    return json({ count: await command(['GET', KEY]) })
  } catch {
    return json({ error: 'unavailable' }, 503)
  }
}

export async function POST(request: Request): Promise<Response> {
  const ua = request.headers.get('user-agent') ?? ''
  const host = new URL(request.url).hostname
  try {
    // Боты и локальная разработка не считаются, но число получают
    if (isBot(ua) || isLocalHost(host)) return json({ count: await command(['GET', KEY]) })
    return json({ count: await command(['INCR', KEY]) })
  } catch {
    return json({ error: 'unavailable' }, 503)
  }
}
