import { Link } from 'react-router-dom'
import s from './pages.module.css'
import { useApp } from '../store/app'
import { COURSE, MONTHS } from '../content/course'
import { WEEKS, courseProgress, lessonId, nextLessonPath, weekProgress, type WeekStatus } from '../content/registry'
import { Sr } from '../components/sr/Sr'
import { Icon } from '../components/Icon'
import { Rich } from '../components/sr/Rich'
import g from './game.module.css'
import { useG, useGender } from '../store/hooks'
import { levelFromXp, totalXp } from '../lib/xp'
import { PLACES } from '../content/places'
import { isPlaceOpen } from '../lib/places'
import { EXERCISES, VOCAB, requiredLessons } from '../content/registry'
import { buildDeck, deckStats } from '../lib/deck'
import { plural } from '../lib/plural'

const STAMP: Record<WeekStatus, string> = { soon: 'скоро', todo: 'не начата', active: 'в процессе', done: 'пройдена' }

export function Stamp({ status }: { status: WeekStatus }) {
  return <span className={`${s.stamp} ${s[`stamp-${status}`]}`}>{STAMP[status]}</span>
}

/** Плитки игровых инструментов: персонаж, карта, карточки, ошибки. */
function GameTiles() {
  const lessons = useApp((st) => st.lessons)
  const ledger = useApp((st) => st.xpLedger)
  const mistakes = useApp((st) => st.mistakes)
  const srs = useApp((st) => st.srs)
  const gender = useGender()
  const g2 = useG()
  const level = levelFromXp(totalXp(ledger)).level
  const opened = PLACES.filter((p) => isPlaceOpen(p, lessons, requiredLessons)).length
  const deck = buildDeck({ vocab: VOCAB, lessons, mistakes, exercises: EXERCISES, gender })
  const due = deckStats(deck, srs)
  const toReview = due.due + Math.min(due.fresh, 10)
  const openMistakes = Object.values(mistakes).filter((m) => !m.resolved).length
  return (
    <ul className={g.tiles}>
      <li>
        <Link to="/character" className={g.tile}>
          <span className={g.tileIcon} aria-hidden="true">🧭</span>
          <strong>Лист персонажа</strong>
          <small>
            {g2('Путешественница', 'Путешественник')}, уровень {level}
          </small>
        </Link>
      </li>
      <li>
        <Link to="/map" className={g.tile}>
          <span className={g.tileIcon} aria-hidden="true">🗺️</span>
          <strong>Карта Сербии</strong>
          <small>
            открыто {opened} из {PLACES.length} мест
          </small>
        </Link>
      </li>
      <li>
        <Link to="/cards" className={g.tile}>
          <span className={g.tileIcon} aria-hidden="true">🗂️</span>
          <strong>Карточки слов</strong>
          <small>{deck.length ? `сегодня ${toReview} ${plural(toReview, 'карточка', 'карточки', 'карточек')}` : 'колода пока пуста'}</small>
        </Link>
      </li>
      <li>
        <Link to="/mistakes" className={g.tile}>
          <span className={g.tileIcon} aria-hidden="true">📓</span>
          <strong>Тетрадь ошибок</strong>
          <small>{openMistakes ? `${openMistakes} ${plural(openMistakes, 'открытая', 'открытые', 'открытых')}` : 'ошибок нет'}</small>
        </Link>
      </li>
    </ul>
  )
}

export default function Home() {
  const lessons = useApp((st) => st.lessons)
  const lastVisited = useApp((st) => st.lastVisited)
  const g = useG()
  const percent = courseProgress(lessons)
  const next = nextLessonPath(lessons)
  // Последнее открытое занятие, если оно ещё не выполнено, иначе первое невыполненное
  const m = lastVisited?.path.match(/^\/week\/(\d+)\/lesson\/(\w+)$/)
  const lastOpen = m && !lessons[lessonId(Number(m[1]), m[2])]?.done ? lastVisited!.path : null
  const continuePath = lastOpen ?? next
  const started = Object.values(lessons).some((l) => l.done) || Boolean(lastVisited)

  return (
    <>
      <section className={s.hero}>
        <p className={s.kicker}>Сербский с нуля · 13 недель</p>
        <h1>
          <Sr>Здраво, Србијо!</Sr> Учебник сербского для русскоязычных
        </h1>
        <p className={s.lead}>
          За три месяца — от алфавита до уровня A1 уверенно с выходом на A2: читать и писать на обоих алфавитах, поговорить
          5 минут с носителем о себе и своих интересах, справиться в кафе, магазине и транспорте, понимать медленную речь.
        </p>
      </section>

      <div className={s.progressCard}>
        <div className={s.progressInfo}>
          <strong>Пройдено {percent}% курса</strong>
          <div className={s.bar} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Прогресс курса">
            <div className={s.barFill} style={{ width: `${percent}%` }} />
          </div>
        </div>
        {continuePath && (
          <Link to={continuePath} className="btn btn-primary">
            {started ? g('Продолжить с места, где остановилась', 'Продолжить с места, где остановился') : 'Начать с первого занятия'}
            <Icon name="right" size={18} />
          </Link>
        )}
      </div>

      <h2>Дневник путешественника</h2>
      <GameTiles />

      <h2>Как пользоваться учебником</h2>
      <ul className={s.howto}>
        <li>
          <strong>Одно занятие в день</strong>
          30–60 минут, 5–6 дней в неделю. Каждая неделя: С1–С6 и чек-ин.
        </li>
        <li>
          <strong>Сначала задача</strong>
          Неделя ведёт к реальной задаче: представиться, объяснить правила игры, найти дорогу. Грамматика — инструмент.
        </li>
        <li>
          <strong>💬 Вернись к преподавателю</strong>
          Синие, фиолетовые и зелёные блоки: отчёт, практика с ИИ-чатом, практика с людьми. Шаблоны копируются кнопкой.
        </li>
        <li>
          <strong>Ћ / Ć вверху</strong>
          Переключает весь сербский текст между кириллицей и латиницей. Прогресс хранится в браузере, перенос — в настройках.
        </li>
      </ul>

      <h2>Оглавление</h2>
      {MONTHS.map((m) => (
        <section key={m.n} className={s.month} aria-labelledby={`month-${m.n}`}>
          <h3 className={s.monthTitle} id={`month-${m.n}`}>
            Месяц {m.n}. «<Sr>{m.title}</Sr>»
          </h3>
          <p className={s.monthSub}>{m.subtitle}</p>
          <ol className={s.route}>
            {COURSE.filter((w) => w.month === m.n).map((w) => {
              const p = weekProgress(w.n, lessons)
              const available = Boolean(WEEKS[w.n])
              const stopCls = p.status === 'done' ? s.stopDone : p.status === 'active' ? s.stopActive : ''
              const inner = (
                <>
                  <span className={s.weekNum}>
                    <small>неделя</small>
                    {w.n}
                  </span>
                  <span className={s.weekBody}>
                    <p className={s.weekTitle}>{w.title}</p>
                    <p className={s.weekTopics}>
                      <Rich text={w.topics} />
                      {available && ` · ${p.done}/${p.total}`}
                    </p>
                  </span>
                  <Stamp status={p.status} />
                </>
              )
              return (
                <li key={w.n} className={`${s.stop} ${stopCls}`}>
                  {available ? (
                    <Link to={`/week/${w.n}`} className={s.weekCard}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={`${s.weekCard} ${s.weekSoon}`}>{inner}</div>
                  )}
                  {w.checkpoint && (
                    <Link to={`/checkpoint/${w.checkpoint}`} className={s.checkpointCard} style={{ marginTop: 8 }}>
                      <span className={s.weekNum} aria-hidden="true">
                        📊
                      </span>
                      <span className={s.weekBody}>
                        <p className={s.weekTitle}>
                          {w.checkpoint === 3 ? 'Итоговая оценка' : `Контрольная точка ${w.checkpoint}`}
                        </p>
                        <p className={s.weekTopics}>4 навыка + чек-лист «Я могу…» по CEFR</p>
                      </span>
                    </Link>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </>
  )
}
