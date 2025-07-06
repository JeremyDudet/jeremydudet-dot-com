import React from 'react'
import clsx from 'clsx'

export function Text({ className, ...props }: any) {
  return (
    <p
      data-slot="text"
      {...props}
      className={clsx(className, 'text-base/6 text-zinc-700 sm:text-sm/6 dark:text-zinc-300')}
    />
  )
}
