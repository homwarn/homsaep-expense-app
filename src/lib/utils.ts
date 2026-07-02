import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as LAK currency (default) */
export function formatMoney(value: number | null | undefined, currency = 'LAK') {
  const n = Number(value ?? 0)
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(n)
  return `${formatted} ${currency}`
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
    Number(value ?? 0),
  )
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-'
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const todayISO = () => new Date().toISOString().slice(0, 10)

export function startOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
export function startOfYearISO(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10)
}

/** Percent growth helper — returns rounded % or null when no base */
export function growth(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}
