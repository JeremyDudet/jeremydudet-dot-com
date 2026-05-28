'use client'

import { useEffect, useRef, useState } from 'react'

const RAIL_HEIGHT_FRACTION = 0.4
const SLOT_HEIGHT = 9
const MIN_TICKS = 24
const INACTIVE_TICK_WIDTH = 10
const PEAK_TICK_WIDTH = 22

function computeWindowRadius(tickCount: number): number {
  return Math.max(2, Math.floor(tickCount / 32))
}

function tickIntensity(distance: number, windowRadius: number): number {
  const sigma = Math.max(1, windowRadius / 1.6)
  return Math.exp(-(distance * distance) / (2 * sigma * sigma))
}

export default function ScrollRail({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState(0)
  const [scrollable, setScrollable] = useState(0)
  const [tickCount, setTickCount] = useState(120)
  const isDraggingRef = useRef(false)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = document.getElementById(targetId)
    if (!el) return

    const update = () => {
      const room = el.scrollHeight - el.clientHeight
      setScrollable(room)
      if (room <= 0) {
        setProgress(0)
        return
      }
      setProgress(Math.max(0, Math.min(1, el.scrollTop / room)))
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [targetId])

  useEffect(() => {
    const recompute = () => {
      const available = window.innerHeight * RAIL_HEIGHT_FRACTION
      setTickCount(Math.max(MIN_TICKS, Math.floor(available / SLOT_HEIGHT)))
    }
    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [])

  const activeIdx = Math.round(progress * (tickCount - 1))
  const windowRadius = computeWindowRadius(tickCount)

  const scrollToClientY = (clientY: number) => {
    const rail = railRef.current
    if (!rail) return
    const pane = document.getElementById(targetId)
    if (!pane) return
    const room = pane.scrollHeight - pane.clientHeight
    if (room <= 0) return
    const rect = rail.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height)))
    pane.scrollTop = ratio * room
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrollable <= 0) return
    isDraggingRef.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    scrollToClientY(e.clientY)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    scrollToClientY(e.clientY)
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  return (
    <div
      ref={railRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ opacity: scrollable > 0 ? 1 : 0.4 }}
      className="fixed top-1/2 -translate-y-1/2 right-4 z-20 hidden h-[40vh] w-9 cursor-pointer touch-none select-none flex-col items-end justify-between md:flex"
      aria-label="Page scroll indicator"
    >
      {Array.from({ length: tickCount }).map((_, i) => {
        const distance = Math.abs(i - activeIdx)
        const intensity = tickIntensity(distance, windowRadius)
        const baseWidth = INACTIVE_TICK_WIDTH + (PEAK_TICK_WIDTH - INACTIVE_TICK_WIDTH) * intensity
        return (
          <span
            key={i}
            style={{ width: `${baseWidth}px` }}
            className="group relative block h-0.5 cursor-pointer hover:!w-[22px]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-zinc-950/15 dark:bg-white/15 group-hover:bg-zinc-950/30 dark:group-hover:bg-white/30 transition-colors duration-150"
            />
            {intensity > 0.01 && (
              <span
                aria-hidden="true"
                style={{ opacity: intensity }}
                className="absolute inset-0 bg-zinc-950 dark:bg-white"
              />
            )}
          </span>
        )
      })}
    </div>
  )
}
