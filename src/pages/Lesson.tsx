import { Suspense, useEffect, useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { MDXProvider } from '@mdx-js/react'
import s from './pages.module.css'
import { layoutStyles as ls } from '../components/layout/Layout'
import { mdxComponents } from '../components/mdx'
import { useApp } from '../store/app'
import { useG } from '../store/hooks'
import { WEEKS, lessonId, lessonLoader } from '../content/registry'
import type { Skill } from '../lib/xp'
import NotFound from './NotFound'
import { Rich } from '../components/sr/Rich'
import { lazyOnce } from '../lib/lazyOnce'
import { LessonContext } from '../components/content/LessonContext'

function LessonDone({ id, skill }: { id: string; skill?: Skill }) {
  const done = useApp((st) => st.lessons[id]?.done ?? false)
  const setLessonDone = useApp((st) => st.setLessonDone)
  const g = useG()
  return (
    <div className={`${s.doneBox} ${done ? s.doneOn : ''}`}>
      <p>{done ? g('Занятие выполнено. Ты молодчина! ✓', 'Занятие выполнено. Ты молодец! ✓') : 'Всё сделано? Отметь занятие — за него начисляется опыт.'}</p>
      <button type="button" className={done ? 'btn' : 'btn btn-primary'} onClick={() => setLessonDone(id, !done, skill)} aria-pressed={done}>
        {done ? 'Снять отметку' : '✓ Занятие выполнено'}
      </button>
    </div>
  )
}

/** Переход по ссылке «#ex-…» (из тетради ошибок): прокрутить к упражнению, когда занятие загрузилось. */
function ScrollToHash() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (!el) return
    const card = el.closest('section') ?? el
    card.scrollIntoView({ block: 'start' })
    if (card instanceof HTMLElement) {
      card.setAttribute('tabindex', '-1')
      card.focus({ preventScroll: true })
    }
  }, [hash])
  return null
}

export default function Lesson() {
  const { n: nStr = '', s: slug = '' } = useParams()
  const n = Number(nStr)
  const week = WEEKS[n]
  const idx = week?.lessons.findIndex((l) => l.slug === slug) ?? -1
  const meta = idx >= 0 ? week.lessons[idx] : undefined
  const loader = lessonLoader(n, slug)
  const Content = loader ? lazyOnce(loader) : null
  const setLastVisited = useApp((st) => st.setLastVisited)
  const { pathname } = useLocation()
  const lessonCtx = useMemo(() => (meta ? { id: lessonId(n, slug), kind: meta.kind } : null), [meta, n, slug])

  useEffect(() => {
    if (meta) setLastVisited(pathname)
  }, [meta, pathname, setLastVisited])

  useEffect(() => {
    if (meta) document.title = `${meta.code}. ${meta.title} — неделя ${n}`
    return () => {
      document.title = 'Српски дневник'
    }
  }, [meta, n])

  if (!week || !meta || !Content) return <NotFound />
  const prev = week.lessons[idx - 1]
  const next = week.lessons[idx + 1]
  const id = lessonId(n, slug)

  return (
    <article className={s.lesson}>
      <header className={s.lessonHead}>
        <p className={s.crumbs}>
          <Link to="/">Курс</Link> / <Link to={`/week/${n}`}>Неделя {n}</Link> / {meta.code}
        </p>
        <h1>
          {meta.code}. {meta.title}
        </h1>
        <p className={s.lessonSummary}>
          <Rich text={meta.summary} /> · ⏱ {meta.minutes} мин{meta.optional ? ' · по желанию' : ''}
        </p>
      </header>

      <LessonContext.Provider value={lessonCtx}>
        <MDXProvider components={mdxComponents}>
          <Suspense fallback={<p>Загружаю занятие…</p>}>
            <Content />
            <ScrollToHash />
          </Suspense>
        </MDXProvider>
      </LessonContext.Provider>

      <LessonDone id={id} skill={meta.skill} />

      <nav className={ls.pager} aria-label="Соседние занятия">
        {prev ? (
          <Link to={`/week/${n}/lesson/${prev.slug}`} className={ls.pagerLink}>
            <small>← Назад</small>
            {prev.code}. {prev.title}
          </Link>
        ) : (
          <Link to={`/week/${n}`} className={ls.pagerLink}>
            <small>← К неделе</small>
            Неделя {n}
          </Link>
        )}
        {next ? (
          <Link to={`/week/${n}/lesson/${next.slug}`} className={`${ls.pagerLink} ${ls.pagerNext}`}>
            <small>Дальше →</small>
            {next.code}. {next.title}
          </Link>
        ) : WEEKS[n + 1] ? (
          <Link to={`/week/${n + 1}`} className={`${ls.pagerLink} ${ls.pagerNext}`}>
            <small>Дальше →</small>
            Неделя {n + 1}
          </Link>
        ) : (
          <Link to={`/week/${n}`} className={`${ls.pagerLink} ${ls.pagerNext}`}>
            <small>Готово →</small>
            Обзор недели {n}
          </Link>
        )}
      </nav>
    </article>
  )
}
