// Обёртка над localStorage. Любое обращение может бросить исключение
// (приватный режим, запрет сайта, переполнение), поэтому всё в try/catch.
// Если хранилище недоступно, данные живут в памяти до закрытия вкладки.

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const memory = new Map<string, string>()
let available: boolean | null = null

function probe(): boolean {
  if (available !== null) return available
  try {
    const k = '__srpski_probe__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    available = true
  } catch {
    available = false
  }
  return available
}

export function isStorageAvailable(): boolean {
  return probe()
}

export const safeStorage: KeyValueStorage = {
  getItem(key) {
    try {
      if (probe()) return window.localStorage.getItem(key)
    } catch {
      /* падаем в память */
    }
    return memory.get(key) ?? null
  },
  setItem(key, value) {
    memory.set(key, value)
    try {
      if (probe()) window.localStorage.setItem(key, value)
    } catch {
      /* переполнение или запрет: остаётся копия в памяти */
    }
  },
  removeItem(key) {
    memory.delete(key)
    try {
      if (probe()) window.localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

/**
 * Источник, откуда загружается и куда сохраняется весь прогресс целиком.
 * Сейчас есть localStorage (через zustand persist) и файл (progressFile.ts).
 * Облачную синхронизацию можно добавить ещё одной реализацией, слияние — mergeRecords.
 */
export interface StorageAdapter<T> {
  load(): Promise<T | null>
  save(data: T): Promise<void>
}

/** Ключи хранилища, используемые вне zustand (тема читается inline-скриптом в index.html). */
export const STORAGE_KEYS = {
  app: 'srpski-textbook',
  theme: 'srpski-theme',
  visitorCounted: 'srpski-visitor-counted',
} as const
