import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'MYR'): string {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ms-MY').format(num)
}

export function formatPercentage(num: number): string {
  return new Intl.NumberFormat('ms-MY', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num / 100)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ms-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur'
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ms-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kuala_Lumpur'
  }).format(d)
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'enabled':
    case 'running':
      return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300'
    case 'paused':
    case 'pending':
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300'
    case 'removed':
    case 'disabled':
    case 'failed':
      return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300'
    case 'draft':
    case 'inactive':
      return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-300'
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-300'
  }
}

export function getMetricColor(value: number, isPositiveGood: boolean = true): string {
  if (value === 0) return 'text-gray-600 dark:text-gray-400'
  
  const isPositive = value > 0
  
  if (isPositiveGood) {
    return isPositive 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400'
  } else {
    return isPositive 
      ? 'text-red-600 dark:text-red-400' 
      : 'text-green-600 dark:text-green-400'
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

// Malaysia-specific utilities
export const MALAYSIA_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Malacca',
  'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya',
  'Sabah', 'Sarawak', 'Selangor', 'Terengganu'
]

export const MALAYSIA_LANGUAGES = [
  { code: 'ms', name: 'Bahasa Malaysia' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ta', name: 'தமிழ்' }
]

export function getMalaysiaTimezone(): string {
  return 'Asia/Kuala_Lumpur'
}

export function getCurrentMalaysiaTime(): Date {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kuala_Lumpur"}))
}
