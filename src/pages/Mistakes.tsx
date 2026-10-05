import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import g from './game.module.css'
import { useApp, type MistakeRecord } from '../store/app'
import { pickGender, useG, useGender } from '../store/hooks'
import { EXERCISES, WEEKS } from '../content/registry'
import { weekLessonOf } from '../lib/deck'
import { plural } from '../lib/plural'
import type { Exercise, Gendered, Lang } from '../content/types'
import { Rich } from '../components/sr/Rich'
import { Sr, SrText } from '../components/sr/Sr'

type Sort = 'count' | 'recent' | 'course'
type Filter = 'all' | 'word' | 'rule'

/** Текст на языке пункта: сербский — через переключатель алфавита. */
function T({ text, lang }: { text: Gendered; lang: Lang }) {
  const gender = useGender()
  return lang === 'sr' ? <SrText text={text} /> : <>{pickGender(text, gender)}</>
}

/** Что было в пункте упражнения и какой ответ правильный — заново из упражнения, в текущем алфавите и роде. */
function MistakeItem({ ex, index, fallback }: { ex: Exercise; index: number; fallback: string }) {
  const gender = useGender()
  switch (ex.type) {
    case 'choice':
    case 'listen': {
      const it = ex.items[index]
      if (!it) break
      return (
        <>
          {it.prompt && <Rich text={it.prompt} />} {it.sr && <SrText text={it.sr} />} →{' '}
          <span className={g.correct}>
            <T text={it.options[it.answer]} lang={it.optionsLang} />
          </span>
        </>
      )
    }
    case 'match': {
      const p = ex.pairs[index]
      if (!p) break
      return (
        <span className={g.correct}>
          <T text={p.left} lang={ex.leftLang} /> — <T text={p.right} lang={ex.rightLang} />
        </span>
      )
    }
    case 'fill': {
      const it = ex.items[index]
      if (!it) break
      return (
        <>
          <Sr>
            {it.before ? pickGender(it.before, gender) : ''} <span className={g.correct}>{pickGender(it.answers[0], gender)}</span>{' '}
            {it.after ? pickGender(it.after, gender) : ''}
          </Sr>
          {it.ru && <span className={g.muted}> — {it.ru}</span>}
        </>
      )
    }
    case 'dictation': {
      const it = ex.items[index]
      if (!it) break
      return (
        <>
          <span className={g.correct}>
            <SrText text={it.answer} />
          </span>
          {it.ru && <span className={g.muted}> — {it.ru}</span>}
        </>
      )
    }
    case 'build': {
      const it = ex.items[index]
      if (!it) break
      return (
        <>
          {pickGender(it.ru, gender)} →{' '}
          <span className={g.correct}>
            <SrText text={it.answers[0]} />
          </span>
        </>
      )
    }
    case 'script': {
      const word = ex.items[index]
      if (!word) break
      return (
        <>
          <Sr script="cyr">{word}</Sr> ↔ <Sr script="lat">{word}</Sr>
        </>
      )
    }
  }
  return <>{fallback}</>
}

function where(exId: string): { text: string; to: string } | null {
  const wl = weekLessonOf(exId)
  if (!wl) return null
  const slug = wl.lesson === 'checkin' ? 'checkin' : wl.lesson.slice(1)
  const meta = WEEKS[wl.week]?.lessons.find((l) => l.slug === slug)
  return { text: `Неделя ${wl.week}, ${meta?.code ?? wl.lesson}`, to: `/week/${wl.week}/lesson/${slug}#ex-${exId}` }
}

function courseOrder(m: MistakeRecord): string {
  const wl = weekLessonOf(m.source)
  const ex = Object.keys(EXERCISES).indexOf(m.source)
  return wl ? `${String(wl.week).padStart(2, '0')}.${wl.lesson.padStart(8, '0')}.${String(ex).padStart(5, '0')}` : 'zz'
}

export default function Mistakes() {
  const mistakes = useApp((st) => st.mistakes)
  const setResolved = useApp((st) => st.setMistakeResolved)
  const gtext = useG()
  const [sort, setSort] = useState<Sort>('count')
  const [filter, setFilter] = useState<Filter>('all')
  const [showResolved, setShowResolved] = useState(false)
  // Только что разобранные остаются в списке до ухода со страницы — чтобы отметку можно было снять
  const [keep, setKeep] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    document.title = 'Тетрадь ошибок — Српски дневник'
    return () => {
      document.title = 'Српски дневник'
    }
  }, [])

  const all = Object.entries(mistakes)
  const open = all.filter(([, m]) => !m.resolved).length
  const list = useMemo(() => {
    const items = Object.entries(mistakes).filter(
      ([k, m]) => (filter === 'all' || m.kind === filter) && (showResolved || !m.resolved || keep.has(k)),
    )
    return items.sort(([ka, a], [kb, b]) => {
      if (sort === 'count') return b.count - a.count || b.lastAt.localeCompare(a.lastAt)
      if (sort === 'recent') return b.lastAt.localeCompare(a.lastAt)
      return courseOrder(a).localeCompare(courseOrder(b)) || ka.localeCompare(kb)
    })
  }, [mistakes, sort, filter, showResolved, keep])

  const resolvedLabel = gtext('Разобралась', 'Разобрался')

  return (
    <div className={g.page}>
      <h1>Тетрадь ошибок</h1>
      <p className={g.intro}>
        Сюда автоматически попадают ошибки из упражнений: слова и правила. Открытых — {open}. Ошибочные слова также
        попадают в <Link to="/cards">карточки</Link>. Разобранная ошибка даёт немного опыта.
      </p>

      <div className={g.toolbar}>
        <label>
          Показать
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="all">всё</option>
            <option value="word">слова и фразы</option>
            <option value="rule">правила</option>
          </select>
        </label>
        <label>
          Порядок
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="count">сначала частые</option>
            <option value="recent">сначала недавние</option>
            <option value="course">по порядку курса</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          разобранные тоже
        </label>
      </div>

      {list.length ? (
        <ul className={g.mistakes}>
          {list.map(([key, m]) => {
            const ex = EXERCISES[m.source]
            const w = where(m.source)
            const idx = Number(key.split('#')[1])
            return (
              <li key={key} className={`${g.mistake} ${m.resolved ? g.resolved : ''}`}>
                <div className={g.mistakeHead}>
                  <span>
                    {m.kind === 'rule' ? 'Правило' : 'Слово / фраза'} · {ex ? <Rich text={ex.title} /> : m.source}
                  </span>
                  <span>
                    {m.count} {plural(m.count, 'раз', 'раза', 'раз')} · {new Date(m.lastAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className={g.mistakeBody}>
                  {m.kind === 'rule' ? (
                    <strong>
                      <Rich text={m.label} />
                    </strong>
                  ) : ex && Number.isInteger(idx) ? (
                    <MistakeItem ex={ex} index={idx} fallback={m.label} />
                  ) : (
                    m.label
                  )}
                  {m.kind === 'word' && m.lastGiven && (
                    <div className={g.small}>
                      Твой ответ:{' '}
                      <span className={g.given} lang="sr">
                        {m.lastGiven}
                      </span>
                    </div>
                  )}
                </div>
                <div className={g.mistakeActions}>
                  {w && (
                    <Link className="btn" to={w.to}>
                      Повторить <span className="visually-hidden">— упражнение</span>
                      <span className={g.muted}>({w.text})</span>
                    </Link>
                  )}
                  <label>
                    <input
                      type="checkbox"
                      checked={m.resolved}
                      onChange={(e) => {
                        setKeep((k) => new Set(k).add(key))
                        setResolved(key, e.target.checked, ex?.skill ?? null)
                      }}
                    />
                    {resolvedLabel}
                  </label>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className={`${g.sheet} ${g.empty}`}>
          {all.length
            ? 'Здесь пусто: все ошибки в этом фильтре разобраны.'
            : 'Ошибок пока нет. Они появятся, когда в упражнении что-то не сойдётся, — это нормально и полезно.'}
        </p>
      )}
    </div>
  )
}
