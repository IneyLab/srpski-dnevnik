import { describe, it, expect } from 'vitest'
import { serializeProgress, parseProgressFile, ProgressFileError, mergeRecords, SCHEMA_VERSION } from './progressFile'

describe('progressFile', () => {
  it('экспорт → импорт сохраняет данные', () => {
    const data = { lessons: { 'w1.s1': { done: true } }, settings: { script: 'lat' } }
    expect(parseProgressFile(serializeProgress(data))).toEqual(data)
  })
  it('отклоняет чужие и битые файлы', () => {
    expect(() => parseProgressFile('не json')).toThrow(ProgressFileError)
    expect(() => parseProgressFile('{"app":"other","schemaVersion":1,"data":{}}')).toThrow(ProgressFileError)
    expect(() => parseProgressFile('{"app":"srpski-textbook","data":{}}')).toThrow(ProgressFileError)
  })
  it('отклоняет файл из будущей версии', () => {
    const f = JSON.stringify({ app: 'srpski-textbook', schemaVersion: SCHEMA_VERSION + 1, data: {} })
    expect(() => parseProgressFile(f)).toThrow(/новой версией/)
  })
})

describe('mergeRecords', () => {
  it('новее побеждает', () => {
    const a = { x: { v: 1, updatedAt: '2026-10-05' }, y: { v: 1, updatedAt: '2026-10-07' } }
    const b = { x: { v: 2, updatedAt: '2026-10-06' }, y: { v: 2, updatedAt: '2026-10-06' }, z: { v: 3, updatedAt: '2026-10-01' } }
    expect(mergeRecords(a, b)).toEqual({
      x: { v: 2, updatedAt: '2026-10-06' },
      y: { v: 1, updatedAt: '2026-10-07' },
      z: { v: 3, updatedAt: '2026-10-01' },
    })
  })
})
