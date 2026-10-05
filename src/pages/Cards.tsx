import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import g from './game.module.css'
import { useApp } from '../store/app'
import { pickGender, useG, useGender, useScript, useSr } from '../store/hooks'
import { EXERCISES, VOCAB } from '../content/registry'
import { ankiCsv, buildDeck, deckStats, dueQueue, NEW_PER_SESSION, type Card, type Dir } from '../lib/deck'
import { newCard, review, type Grade } from '../lib/srs'
import { Say } from '../components/content/Say'
import { Icon } from '../components/Icon'
import { STORAGE_KEYS, safeStorage } from '../lib/storage'
import { plural } from '../lib/plural'

type DirMode = Dir | 'both'
const DIR_LABEL: Record<DirMode, string> = { 'sr-ru': 'сербский → русский', 'ru-sr': 'русский → сербский', both: 'оба направления' }
const GRADES: { grade: Grade; label: string; key: string; cls?: string }[] = [
  { grade: 'again', label: 'Снова', key: '1', cls: g.again },
  { grade: 'hard', label: 'Трудно', key: '2' },
  { grade: 'good', label: 'Хорошо', key: '3' },
  { grade: 'easy', label: 'Легко', key: '4', cls: g.easy },
]
const DIR_KEY = `${STORAGE_KEYS.app}-cards-dir`

function intervalText(days: number): string {
  if (days < 1) return 'сейчас'
  if (days < 30) return `${days} дн.`
  return `${Math.round(days / 30)} мес.`
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Flashcard({ card, onGrade }: { card: Card; onGrade: (grade: Grade) => void }) {
  const gender = useGender()
  const sr = useSr()
  const srs = useApp((st) => st.srs[card.id])
  const [shown, setShown] = useState(false)
  const showBtn = useRef<HTMLButtonElement>(null)
  const word = pickGender(card.sr, gender)

  useEffect(() => {
    setShown(false)
    showBtn.current?.focus({ preventScroll: true })
  }, [card.id])

  useEffect(() => {
    if (!shown) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.altKey || e.ctrlKey || e.metaKey) return
      const gr = GRADES.find((x) => x.key === e.key)
      if (gr) {
        e.preventDefault()
        onGrade(gr.grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shown, onGrade])

  const srSide = (
    <span className={g.flashWord}>
      <span lang="sr">{sr(word)}</span>
      {card.audio && <Say word={word} />}
    </span>
  )
  const ruSide = <span className={g.flashWord}>{card.ru}</span>
  const front = card.dir === 'sr-ru' ? srSide : ruSide
  const back = card.dir === 'sr-ru' ? ruSide : srSide
  const notes = [card.g ? { m: 'мужской род', f: 'женский род', n: 'средний род' }[card.g] : '', card.note ?? '', card.falseFriend ? `Ложный друг: ${card.falseFriend}` : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <section className={`${g.sheet} ${g.flash}`} aria-label="Карточка">
      <p className={g.flashMeta}>
        {DIR_LABEL[card.dir]} · неделя {card.week || '—'}
        {card.fromMistake && (
          <>
            {' '}
            · <span className={g.mistakeTag}>из тетради ошибок</span>
          </>
        )}
      </p>
      {front}
      {shown ? (
        <>
          <div className={g.flashBack}>
            {back}
            {notes && <p className={g.flashNote}>{notes}</p>}
          </div>
          <div className={g.grades} role="group" aria-label="Насколько легко вспомнилось?">
            {GRADES.map((gr) => {
              const days = review(srs ?? newCard(), gr.grade).interval
              return (
                <button
                  key={gr.grade}
                  type="button"
                  className={`btn ${gr.cls ?? ''}`}
                  onClick={() => onGrade(gr.grade)}
                  autoFocus={gr.grade === 'good'}
                >
                  {gr.label}
                  <small>
                    {intervalText(days)} · {gr.key}
                  </small>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div>
          <button ref={showBtn} type="button" className="btn btn-primary" onClick={() => setShown(true)}>
            Показать ответ
          </button>
        </div>
      )}
    </section>
  )
}

export default function Cards() {
  const lessons = useApp((st) => st.lessons)
  const mistakes = useApp((st) => st.mistakes)
  const srsAll = useApp((st) => st.srs)
  const reviewCard = useApp((st) => st.reviewCard)
  const gender = useGender()
  const script = useScript()
  const gtext = useG()
  const sr = useSr()
  const [mode, setMode] = useState<DirMode>(() => {
    const v = safeStorage.getItem(DIR_KEY)
    return v === 'sr-ru' || v === 'ru-sr' || v === 'both' ? v : 'both'
  })
  const [newSeen, setNewSeen] = useState(0)
  const [lastId, setLastId] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Карточки слов — Српски дневник'
    return () => {
      document.title = 'Српски дневник'
    }
  }, [])

  const allCards = useMemo(
    () => buildDeck({ vocab: VOCAB, lessons, mistakes, exercises: EXERCISES, gender }),
    [lessons, mistakes, gender],
  )
  const deck = useMemo(() => (mode === 'both' ? allCards : allCards.filter((c) => c.dir === mode)), [allCards, mode])
  const stats = deckStats(deck, srsAll)
  const queue = dueQueue(deck, srsAll, new Date(), Math.max(0, NEW_PER_SESSION - newSeen))
  // Не показывать одну и ту же карточку два раза подряд, если есть другие
  const current = queue.find((c) => c.id !== lastId) ?? queue[0]

  const grade = (gr: Grade) => {
    if (!current) return
    if (!srsAll[current.id]) setNewSeen((n) => n + 1)
    setLastId(current.id)
    reviewCard(current.id, gr)
  }

  const changeMode = (m: DirMode) => {
    setMode(m)
    safeStorage.setItem(DIR_KEY, m)
  }

  const words = useMemo(() => allCards.filter((c, i, a) => a.findIndex((x) => x.base === c.base) === i), [allCards])

  return (
    <div className={g.page}>
      <h1>Карточки слов</h1>
      <p className={g.intro}>
        Слова попадают в колоду, когда занятие отмечено выполненным, а ещё — из тетради ошибок. Повторение по алгоритму
        SM-2: чем легче вспомнилось, тем позже карточка вернётся.
      </p>

      <ul className={g.stats}>
        <li>
          <strong>{stats.due}</strong>
          <small>к повтору</small>
        </li>
        <li>
          <strong>{stats.fresh}</strong>
          <small>новых</small>
        </li>
        <li>
          <strong>{stats.learned}</strong>
          <small>выучено</small>
        </li>
        <li>
          <strong>{stats.total}</strong>
          <small>всего</small>
        </li>
      </ul>

      <fieldset className={g.dirs}>
        <legend>Направление</legend>
        {(['both', 'sr-ru', 'ru-sr'] as DirMode[]).map((m) => (
          <label key={m}>
            <input type="radio" name="dir" checked={mode === m} onChange={() => changeMode(m)} />
            {DIR_LABEL[m]}
          </label>
        ))}
      </fieldset>

      {current ? (
        <Flashcard key={current.id} card={current} onGrade={grade} />
      ) : (
        <section className={`${g.sheet} ${g.empty}`}>
          {deck.length === 0 ? (
            <p>
              Колода пока пуста. Отметь занятие выполненным (кнопка внизу занятия) — и его слова появятся здесь.{' '}
              <Link to="/">К курсу</Link>
            </p>
          ) : (
            <p>
              {gtext('На сегодня всё — ты повторила', 'На сегодня всё — ты повторил')} карточки, которым пора.{' '}
              {stats.fresh > 0 && newSeen >= NEW_PER_SESSION && (
                <button type="button" className="btn" onClick={() => setNewSeen(0)}>
                  Ещё {Math.min(NEW_PER_SESSION, stats.fresh)} новых
                </button>
              )}
            </p>
          )}
        </section>
      )}
      <p className={`${g.muted} ${g.small}`}>
        Клавиатура: Пробел или Enter — показать ответ, 1–4 — оценка. За выученную карточку (два верных повтора подряд) — опыт
        «Лексики».
      </p>

      <section className={g.sheet} aria-labelledby="anki-title">
        <h2 id="anki-title">Экспорт в Anki</h2>
        <p className={g.small}>
          Файл CSV (UTF-8, разделитель «;»): сербское слово — {script === 'cyr' ? 'кириллицей' : 'латиницей'} и в{' '}
          {gender === 'f' ? 'женской' : 'мужской'} форме, как сейчас в учебнике; перевод с пометками (род, ложный друг);
          метки недели и занятия. В Anki: «Файл → Импорт», выбрать файл — разделитель, колода и поля подставятся сами. Чтобы
          учить в обе стороны, выбери тип записи «Basic (and reversed card)».
        </p>
        <div className={g.row}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!words.length}
            onClick={() => download('srpski-dnevnik-anki.csv', ankiCsv(allCards, script, gender))}
          >
            <Icon name="download" size={18} /> Скачать CSV ({words.length} {plural(words.length, 'слово', 'слова', 'слов')})
          </button>
        </div>
        {words.length > 0 && (
          <details>
            <summary>Слова в колоде</summary>
            <ul className={g.wordList}>
              {words.map((c) => (
                <li key={c.base}>
                  <span lang="sr">{sr(pickGender(c.sr, gender))}</span> — {c.ru}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  )
}
