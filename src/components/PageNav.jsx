import { useRef, useState, useEffect, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/products', label: 'Products' },
]

function Annotation() {
  return (
    <span className="pointer-events-none absolute left-0 top-0">
      {/* Hand-drawn circle around Services */}
      <svg
        className="absolute"
        style={{ left: -12, top: -7, width: 80, height: 36 }}
        viewBox="0 0 80 36"
        fill="none"
      >
        <path
          d="M 76 17 C 76 9, 60 3, 40 3 C 20 3, 4 9, 4 18 C 4 27, 20 33, 40 33 C 60 33, 76 27, 76 18"
          stroke="currentColor"
          className="text-blue-500 dark:text-blue-400"
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Arrow curving from the note up to the circle */}
      <svg
        className="absolute"
        style={{ left: 10, top: 18, width: 110, height: 48 }}
        viewBox="0 0 110 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 100 42 C 85 46, 55 40, 40 30 C 30 23, 28 17, 30 11"
          stroke="currentColor"
          className="text-blue-500 dark:text-blue-400"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Arrowhead — two strokes forming a V */}
        <g transform="rotate(-5, 30, 11)">
          <path
            d="M 25 17 L 30 11"
            stroke="currentColor"
            className="text-blue-500 dark:text-blue-400"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 35 17 L 30 11"
            stroke="currentColor"
            className="text-blue-500 dark:text-blue-400"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </svg>

      {/* Handwritten note */}
      <span
        className="absolute whitespace-nowrap text-blue-500 dark:text-blue-400 select-none"
        style={{
          fontFamily: "'Caveat', cursive",
          fontSize: '17px',
          fontWeight: 600,
          left: 111,
          top: 50,
          transform: 'rotate(2deg)',
        }}
      >
        available for projects!
      </span>
    </span>
  )
}

export function PageNav() {
  const location = useLocation()
  const navRef = useRef(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [hasAnimated, setHasAnimated] = useState(false)

  const updateIndicator = useCallback(() => {
    if (!navRef.current) return
    const active = navRef.current.querySelector('[data-active="true"]')
    if (active) {
      const navRect = navRef.current.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      setIndicator({
        left: activeRect.left - navRect.left,
        width: activeRect.width,
      })
      if (!hasAnimated) {
        requestAnimationFrame(() => setHasAnimated(true))
      }
    }
  }, [hasAnimated])

  useEffect(() => {
    updateIndicator()
  }, [location.pathname, updateIndicator])

  return (
    <div className="mx-auto px-4 sm:px-6 md:max-w-2xl md:px-4 lg:max-w-4xl lg:px-12 mb-12">
      <NavLink
        to="/"
        className="text-2xl/8 font-semibold text-zinc-950 sm:text-xl/8 dark:text-white"
      >
        Jeremy Dudet
      </NavLink>
      <div ref={navRef} className="relative mt-1 flex gap-4 text-sm">
        <div
          className="absolute -bottom-1 h-0.5 rounded-full bg-zinc-950 dark:bg-white"
          style={{
            left: indicator.left,
            width: indicator.width,
            transition: hasAnimated
              ? 'left 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
          }}
        />
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            data-active={
              to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(to)
            }
            className={({ isActive }) =>
              isActive
                ? 'relative pb-2 font-medium text-zinc-950 dark:text-white'
                : 'relative pb-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }
          >
            {label}
            {label === 'Services' && location.pathname === '/' && <Annotation />}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
