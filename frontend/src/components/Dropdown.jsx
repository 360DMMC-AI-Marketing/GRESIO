import { useState, useRef, useEffect } from 'react'

export default function Dropdown({ value, onChange, options, placeholder, className, style }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value)
  const label = selected ? selected.label : (placeholder || 'Select...')

  return (
    <div ref={ref} className={`dropdown ${className || ''}`} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => setOpen(!open)}
      >
        <span className="dropdown-label">{label}</span>
        <svg className={`dropdown-chevron ${open ? 'open' : ''}`} width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="dropdown-menu">
          {options.map(o => (
            <div
              key={o.value}
              className={`dropdown-option ${o.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              {o.dot && <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:o.dot,marginRight:5,flexShrink:0}} />}
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}