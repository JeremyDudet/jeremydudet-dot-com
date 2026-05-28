const LAYERS = [
  { blur: 0.5, coverage: 1 },
  { blur: 1, coverage: 0.75 },
  { blur: 2, coverage: 0.5 },
  { blur: 4, coverage: 0.25 },
] as const

export default function ScrollEdgeFade({
  edge,
  height = 80,
}: {
  edge: 'top' | 'bottom'
  height?: number
}) {
  const position = edge === 'top' ? 'top-2 rounded-t-2xl' : 'bottom-2 rounded-b-2xl'
  const direction = edge === 'top' ? 'to bottom' : 'to top'

  return (
    <>
      {LAYERS.map(({ blur, coverage }, i) => {
        const mid = coverage * 50
        const end = coverage * 100
        const mask = `linear-gradient(${direction}, black 0%, black ${mid}%, transparent ${end}%)`
        return (
          <div
            key={i}
            aria-hidden
            className={`pointer-events-none fixed inset-x-2 z-10 ${position}`}
            style={{
              height,
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        )
      })}
    </>
  )
}
