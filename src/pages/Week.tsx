import { Link, useParams } from 'react-router-dom'
import s from './pages.module.css'
import { useApp } from '../store/app'
import { COURSE } from '../content/course'
import { WEEKS, lessonId, weekProgress } from '../content/registry'
import { Vocab } from '../components/content/Vocab'
import { Icon } from '../components/Icon'
import { Stamp } from './Home'
import { Rich } from '../components/sr/Rich'
import NotFound from './NotFound'

export default function Week() {
  const n = Number(useParams().n)
  const week = WEEKS[n]
  const lessons = useApp((st) => st.lessons)
  const outline = COURSE.find((w) => w.n === n)
  if (!outline) return <NotFound />
  if (!week) {
    return (
      <>
        <p className={s.crumbs}>
          <Link to="/">Курс</Link> / Неделя {n}
        </p>
        <h1>
          Неделя {n}. {outline.title}
        </h1>
        <p className={s.lead}>
          <Rich text={outline.topics} />
        </p>
        <p>Эта неделя появится за несколько дней до начала. Пока можно повторить пройденное и поработать с карточками слов.</p>
      </>
    )
  }
  const p = weekProgress(n, lessons)
  const prev = WEEKS[n - 1]
  const next = WEEKS[n + 1]
  const nextOutline = COURSE.find((w) => w.n === n + 1)

  return (
    <>
      <p className={s.crumbs}>
        <Link to="/">Курс</Link> / Неделя {n}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ marginBottom: 0 }}>
          Неделя {n}. {week.title}
        </h1>
        <Stamp status={p.status} />
      </div>
      <p className={s.lead}>
        Выполнено {p.done} из {p.total} обязательных занятий.
      </p>

      <section className={s.goals}>
        <h2>К концу недели я могу…</h2>
        <ul>
          {week.goals.map((g) => (
            <li key={g}>
              <Rich text={g} />
            </li>
          ))}
        </ul>
      </section>

      <div className={s.facts}>
        <div className={s.fact}>
          <h3>🎯 Задача недели</h3>
          <p style={{ margin: 0 }}>
            <Rich text={week.task} />
          </p>
        </div>
        <div className={s.fact}>
          <h3>🧩 Грамматика</h3>
          <ul>
            {week.grammar.map((x) => (
              <li key={x}>
                <Rich text={x} />
              </li>
            ))}
          </ul>
        </div>
        <div className={s.fact}>
          <h3>📚 Лексика</h3>
          <ul>
            {week.vocab.map((x) => (
              <li key={x}>
                <Rich text={x} />
              </li>
            ))}
          </ul>
        </div>
        <div className={s.fact}>
          <h3>🏛️ Культура</h3>
          <ul>
            {week.culture.map((x) => (
              <li key={x}>
                <Rich text={x} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2>Занятия</h2>
      <ol className={s.lessonList}>
        {week.lessons.map((l) => {
          const done = lessons[lessonId(n, l.slug)]?.done
          return (
            <li key={l.slug}>
              <Link to={`/week/${n}/lesson/${l.slug}`} className={s.lessonCard}>
                <span className={s.lessonCode}>{l.code}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{l.title}</strong>
                  <br />
                  <span className={s.lessonMeta}>
                    <Rich text={l.summary} /> · {l.minutes} мин{l.optional ? ' · по желанию' : ''}
                  </span>
                </span>
                <span className={`${s.check} ${done ? s.checkOn : ''}`} aria-label={done ? 'выполнено' : 'не выполнено'}>
                  <Icon name="check" size={16} />
                </span>
              </Link>
            </li>
          )
        })}
      </ol>

      <h2>Словарик недели</h2>
      <p className={s.lessonMeta}>Ложные друзья отмечены: похожи на русские слова, но значат другое.</p>
      <Vocab week={n} />

      <nav aria-label="Соседние недели" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: '2.5em' }}>
        {prev ? (
          <Link to={`/week/${n - 1}`} className={s.lessonCard}>
            ← Неделя {n - 1}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/week/${n + 1}`} className={s.lessonCard} style={{ justifyContent: 'flex-end' }}>
            Неделя {n + 1} →
          </Link>
        ) : nextOutline ? (
          <span className={s.lessonMeta} style={{ textAlign: 'right', alignSelf: 'center' }}>
            Неделя {n + 1} скоро
          </span>
        ) : null}
      </nav>
    </>
  )
}
