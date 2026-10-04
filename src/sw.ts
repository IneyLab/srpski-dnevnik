/// <reference lib="webworker" />
// Сервис-воркер (vite-plugin-pwa, режим injectManifest).
// Интерфейс и тексты кешируются при установке. Аудио (~55 МБ) заранее не кешируется:
// файл скачивается целиком при первом прослушивании и дальше играет офлайн.
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { createPartialResponse } from 'workbox-range-requests'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Любой адрес приложения открывает index.html (SPA), кроме API и аудио
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//, /^\/audio\//] }))

// Аудио. Плеер запрашивает файл кусками (Range → 206), а такие ответы нельзя положить в кеш.
// Поэтому при первом запросе скачиваем файл целиком, кладём в кеш и отдаём нужный кусок из него.
const AUDIO_CACHE = 'go-serbia-audio'
registerRoute(
  ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/audio/') && url.pathname.endsWith('.mp3'),
  async ({ request }) => {
    const cache = await caches.open(AUDIO_CACHE)
    let full = await cache.match(request.url)
    if (!full) {
      try {
        const res = await fetch(request.url)
        if (res.status !== 200) return res
        await cache.put(request.url, res.clone())
        full = res
      } catch {
        return Response.error()
      }
    }
    return request.headers.has('range') ? createPartialResponse(request, full) : full
  },
)

// Шрифты Google: таблица стилей обновляется в фоне, файлы шрифтов — из кеша
registerRoute(({ url }) => url.origin === 'https://fonts.googleapis.com', new StaleWhileRevalidate({ cacheName: 'google-fonts-css' }))
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  }),
)
