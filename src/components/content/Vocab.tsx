import s from './content.module.css'
import { VOCAB } from '../../content/registry'
import { SrText } from '../sr/Sr'
import { Say } from './Say'
import { pickGender, useGender } from '../../store/hooks'
import type { VocabItem } from '../../content/types'

const G_LABEL = { m: 'м', f: 'ж', n: 'с' } as const

/** Таблица слов: сербское слово, перевод, кнопка озвучки (Google Переводчик). */
export function VocabList({ items, title = 'Словарь' }: { items: VocabItem[]; title?: string | false }) {
  const gender = useGender()
  if (!items.length) return null
  return (
    <>
      {title && <h2>{title}</h2>}
      <div className={s.vocab}>
        {items.map((v, i) => (
          <div key={i} className={s.vocabRow}>
            <div>
              <SrText text={v.sr} />
              {v.g && <span className={s.vocabG}>({G_LABEL[v.g]})</span>}
              {v.falseFriend && <span className={s.ffBadge}>ложный друг</span>}
            </div>
            <div>
              {v.ru}
              {v.note && <span className={s.vocabG}> — {v.note}</span>}
            </div>
            <div className={s.vocabSay}>
              <Say word={pickGender(v.sr, gender)} />
            </div>
            {v.falseFriend && <div className={s.ff}>⚠️ {v.falseFriend}</div>}
          </div>
        ))}
      </div>
    </>
  )
}

/** Слова недели из vocab.ts; lesson="s2" — только слова этого занятия. title={false} — без заголовка. */
export function Vocab({ week, lesson, title }: { week: number; lesson?: string; title?: string | false }) {
  const items = (VOCAB[week] ?? []).filter((v) => !lesson || v.lesson === lesson)
  return <VocabList items={items} title={title} />
}
