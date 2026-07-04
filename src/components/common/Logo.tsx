import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Brand logo. Prefers the real restaurant logo at /logo.png
 * (drop your file into the `public/` folder as logo.png) and
 * gracefully falls back to the built-in SVG mark.
 */
export function Logo({ className }: { className?: string }) {
  const [src, setSrc] = useState('/logo.png')
  return (
    <img
      src={src}
      alt="ຮ້ານບຸບເຟ້ ຫອມແຊບ"
      onError={() => src !== '/logo.svg' && setSrc('/logo.svg')}
      className={cn('object-contain', className)}
    />
  )
}
