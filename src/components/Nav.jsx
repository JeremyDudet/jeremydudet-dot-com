import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

const links = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/products', label: 'Products' },
]

export function Nav() {
  return (
    <nav className="flex items-center justify-between py-4">
      <NavLink
        to="/"
        className="text-sm font-medium text-zinc-950 dark:text-white"
      >
        Jeremy Dudet
      </NavLink>
      <div className="flex gap-6">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'text-sm',
                isActive
                  ? 'font-medium text-zinc-950 dark:text-white'
                  : 'font-normal text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
