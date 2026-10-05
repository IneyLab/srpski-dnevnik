import { useEffect } from 'react'
import g from './game.module.css'
import { useApp } from '../store/app'
import { useG, useGender, pickGender } from '../store/hooks'
import { levelFromXp, recentEvents, SKILL_NAMES, SKILL_STEP, SKILLS, skillLevel, skillXp, totalXp, XP } from '../lib/xp'
import { BADGES } from '../content/badges'
import { EXERCISES, WEEKS } from '../content/registry'
import { Rich } from '../components/sr/Rich'
import { Sr } from '../components/sr/Sr'

const SKILL_ICON = { speaking: '🗣️', listening: '👂', reading: '📖', writing: '✍️', vocab: '🗝️', grammar: '⚙️' } as const

function lessonName(id: string): string {
  const m = id.match(/^w(\d+)\.(?:s(\w+)|checkin)$/)
  if (!m) return id
  const meta = WEEKS[Number(m[1])]?.lessons.find((l) => l.slug === (m[2] ?? 'checkin'))
  return meta ? `${meta.code} недели ${m[1]}` : id
}

/** Человеческое описание записи журнала опыта. */
function EventText({ id }: { id: string }) {
  const gender = useGender()
  const [kind, ...rest] = id.split(':')
  const key = rest.join(':')
  if (kind === 'ex') return <>Упражнение «<Rich text={EXERCISES[key]?.title ?? key} />»</>
  if (kind === 'lesson') return <>Занятие {lessonName(key)} выполнено</>
  if (kind === 'chat') {
    const [lesson, ...title] = key.split(':')
    return <>«{title.join(':')}» ({lessonName(lesson)})</>
  }
  if (kind === 'badge') {
    const b = BADGES.find((x) => x.id === key)
    return <>Значок «{b ? pickGender(b.title, gender) : key}»</>
  }
  if (kind === 'card') {
    const word = key.match(/^v:(.*)\|/)?.[1]
    return word ? <>Карточка выучена: <Sr>{word}</Sr></> : <>Карточка выучена</>
  }
  if (kind === 'fix') return <>Ошибка разобрана</>
  return <>{id}</>
}

export default function Character() {
  const ledger = useApp((st) => st.xpLedger)
  const badges = useApp((st) => st.badges)
  const setBadge = useApp((st) => st.setBadge)
  const gtext = useG()
  const gender = useGender()
  const total = totalXp(ledger)
  const lvl = levelFromXp(total)
  const skills = skillXp(ledger)
  const events = recentEvents(ledger, 10)
  const title = gtext('Путешественница по Сербии', 'Путешественник по Сербии')

  useEffect(() => {
    document.title = 'Лист персонажа — Српски дневник'
    return () => {
      document.title = 'Српски дневник'
    }
  }, [])

  return (
    <div className={g.page}>
      <section className={g.sheet} aria-labelledby="char-title">
        <div className={g.hero}>
          <div className={g.avatar} aria-hidden="true">
            🧭
          </div>
          <div className={g.heroText}>
            <p className={g.kicker}>Лист персонажа</p>
            <h1 id="char-title">{title}</h1>
            <p className={g.levelLine}>
              <span>
                <strong>Уровень {lvl.level}</strong> · всего {total} опыта
              </span>
              <span>
                до уровня {lvl.level + 1}: {lvl.nextAt - lvl.intoLevel}
              </span>
            </p>
            <div
              className={g.bar}
              role="progressbar"
              aria-label={`Опыт до уровня ${lvl.level + 1}`}
              aria-valuemin={0}
              aria-valuemax={lvl.nextAt}
              aria-valuenow={lvl.intoLevel}
            >
              <div className={g.barFill} style={{ width: `${(lvl.intoLevel / lvl.nextAt) * 100}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className={g.sheet} aria-labelledby="skills-title">
        <h2 id="skills-title">Навыки</h2>
        <ul className={g.skills}>
          {SKILLS.map((sk) => {
            const xp = skills[sk]
            const sl = skillLevel(xp)
            return (
              <li key={sk} className={g.skill}>
                <div className={g.skillHead}>
                  <strong>
                    <span aria-hidden="true">{SKILL_ICON[sk]} </span>
                    {SKILL_NAMES[sk]}
                  </strong>
                  <span>
                    ур. {sl.level} · {xp} оп.
                  </span>
                </div>
                <div
                  className={g.bar}
                  role="progressbar"
                  aria-label={`${SKILL_NAMES[sk]}: до уровня ${sl.level + 1}`}
                  aria-valuemin={0}
                  aria-valuemax={SKILL_STEP}
                  aria-valuenow={sl.into}
                >
                  <div className={g.barFill} style={{ width: `${(sl.into / SKILL_STEP) * 100}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className={g.sheet} aria-labelledby="badges-title">
        <h2 id="badges-title">Значки за реальные дела</h2>
        <p className={`${g.muted} ${g.small}`}>
          Это то, что происходит вне учебника. {gtext('Отмечай сама', 'Отмечай сам')} — честно, когда дело сделано: +{XP.badge} опыта
          в навык значка. Неделя — когда это обычно становится по силам, но отметить можно в любой момент.
        </p>
        <ul className={g.badges}>
          {BADGES.map((b) => {
            const on = Boolean(badges[b.id])
            return (
              <li key={b.id}>
                <label className={g.badge}>
                  <input type="checkbox" checked={on} onChange={() => setBadge(b.id, !on, b.skill)} />
                  <span className={g.badgeIcon} aria-hidden="true">
                    {b.icon}
                  </span>
                  <span className={g.badgeText}>
                    <span className={g.badgeWeek}>
                      Неделя {b.week} · {SKILL_NAMES[b.skill]}
                    </span>
                    <strong>{pickGender(b.title, gender)}</strong>
                    <small>
                      <Rich text={b.task} />
                    </small>
                    {on && <small>Получен {new Date(badges[b.id].at).toLocaleDateString('ru-RU')}</small>}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <section className={g.sheet} aria-labelledby="log-title">
        <h2 id="log-title">Журнал опыта</h2>
        {events.length ? (
          <ul className={g.log}>
            {events.map((e) => (
              <li key={e.key}>
                <span>
                  <EventText id={e.key} />
                  {e.skill && <span className={g.muted}> · {SKILL_NAMES[e.skill]}</span>}
                </span>
                <span className={g.xp}>+{e.xp}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={g.muted}>Пока пусто. Пройди первое упражнение — и здесь появится запись.</p>
        )}
      </section>

      <section className={g.sheet} aria-labelledby="how-title">
        <h2 id="how-title">Откуда берётся опыт</h2>
        <div className={g.tableWrap}>
          <table className={g.table}>
            <thead>
              <tr>
                <th scope="col">Действие</th>
                <th scope="col">Навык</th>
                <th scope="col">Опыт</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Упражнение решено с первой попытки / не с первой</td>
                <td>навык упражнения</td>
                <td>
                  {XP.exerciseFirstTry} / {XP.exerciseLater}
                </td>
              </tr>
              <tr>
                <td>Занятие отмечено выполненным</td>
                <td>навык занятия</td>
                <td>{XP.lessonDone}</td>
              </tr>
              <tr>
                <td>💬 Практика с ИИ сделана</td>
                <td>навык упражнения</td>
                <td>{XP.chatAi}</td>
              </tr>
              <tr>
                <td>💬 Отчёт отправлен преподавателю (в продукте недели)</td>
                <td>Письмо</td>
                <td>
                  {XP.report} ({XP.product})
                </td>
              </tr>
              <tr>
                <td>💬 Практика с людьми</td>
                <td>Говорение</td>
                <td>{XP.people}</td>
              </tr>
              <tr>
                <td>Карточка выучена (два верных повтора подряд)</td>
                <td>Лексика</td>
                <td>{XP.cardLearned}</td>
              </tr>
              <tr>
                <td>Ошибка из тетради разобрана</td>
                <td>навык упражнения</td>
                <td>{XP.mistakeFixed}</td>
              </tr>
              <tr>
                <td>Значок за реальное дело</td>
                <td>навык значка</td>
                <td>{XP.badge}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={`${g.muted} ${g.small}`}>
          Каждое действие засчитывается один раз. Уровень персонажа: 100 опыта до второго, дальше каждый следующий на 50
          больше. Уровень навыка — каждые {SKILL_STEP} опыта.
        </p>
      </section>
    </div>
  )
}
