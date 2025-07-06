import React from 'react'
import clsx from 'clsx'

type HeadingProps = { level?: 1 | 2 | 3 | 4 | 5 | 6 } & any

export function Heading({ className, level = 1, ...props }: HeadingProps) {
  const Element = `h${level}` as any

  return (
    <Element
      {...props}
      className={clsx(className, 'text-2xl/8 font-semibold text-zinc-900 sm:text-xl/8 dark:text-zinc-100')}
    />
  )
}

export function Subheading({ className, level = 2, ...props }: HeadingProps) {
  const Element = `h${level}` as any

  return (
    <Element
      {...props}
      className={clsx(className, 'text-base/7 font-semibold text-zinc-900 sm:text-sm/6 dark:text-zinc-100')}
    />
  )
}
