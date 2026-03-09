'use client'

import { Component, useEffect, useState, useCallback, useRef } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { GitHubCalendar } from 'react-github-calendar'
import type { Activity } from 'react-github-calendar'

class CalendarErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('GitHub calendar error:', error, info)
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

const theme = {
  light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  dark: ['#21262d', '#0e4429', '#006d32', '#26a641', '#39d353'],
}

const BLOCK_SIZE = 8
const BLOCK_MARGIN = 4
const LABEL_WIDTH = 30 // approximate width for month/day labels

export function GitHubStats() {
  const [showCalendar, setShowCalendar] = useState(false)
  const [weeks, setWeeks] = useState(52)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setShowCalendar(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const calcWeeks = () => {
      const width = container.clientWidth
      const available = width - LABEL_WIDTH
      const weekWidth = BLOCK_SIZE + BLOCK_MARGIN
      const fitWeeks = Math.floor(available / weekWidth)
      setWeeks(Math.max(4, Math.min(52, fitWeeks)))
    }

    calcWeeks()

    const observer = new ResizeObserver(calcWeeks)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const trimData = useCallback(
    (data: Array<Activity>) => {
      if (weeks >= 52) return data
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - weeks * 7)
      return data.filter((day) => new Date(day.date) >= cutoff)
    },
    [weeks],
  )

  return (
    <div ref={containerRef} className="github-calendar-container mt-4">
      {showCalendar && (
        <CalendarErrorBoundary>
          <div className="calendar-fade-in">
            <GitHubCalendar
              username="JeremyDudet"
              theme={theme}
              renderColorLegend={() => <span />}
              labels={{ legend: { less: '', more: '' } }}
              showTotalCount={false}
              transformData={trimData}
              style={{
                width: '100%',
                maxWidth: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                fontSize: 14,
                marginBottom: '0px',
              }}
              blockSize={BLOCK_SIZE}
              blockMargin={BLOCK_MARGIN}
            />
          </div>
        </CalendarErrorBoundary>
      )}
    </div>
  )
}
