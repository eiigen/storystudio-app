import { forwardRef } from 'react'

const variants = {
  primary: 'btn-magic',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  icon: 'btn-round',
}

const Button = forwardRef(({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => (
  <button
    ref={ref}
    className={`btn btn-${size} ${variants[variant] || ''} ${className}`}
    {...props}
  >
    {children}
  </button>
))
Button.displayName = 'Button'
export default Button
