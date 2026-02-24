import clsx from 'clsx'

type TextProps = {
  className?: string
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLParagraphElement>

export function Text({ className, ...props }: TextProps) {
  return (
    <p
      data-slot="text"
      {...props}
      className={clsx(
        className,
        'text-base/6 text-zinc-700 sm:text-sm/6 dark:text-zinc-300',
      )}
    />
  )
}
