import { useRef, useState, type ReactNode } from 'react'
import s from './content.module.css'
import { Sr, SrText } from '../sr/Sr'
import { Icon } from '../Icon'
import { useSr, useG, useScript } from '../../store/hooks'
import type { Gendered } from '../../content/types'
import { copyText } from '../../lib/clipboard'
import { SOURCES, isSourceId } from '../../content/sources'

export const audioUrl = (name: string) => `/audio/go-serbia/${name}.mp3`

/**
 * Подпись источника внизу задания: мелко, серым, «(c) Go-Serbia» со ссылкой на урок.
 * <Source id="goSerbia1" /> — источник из content/sources.ts; <Source name="…" href="…" /> — разовый;
 * voice — источник озвучки: «(c) Go-Serbia · озвучка: Google Переводчик».
 */
export function Source({ id, name, href, voice }: { id?: string; name?: string; href?: string; voice?: string }) {
  const ref = id && isSourceId(id) ? SOURCES[id] : name && href ? { name, url: href } : null
  const v = voice && isSourceId(voice) ? SOURCES[voice] : null
  if (!ref && !v) return null
  const link = (r: { name: string; url: string }) => (
    <a href={r.url} target="_blank" rel="noopener noreferrer">
      {r.name}
    </a>
  )
  return (
    <p className={s.source}>
      (c) {ref && link(ref)}
      {ref && v && ' · '}
      {v && <>озвучка: {link(v)}</>}
    </p>
  )
}

/** Аудио из public/audio/go-serbia. Грузится только при нажатии (preload="none"), есть замедление для «тени». */
export function Audio({
  src,
  title,
  note,
  words,
  source,
}: {
  src: string
  title: string
  note?: string
  words?: string
  /** Ключ из content/sources.ts — подпись внизу. */
  source?: string
}) {
  const ref = useRef<HTMLAudioElement>(null)
  const [rate, setRate] = useState(1)
  const setSpeed = (r: number) => {
    setRate(r)
    if (ref.current) ref.current.playbackRate = r
  }
  return (
    <div className={s.audio}>
      <div className={s.audioLabel}>
        🎧 {title}
        {note && <small>{note}</small>}
        {words && (
          <small>
            <Sr>{words}</Sr>
          </small>
        )}
      </div>
      <audio ref={ref} controls preload="none" src={audioUrl(src)} onPlay={(e) => (e.currentTarget.playbackRate = rate)}>
        <a href={audioUrl(src)}>Скачать аудио</a>
      </audio>
      <div className={s.speeds} role="group" aria-label="Скорость">
        {[0.75, 1].map((r) => (
          <button key={r} type="button" className={s.speed} aria-pressed={rate === r} onClick={() => setSpeed(r)}>
            {r === 1 ? '1×' : '0.75×'}
          </button>
        ))}
      </div>
      {source && <Source id={source} />}
    </div>
  )
}

/** YouTube через youtube-nocookie. Плеер загружается только по нажатию. */
export function Video({ id, title, author, start }: { id: string; title: string; author?: string; /** С какой секунды начинать. */ start?: number }) {
  const [on, setOn] = useState(false)
  return (
    <figure className={s.video} style={{ margin: '0 0 1em' }}>
      <div className={s.videoFrame}>
        {on ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${start ? `&start=${start}` : ''}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" className={s.videoPlaceholder} onClick={() => setOn(true)} aria-label={`Включить видео: ${title}`}>
            <span className={s.videoPlay}>
              <Icon name="play" size={28} />
            </span>
            <span>{title}</span>
            <small>Видео загрузится с YouTube после нажатия</small>
          </button>
        )}
      </div>
      <figcaption className={s.videoCaption}>
        {author && <>{author} · </>}
        <a href={`https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ''}`} target="_blank" rel="noopener noreferrer">
          Открыть на YouTube ↗
        </a>
      </figcaption>
    </figure>
  )
}

type CalloutKind = 'mini' | 'trap' | 'culture' | 'tip'
const CALLOUT: Record<CalloutKind, { icon: string; label: string }> = {
  mini: { icon: '✍️', label: 'Мини-урок' },
  trap: { icon: '⚠️', label: 'Ловушка' },
  culture: { icon: '🏛️', label: 'Культура' },
  tip: { icon: '💡', label: 'Совет' },
}

export function Callout({ kind = 'tip', title, children }: { kind?: CalloutKind; title?: string; children: ReactNode }) {
  const c = CALLOUT[kind]
  return (
    <aside className={`${s.callout} ${s[kind]}`}>
      <p className={s.calloutTitle}>
        <span aria-hidden="true">{c.icon}</span>
        {title ?? c.label}
      </p>
      {children}
    </aside>
  )
}

export const MiniLesson = (p: { title?: string; children: ReactNode }) => (
  <Callout kind="mini" title={p.title ? `Мини-урок: ${p.title}` : undefined}>
    {p.children}
  </Callout>
)
export const Trap = (p: { title?: string; children: ReactNode }) => <Callout kind="trap" {...p} />
export const Culture = (p: { title?: string; children: ReactNode }) => <Callout kind="culture" {...p} />
export const Tip = (p: { title?: string; children: ReactNode }) => <Callout kind="tip" {...p} />

/** Диалог: [говорящий, сербская реплика (кириллица), перевод?] */
export function Dialogue({ lines }: { lines: [string, Gendered, string?][] }) {
  return (
    <ul className={s.dialogue}>
      {lines.map(([who, text, tr], i) => (
        <li key={i}>
          <span className={s.speaker}>
            <Sr>{who}</Sr>
          </span>
          <SrText text={text} />
          {tr && <span className={s.trans}>{tr}</span>}
        </li>
      ))}
    </ul>
  )
}

const CHAT_SKILL = {
  reading: '📖 Чтение',
  writing: '✍️ Письмо',
  listening: '👂 Аудирование',
  speaking: '🗣️ Говорение',
} as const

const CHAT = {
  report: { icon: 'report', label: 'Отчитайся преподавателю' },
  ai: { icon: 'ai', label: 'Практика с ИИ' },
  people: { icon: 'people', label: 'Практика с людьми' },
} as const

/**
 * Блок «💬 Вернись к преподавателю».
 * В шаблоне: [[женская|мужская]] — форма по роду, {{сербский текст}} — в выбранном алфавите,
 * ((если кириллица|если латиница)) — русский текст в зависимости от алфавита.
 */
export function ChatBlock({
  kind,
  title,
  template,
  skill,
  children,
}: {
  kind: keyof typeof CHAT
  title: string
  template?: string
  /** Навык упражнения с ИИ: одно упражнение — один навык — один новый чат. */
  skill?: keyof typeof CHAT_SKILL
  children?: ReactNode
}) {
  const sr = useSr()
  const g = useG()
  const script = useScript()
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const text = template
    ?.trim()
    .replace(/\[\[([^|\]]*)\|([^\]]*)\]\]/g, (_, f: string, m: string) => g(f, m))
    .replace(/\(\(([^|)]*)\|([^)]*)\)\)/g, (_, cyr: string, lat: string) => (script === 'cyr' ? cyr : lat))
    .replace(/\{\{([^}]*)\}\}/g, (_, t: string) => sr(t))
  const c = CHAT[kind]
  const copy = async () => {
    if (!text) return
    setCopied((await copyText(text)) ? 'ok' : 'fail')
    setTimeout(() => setCopied(null), 2500)
  }
  return (
    <section className={`${s.chat} ${s[kind]}`} aria-label={`${c.label}: ${title}`}>
      <div className={s.chatHead}>
        <Icon name={c.icon} size={22} />
        <div>
          <div className={s.chatKind}>
            💬 {c.label}
            {skill && <> · {CHAT_SKILL[skill]}</>}
          </div>
          <div className={s.chatTitle}>{title}</div>
        </div>
      </div>
      <div className={s.chatBody}>
        {children}
        {text && (
          <>
            <pre className={s.chatTemplate} tabIndex={0}>
              {text}
            </pre>
            <div className={s.copyRow}>
              <button type="button" className="btn btn-primary" onClick={copy}>
                <Icon name="copy" size={18} /> Скопировать
              </button>
              <span role="status" className={s.copied}>
                {copied === 'ok' ? 'Скопировано ✓' : copied === 'fail' ? 'Не получилось — выдели текст вручную' : ''}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/** Русский текст по роду ученика: <Ru f="сама" m="сам" /> */
export function Ru({ f, m }: { f: string; m: string }) {
  const g = useG()
  return <>{g(f, m)}</>
}

/** Внешняя ссылка. */
export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="visually-hidden"> (откроется в новой вкладке)</span>
    </a>
  )
}
