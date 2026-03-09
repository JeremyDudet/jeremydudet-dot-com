'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

export function ProjectCard({
  title,
  url,
  tilt = -3,
  offset = 0,
  desktopOffset = 0,
  desktopImage,
  mobileImage,
  wideBreakpoint = 300,
}: {
  title: string
  url: string
  tilt?: number
  offset?: number
  desktopOffset?: number
  desktopImage?: string
  mobileImage?: string
  wideBreakpoint?: number
}) {
  const containerRef = useRef<HTMLAnchorElement>(null)
  const [isWide, setIsWide] = useState(false)
  const [cardWidth, setCardWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current?.parentElement
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsWide(entry.contentRect.width >= wideBreakpoint)
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [wideBreakpoint])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCardWidth(entry.contentRect.width)
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const cardRatio = isWide ? '7 / 5' : '5 / 7'
  const cardOffset = isWide ? desktopOffset : offset
  const imageSrc = isWide ? desktopImage : mobileImage

  const useImage = !!imageSrc

  // iframe dimensions and dynamic scale based on actual card width
  const iframeW = isWide ? 1280 : 430
  const iframeH = 900
  const iframeScale = cardWidth > 0 ? cardWidth / iframeW : 0

  return (
    <a
      ref={containerRef}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group absolute inset-0 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-md hover:shadow-xl hover:z-30 transition-all duration-300"
      style={{
        aspectRatio: cardRatio,
        width: '100%',
        maxHeight: '100%',
        transform: `rotate(${tilt}deg) translateY(0px)`,
        left: cardOffset,
        background: 'white',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'rotate(0deg) translateY(-12px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = `rotate(${tilt}deg) translateY(0px)`
      }}
    >
      <div className="relative w-full h-full overflow-hidden bg-white dark:bg-zinc-800">
        {useImage ? (
          <Image
            src={imageSrc}
            alt={title}
            fill
            className="object-cover object-top"
            sizes="300px"
          />
        ) : (
          <iframe
            src={url}
            title={title}
            scrolling="no"
            className="pointer-events-none absolute top-0 left-0 origin-top-left"
            style={{
              width: iframeW,
              height: iframeH,
              transform: `scale(${iframeScale})`,
            }}
            tabIndex={-1}
            loading="lazy"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
      </div>
    </a>
  )
}
