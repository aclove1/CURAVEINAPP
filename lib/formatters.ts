export function fmtCurrency(value: number | null | undefined, showZeroDash = true): string {
  if (value === null || value === undefined) return '—'
  if (showZeroDash && value === 0) return '—'
  if (value < 0) return `(${fmtCurrency(-value, false)})`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

export function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '—'
  return `${(value * 100).toFixed(decimals)}%`
}

export function fmtNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (value === 0) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function fmtDecimal(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '—'
  return value.toFixed(decimals)
}

export const MONTH_LABELS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
