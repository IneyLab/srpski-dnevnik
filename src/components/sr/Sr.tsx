import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { toScript, type Script } from '../../lib/translit'
import { useScript, useSr } from '../../store/hooks'
import type { Gendered } from '../../content/types'

/** Переводит строки внутри дерева в нужный алфавит. Заходит только в обычные HTML-теги. */
function convert(node: ReactNode, script: Script): ReactNode {
  if (typeof node === 'string') return toScript(node, script)
  if (Array.isArray(node)) return Children.map(node, (n) => convert(n, script))
  if (isValidElement(node) && typeof node.type === 'string') {
    const el = node as ReactElement<{ children?: ReactNode }>
    return cloneElement(el, undefined, convert(el.props.children, script))
  }
  return node
}

interface SrProps {
  children?: ReactNode
  /** Блочный вывод (абзац) вместо строчного. */
  block?: boolean
  /** Показать в конкретном алфавите независимо от настройки. */
  script?: Script
  className?: string
}

/** Сербский текст. В исходниках пишется кириллицей, показывается в выбранном алфавите. */
export function Sr({ children, block, script, className }: SrProps) {
  const current = useScript()
  const content = convert(children, script ?? current)
  return block ? (
    <p lang="sr" className={className}>
      {content}
    </p>
  ) : (
    <span lang="sr" className={className}>
      {content}
    </span>
  )
}

/** Сербская форма по роду ученика: <G f="уморна" m="уморан" /> */
export function G({ f, m }: { f: string; m: string }) {
  const sr = useSr()
  return <span lang="sr">{sr({ f, m })}</span>
}

/** Сербский текст из данных (строка или форма по роду). */
export function SrText({ text, script, className }: { text: Gendered; script?: Script; className?: string }) {
  const sr = useSr(script)
  return (
    <span lang="sr" className={className}>
      {sr(text)}
    </span>
  )
}
