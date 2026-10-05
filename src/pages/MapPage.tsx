import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import g from './game.module.css'
import { useApp } from '../store/app'
import { useSr } from '../store/hooks'
import { PLACES, type Place } from '../content/places'
import { WEEKS, requiredLessons } from '../content/registry'
import { COURSE } from '../content/course'
import { isPlaceOpen, unlockHint } from '../lib/places'
import { KOSOVO, KOSOVO_LINE, MAP_H, MAP_W, OUTLINE, RIVERS, project } from '../lib/serbia-outline'
import { Rich } from '../components/sr/Rich'
import { Sr } from '../components/sr/Sr'

/** Подпись на карте: справа от булавки, кроме мест, где рядом есть другие. */
const LABEL_POS: Record<string, 'left' | 'top' | 'bottom'> = {
  beograd: 'left',
  djerdap: 'top',
  'lepenski-vir': 'bottom',
  viminacium: 'top',
  kopaonik: 'bottom',
}
const LABEL_XY = {
  right: { x: 22, y: 8, anchor: 'start' },
  left: { x: -22, y: 8, anchor: 'end' },
  top: { x: 0, y: -24, anchor: 'middle' },
  bottom: { x: 0, y: 40, anchor: 'middle' },
} as const

function lessonLink(p: Place): { to: string; text: string } | null {
  const { week, slug } = p.link
  const meta = WEEKS[week]
  if (!meta) return null
  const lesson = slug ? meta.lessons.find((l) => l.slug === slug) : undefined
  if (lesson) return { to: `/week/${week}/lesson/${slug}`, text: `Неделя ${week}, ${lesson.code}. ${lesson.title}` }
  return { to: `/week/${week}`, text: `Неделя ${week}. ${meta.title}` }
}

function PlaceCard({ place, open }: { place: Place; open: boolean }) {
  const link = lessonLink(place)
  const weekTitle = COURSE.find((w) => w.n === place.link.week)?.title
  return (
    <section className={`${g.sheet} ${g.placeCard}`} aria-labelledby="place-title">
      {open ? <span className={g.stampOpen}>открыто</span> : <span className={g.stampLocked}>закрыто</span>}
      <h2 id="place-title">
        {open ? <Sr>{place.sr}</Sr> : '???'}
      </h2>
      {open ? (
        <>
          <p className={g.tagline}>
            {place.ru}. {place.tagline}
          </p>
          {place.facts.map((f, i) => (
            <p key={i}>
              <Rich text={f} />
            </p>
          ))}
          <p>
            {link ? (
              <Link to={link.to}>
                <Rich text={link.text} /> →
              </Link>
            ) : (
              <span className={g.muted}>
                Связанный урок: неделя {place.link.week}
                {weekTitle ? ` «${weekTitle}»` : ''} — скоро
              </span>
            )}
          </p>
        </>
      ) : (
        <p className={g.tagline}>{unlockHint(place)}. Пока на карте только вопросительный знак — пройди занятия, и здесь появится справка.</p>
      )}
    </section>
  )
}

export default function MapPage() {
  const lessons = useApp((st) => st.lessons)
  const sr = useSr()
  const opened = useMemo(() => new Set(PLACES.filter((p) => isPlaceOpen(p, lessons, requiredLessons)).map((p) => p.id)), [lessons])
  const [selected, setSelected] = useState<string>(() => PLACES.find((p) => opened.has(p.id))?.id ?? PLACES[0].id)
  const place = PLACES.find((p) => p.id === selected) ?? PLACES[0]

  useEffect(() => {
    document.title = 'Карта Сербии — Српски дневник'
    return () => {
      document.title = 'Српски дневник'
    }
  }, [])

  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSelected(id)
    }
  }

  return (
    <div className={g.page}>
      <h1>Карта путешествия</h1>
      <p className={g.intro}>
        Места открываются по мере прохождения курса: открыто {opened.size} из {PLACES.length}. Нажми на булавку или на
        название в списке.
      </p>
      <div className={g.mapLayout}>
        <figure className={g.mapFigure}>
          <svg className={g.map} viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="group" aria-label="Карта Сербии с местами курса">
            <path className={g.land} d={OUTLINE} />
            <path className={g.kosovo} d={KOSOVO} />
            <path className={g.kosovoLine} d={KOSOVO_LINE} />
            {RIVERS.map((r) => (
              <path key={r.name} className={g.river} d={r.d}>
                <title>{sr(r.name)}</title>
              </path>
            ))}
            {PLACES.map((p) => {
              const { x, y } = project(p.lon, p.lat)
              const isOpen = opened.has(p.id)
              const pos = LABEL_XY[LABEL_POS[p.id] ?? 'right']
              return (
                <g
                  key={p.id}
                  className={`${g.pin} ${isOpen ? '' : g.locked} ${p.id === selected ? g.selected : ''}`}
                  transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={p.id === selected}
                  aria-label={isOpen ? sr(p.sr) : `Закрытое место. ${unlockHint(p)}`}
                  onClick={() => setSelected(p.id)}
                  onKeyDown={(e) => onKey(e, p.id)}
                >
                  <circle r={16} />
                  <text className={g.pinMark} aria-hidden="true">
                    {isOpen ? '★' : '?'}
                  </text>
                  {isOpen && (
                    <text
                      className={g.pinLabel}
                      x={pos.x}
                      y={pos.y}
                      textAnchor={pos.anchor}
                      lang="sr"
                      aria-hidden="true"
                    >
                      {sr(p.sr)}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
          <figcaption className={g.mapCaption}>
            Контур и реки — упрощённые данные{' '}
            <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">
              Natural Earth
            </a>{' '}
            (1:10m, общественное достояние). Косово показано светлее и отделено штриховой линией. Координаты мест
            примерные.
          </figcaption>
          <ul className={g.placeList} aria-label="Места">
            {PLACES.map((p) => {
              const isOpen = opened.has(p.id)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`${g.placeBtn} ${isOpen ? '' : g.lockedBtn}`}
                    aria-pressed={p.id === selected}
                    onClick={() => setSelected(p.id)}
                  >
                    {isOpen ? (
                      <span lang="sr">{sr(p.sr)}</span>
                    ) : (
                      <>
                        ? <span className="visually-hidden">закрытое место,</span> неделя {p.link.week}
                      </>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </figure>
        <PlaceCard place={place} open={opened.has(place.id)} />
      </div>
    </div>
  )
}
