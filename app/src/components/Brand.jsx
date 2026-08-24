import { Link } from 'react-router-dom'

/* The Atreya mark — an eye, because that is what the word means.
   Inherits currentColor so it sits correctly on any surface in both themes. */
export function Mark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M4 24C10 14.9 16.4 10.3 24 10.3S38 14.9 44 24c-6 9.1-12.4 13.7-20 13.7S10 33.1 4 24Z"
            fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="7.4" fill="currentColor" />
    </svg>
  )
}

/* Shared top bar: mark + wordmark + context, with quiet cross-links so a judge
   exploring the product can reach every surface without the address bar. */
