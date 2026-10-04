import { useEffect, useState } from 'react'
import { safeStorage, STORAGE_KEYS } from '../../lib/storage'

/**
 * Счётчик уникальных посетителей.
 * Браузер при первом визите ставит в localStorage флажок «уже посчитан» (не идентификатор,
 * просто «1») и один раз отправляет POST. Ограничение: уникален браузер/устройство, а не человек —
 * тот же человек с телефона и ПК или после очистки данных сайта будет посчитан ещё раз.
 * Без cookies, IP и персональных данных. На localhost не считаем и не показываем.
 */
const isLocal = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) || window.location.hostname.endsWith('.localhost')

export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (isLocal()) return
    let cancelled = false
    const counted = safeStorage.getItem(STORAGE_KEYS.visitorCounted) === '1'
    const req = counted ? fetch('/api/visitors') : fetch('/api/visitors', { method: 'POST' })
    req
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { count?: number }) => {
        if (!counted) safeStorage.setItem(STORAGE_KEYS.visitorCounted, '1')
        if (!cancelled && typeof data.count === 'number') setCount(data.count)
      })
      .catch(() => {
        /* счётчик не важен: просто не показываем */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (count === null) return null
  return (
    <span title="Уникальные посетители (браузеры/устройства)">
      <span aria-hidden="true">👁</span> {count.toLocaleString('ru-RU')} {plural(count)}
    </span>
  )
}

function plural(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'посетитель'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'посетителя'
  return 'посетителей'
}
