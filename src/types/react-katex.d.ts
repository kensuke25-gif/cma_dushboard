declare module 'react-katex' {
  import type { FC } from 'react'

  interface MathProps {
    math: string
    errorColor?: string
    renderError?: (error: Error) => React.ReactNode
  }

  export const InlineMath: FC<MathProps>
  export const BlockMath: FC<MathProps>
}
