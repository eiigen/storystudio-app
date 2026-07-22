import { forwardRef } from 'react'

const Card = forwardRef(({ variant = 'elevated', className = '', header, footer, children, ...props }, ref) => (
  <div ref={ref} className={`card card-${variant} ${className}`} {...props}>
    {header && <div className="card-header">{header}</div>}
    <div className="card-body">{children}</div>
    {footer && <div className="card-footer">{footer}</div>}
  </div>
))
Card.displayName = 'Card'
export default Card
