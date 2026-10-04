/** Детерминированное перемешивание по строке-зерну (одинаковый порядок при перерисовке). */
export function shuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  // Не оставляем порядок совпадающим с исходным, если элементов больше одного
  if (out.length > 1 && out.every((x, i) => x === items[i])) out.push(out.shift() as T)
  return out
}
