import { lazy, Suspense, useMemo, type ComponentType } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MDXProvider } from '@mdx-js/react'
import s from './pages.module.css'
import { mdxComponents } from '../components/mdx'
import { COURSE } from '../content/course'
import NotFound from './NotFound'

type Loader = () => Promise<{ default: ComponentType; title?: string; order?: number; summary?: string }>

// Шпаргалки маленькие: грузим сразу, чтобы список строился из их meta
const cheatsheetModules = import.meta.glob<{ default: ComponentType; meta: { title: string; order: number; summary: string } }>(
  '../content/cheatsheets/*.mdx',
  { eager: true },
)
const cheatsheetLoaders: Record<string, Loader> = Object.fromEntries(
  Object.entries(cheatsheetModules).map(([path, mod]) => [path, () => Promise.resolve(mod)]),
)
const cheatsheetMeta = Object.fromEntries(Object.entries(cheatsheetModules).map(([path, mod]) => [path, mod.meta]))
const checkpointLoaders = import.meta.glob('../content/checkpoints/*.mdx') as Record<string, Loader>
const pageLoaders = import.meta.glob('../content/pages/*.mdx') as Record<string, Loader>

const slugOf = (path: string) => path.split('/').pop()!.replace('.mdx', '')

function MdxContent({ loader }: { loader: Loader }) {
  const Content = useMemo(() => lazy(loader), [loader])
  return (
    <MDXProvider components={mdxComponents}>
      <Suspense fallback={<p>Загружаю…</p>}>
        <Content />
      </Suspense>
    </MDXProvider>
  )
}

export function Resources() {
  const loader = pageLoaders['../content/pages/resources.mdx']
  return loader ? <MdxContent loader={loader} /> : <NotFound />
}

export function Cheatsheets() {
  const { slug } = useParams()
  const list = Object.entries(cheatsheetMeta)
    .map(([path, meta]) => ({ slug: slugOf(path), ...meta }))
    .sort((a, b) => a.order - b.order)

  if (slug) {
    const loader = cheatsheetLoaders[`../content/cheatsheets/${slug}.mdx`]
    if (!loader) return <NotFound />
    return (
      <>
        <p className={s.crumbs}>
          <Link to="/cheatsheets">Шпаргалки</Link> / {list.find((x) => x.slug === slug)?.title}
        </p>
        <MdxContent loader={loader} />
      </>
    )
  }
  return (
    <>
      <h1>Шпаргалки</h1>
      <p className={s.lead}>Короткие опоры, к которым удобно возвращаться. Пополняются по ходу курса.</p>
      <ul className={s.lessonList}>
        {list.map((x) => (
          <li key={x.slug}>
            <Link to={`/cheatsheets/${x.slug}`} className={s.lessonCard}>
              <span style={{ flex: 1 }}>
                <strong>{x.title}</strong>
                <br />
                <span className={s.lessonMeta}>{x.summary}</span>
              </span>
              →
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

export function Checkpoint() {
  const n = Number(useParams().n)
  const week = COURSE.find((w) => w.checkpoint === n)
  if (!week) return <NotFound />
  const loader = checkpointLoaders[`../content/checkpoints/${n}.mdx`]
  if (loader) return <MdxContent loader={loader} />
  return (
    <>
      <p className={s.crumbs}>
        <Link to="/">Курс</Link> / {n === 3 ? 'Итоговая оценка' : `Контрольная точка ${n}`}
      </p>
      <h1>{n === 3 ? 'Итоговая оценка' : `Контрольная точка ${n}`}</h1>
      <p className={s.lead}>Откроется на неделе {week.n}. Около 60 минут.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Навык</th>
              <th>Как проверяем</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Говорение</td>
              <td>Голосовая запись на 1–3 минуты (расшифровку — преподавателю) или устная ролевая игра</td>
            </tr>
            <tr>
              <td>Письмо</td>
              <td>Текст на заданную тему</td>
            </tr>
            <tr>
              <td>Чтение</td>
              <td>Короткий текст и вопросы</td>
            </tr>
            <tr>
              <td>Аудирование</td>
              <td>Отрывок из Easy Serbian или подкаста и вопросы</td>
            </tr>
            <tr>
              <td>Лексика и грамматика</td>
              <td>Мини-тест на 15–20 заданий с автопроверкой</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Каждый навык оценивается по шкале 1–5, плюс чек-лист «Я могу…» по уровню CEFR и шаблон отчёта для преподавателя.</p>
    </>
  )
}
