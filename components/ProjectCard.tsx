'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return desktop
}

export function ProjectCard({
  title,
  url,
  tilt = -3,
  offset = 0,
  desktopOffset = 0,
  desktopImage,
  mobileImage,
}: {
  title: string
  url: string
  tilt?: number
  offset?: number
  desktopOffset?: number
  desktopImage?: string
  mobileImage?: string
}) {
  const isDesktop = useIsDesktop()
  const cardWidth = isDesktop ? 360 : 220
  const cardRatio = isDesktop ? '7 / 5' : '5 / 7'
  const cardOffset = isDesktop ? desktopOffset : offset
  const imageSrc = isDesktop ? desktopImage : mobileImage

  const useImage = !!imageSrc

  // iframe fallback dimensions
  const iframeW = isDesktop ? 1280 : 430
  const iframeH = isDesktop ? 900 : 900
  const iframeScale = isDesktop ? 0.281 : 0.512

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group absolute rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-md hover:shadow-xl hover:z-30 transition-all duration-300"
      style={{
        width: cardWidth,
        aspectRatio: cardRatio,
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
            sizes={`${cardWidth}px`}
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
