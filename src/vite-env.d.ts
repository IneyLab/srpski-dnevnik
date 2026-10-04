/// <reference types="vite/client" />

declare module '*.mdx' {
  import type { ComponentType } from 'react'
  export const meta: Record<string, unknown>
  const MDXComponent: ComponentType
  export default MDXComponent
}
