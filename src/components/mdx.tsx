// Компоненты, доступные в MDX без импорта, и переопределения Markdown-тегов.
import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import type { MDXComponents } from 'mdx/types'
import { Sr, G } from './sr/Sr'
import { Audio, Video, Callout, MiniLesson, Trap, Culture, Tip, Dialogue, ChatBlock, Ext, Ru, Source } from './content/Content'
import { Vocab } from './content/Vocab'
import { RepeatAfter } from './content/RepeatAfter'
import { AlphabetTable, NewLetters } from './content/Alphabet'
import { Exercise } from './exercises/Exercise'

function A({ href = '', children, ...rest }: ComponentProps<'a'>) {
  if (href.startsWith('/')) return <Link to={href}>{children}</Link>
  if (/^https?:/.test(href)) return <Ext href={href}>{children}</Ext>
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}

export const mdxComponents: MDXComponents = {
  // `обратные кавычки` в уроках = сербский текст (кириллицей), с учётом переключателя алфавита
  code: ({ children }) => <Sr>{children}</Sr>,
  a: A,
  table: (p) => (
    <div className="table-wrap">
      <table {...p} />
    </div>
  ),
  Sr,
  G,
  Audio,
  Video,
  Callout,
  MiniLesson,
  Trap,
  Culture,
  Tip,
  Dialogue,
  ChatBlock,
  Ext,
  Ru,
  Source,
  RepeatAfter,
  Vocab,
  AlphabetTable,
  NewLetters,
  Exercise,
}
