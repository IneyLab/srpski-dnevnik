import { Sr } from './Sr'

/** Строка из данных, где сербские фрагменты отмечены `обратными кавычками`, как в MDX. */
export function Rich({ text }: { text: string }) {
  const parts = text.split('`')
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <Sr key={i}>{p}</Sr> : p))}
    </>
  )
}
