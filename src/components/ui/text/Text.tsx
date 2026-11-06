import classNames from 'clsx'

import style from './Text.module.css'

export type TextSize = 'small' | 'medium' | 'large'
export type TextWeight = 'normal' | 'light' | 'semibold' | 'bold'
export type TextColor = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'

export interface TextProps {
  size?: TextSize
  weight?: TextWeight
  children: React.ReactNode
  className?: string
  color?: TextColor
  /** Rendered element; use `span` inside phrasing-only parents such as `<button>` or `<p>`. */
  as?: 'p' | 'span'
}

const Text = ({
  size = 'medium',
  weight = 'normal',
  children,
  className,
  color,
  as: Tag = 'p',
}: TextProps) => {
  return (
    <Tag
      className={classNames(style.text, color && style[color], style[size], style[weight], className)}
    >
      {children}
    </Tag>
  )
}

export default Text
