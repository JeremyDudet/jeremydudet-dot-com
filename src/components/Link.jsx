import { Link as RouterLink } from 'react-router-dom'

export function Link({ href, to, ...props }) {
  const destination = href || to

  if (destination?.startsWith('#')) {
    return <a href={destination} {...props} />
  }

  if (destination?.startsWith('http')) {
    return <a href={destination} {...props} />
  }

  return <RouterLink to={destination?.replace(/^\//, '')} {...props} />
} 