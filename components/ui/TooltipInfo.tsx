'use client'

import { useState } from 'react'

interface TooltipInfoProps {
  text: string
  href: string
}

export function TooltipInfo({ text, href }: TooltipInfoProps) {
  const [show, setShow] = useState(false)

  return (
    <span
      className="relative inline-flex items-center ml-1"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-gray-400 hover:text-gray-300 cursor-help text-xs select-none">&#9432;</span>
      {show && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-xs text-gray-300 shadow-lg pointer-events-auto">
          <span>{text}</span>
          {href && href !== '#' && (
            <>
              {' '}
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:underline"
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
