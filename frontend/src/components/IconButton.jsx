import { forwardRef } from 'react'

const IconButton = forwardRef(({ label, size = 'md', className = '', children, ...props }, ref) => (
  <button
    ref={ref}
    className={`btn btn-icon btn-${size} ${className}`}
    aria-label={label}
    {...props}
  >
    {children}
  </button>
))
IconButton.displayName = 'IconButton'
export default IconButton
