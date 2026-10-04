// Экспорт и импорт прогресса файлом (перенос между ПК и телефоном).

export const SCHEMA_VERSION = 1
const APP_ID = 'srpski-textbook'

export interface ProgressFile<T> {
  app: typeof APP_ID
  schemaVersion: number
  exportedAt: string
  data: T
}

export function serializeProgress<T>(data: T, now = new Date()): string {
  const file: ProgressFile<T> = { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data }
  return JSON.stringify(file, null, 2)
}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>
/** MIGRATIONS[n] переводит данные из версии n в n+1. */
const MIGRATIONS: Record<number, Migration> = {}

export function migrate(data: Record<string, unknown>, from: number): Record<string, unknown> {
  let d = data
  for (let v = from; v < SCHEMA_VERSION; v++) {
    const m = MIGRATIONS[v]
    if (!m) throw new Error(`Нет миграции с версии ${v}`)
    d = m(d)
  }
  return d
}

export class ProgressFileError extends Error {}

export function parseProgressFile(text: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ProgressFileError('Файл не похож на JSON.')
  }
  if (!parsed || typeof parsed !== 'object') throw new ProgressFileError('Пустой или повреждённый файл.')
  const f = parsed as Partial<ProgressFile<unknown>>
  if (f.app !== APP_ID) throw new ProgressFileError('Это не файл прогресса учебника.')
  if (typeof f.schemaVersion !== 'number') throw new ProgressFileError('В файле нет версии.')
  if (f.schemaVersion > SCHEMA_VERSION)
    throw new ProgressFileError('Файл сохранён более новой версией учебника. Обнови страницу и попробуй снова.')
  if (!f.data || typeof f.data !== 'object') throw new ProgressFileError('В файле нет данных.')
  return migrate(f.data as Record<string, unknown>, f.schemaVersion)
}

/** Слияние словарей записей «новее побеждает» по полю updatedAt (задел для синхронизации). */
export function mergeRecords<T extends { updatedAt?: string }>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = { ...a }
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k]
    if (!cur || (v.updatedAt ?? '') > (cur.updatedAt ?? '')) out[k] = v
  }
  return out
}
