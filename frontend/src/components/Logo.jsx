import React from 'react'

const iconSizes = { sm: 26, md: 36, lg: 44 }
const textSizes = { sm: 'text-sm', md: 'text-xl', lg: 'text-3xl' }
const tagSizes = { sm: 'text-[9px]', md: 'text-[10px]', lg: 'text-xs' }

export default function Logo({ variant = 'full', size = 'md', showTagline = false, tagline = 'Internal OS', inverted = false, className = '' }) {
  const iSize = iconSizes[size] || iconSizes.md
  const txtCls = textSizes[size] || textSizes.md
  const tagCls = tagSizes[size] || tagSizes.md

  if (variant === 'iconOnly') {
    return <div className="logo-icon" style={{ width: iSize, height: iSize }}>G</div>
  }

  if (inverted) {
    return (
      <div className={`logo-text-group ${className}`}>
        <span className={`logo-wm-inverted ${txtCls}`}>GRESIO</span>
        {showTagline && <span className={`logo-tagline-inverted ${tagCls}`}>{tagline}</span>}
      </div>
    )
  }

  return (
    <div className={`logo-text-group ${className}`}>
      <span className={`logo-wm ${txtCls}`}>GRESIO</span>
      {showTagline && <span className={`logo-tagline ${tagCls}`}>{tagline}</span>}
    </div>
  )
}