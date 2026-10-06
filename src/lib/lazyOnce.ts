import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

type Loader = () => Promise<{ default: ComponentType }>

const cache = new WeakMap<Loader, LazyExoticComponent<ComponentType>>()

/**
 * Один `lazy()` на загрузчик на всё время работы приложения.
 * Нельзя создавать `lazy()` в `useMemo`: переход между страницами идёт в transition,
 * при приостановке React отбрасывает незавершённый рендер вместе с новым useMemo,
 * следующая попытка создаёт новый lazy с новым обещанием — и переход зависает навсегда
 * (так не работала кнопка «Дальше» между занятиями).
 */
export function lazyOnce(loader: Loader): LazyExoticComponent<ComponentType> {
  let c = cache.get(loader)
  if (!c) {
    c = lazy(loader)
    cache.set(loader, c)
  }
  return c
}
