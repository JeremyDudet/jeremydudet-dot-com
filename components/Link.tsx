import NextLink from 'next/link'

export function Link({
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string }) {
  if (!href) {
    return <a {...props} />
  }

  if (href.startsWith('#') || href.startsWith('http')) {
    return <a href={href} {...props} />
  }

  return <NextLink href={href} {...props} />
}
