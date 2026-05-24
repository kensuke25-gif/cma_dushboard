declare module 'katex/contrib/auto-render' {
  interface RenderMathInElementOptions {
    delimiters?: { left: string; right: string; display: boolean }[]
    throwOnError?: boolean
  }
  export default function renderMathInElement(
    elem: HTMLElement,
    options?: RenderMathInElementOptions,
  ): void
}
