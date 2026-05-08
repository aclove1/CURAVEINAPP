'use client'

import { useEffect, useRef, useState } from 'react'

interface TooltipInfoProps {
  text: string
  href: string
  /** Accessible label override; defaults to "More info: {text}" */
  label?: string
}

/**
 * Inline "ⓘ" affordance that reveals a small popover on hover, focus, or tap.
 *
 * - Hover (desktop): show on enter, hide on leave.
 * - Focus (keyboard): show on focus, hide on blur.
 * - Tap (mobile): toggle on tap; close on tap-outside or Esc.
 *
 * The popover is positioned above the trigger and clamps to the viewport
 * so it never bleeds off the right edge on a phone.
 */
export function TooltipInfo({ text, href, label }: TooltipInfoProps) {
  const [show, setShow] = useState(false)
  const [shift, setShift] = useState(0) // px to shift popover horizontally to fit viewport
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLSpanElement>(null)

  // Measure popover after open and shift it horizontally if it would overflow
  useEffect(() => {
    if (!show) {
      setShift(0)
      return
    }
    const pop = popoverRef.current
    if (!pop) return
    const rect = pop.getBoundingClientRect()
    const margin = 8
    let dx = 0
    if (rect.right > window.innerWidth - margin) {
      dx = window.innerWidth - margin - rect.right
    } else if (rect.left < margin) {
      dx = margin - rect.left
    }
    setShift(dx)
  }, [show])

  // Outside-click + Esc close the popover (mobile/tap path)
  useEffect(() => {
    if (!show) return
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (target && wrapperRef.current && !wrapperRef.current.contains(target)) {
        setShow(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShow(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [show])

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex items-center ml-1"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button
        type="button"
        aria-label={label ?? `More info: ${text}`}
        aria-expanded={show}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShow(v => !v)
        }}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-gray-400 hover:text-gray-300 focus:text-gray-200 focus:outline-none cursor-help text-xs select-none px-1 py-1 -mx-1 -my-1 rounded"
      >
        &#9432;
      </button>
      {show && (
        <span
          ref={popoverRef}
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-xs text-gray-300 shadow-lg pointer-events-auto"
          style={{ transform: `translateX(calc(-50% + ${shift}px))` }}
        >
          <span>{text}</span>
          {href && href !== '#' && (
            <>
              {' '}
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-teal-400 hover:underline focus:outline focus:outline-1 focus:outline-teal-400 rounded"
              >
                Source
              </a>
            </>
          )}
          <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700" />
        </span>
      )}
    </span>
  )
}
