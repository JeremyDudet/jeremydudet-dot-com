import { Link as RouterLink } from 'react-router-dom'

export function Link({ href, ...props }) {
  if (href.startsWith('#')) {
    return <a href={href} {...props} />
  }
  return <RouterLink to={href.replace(/^\//, '')} {...props} />
} 