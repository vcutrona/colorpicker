import { useEffect, useRef } from 'react'
import classNames from 'clsx'

import style from './inlineNameInput.module.css'

export interface InlineNameInputProps {
  defaultValue?: string
  placeholder?: string
  className?: string
  /** Called with the trimmed name; never with an empty string. */
  onSubmit: (name: string) => void
  onCancel: () => void
}

/**
 * Single-line text field used to create or rename palettes and sections in
 * place. Enter or blur commits, Escape cancels; an empty value cancels too.
 */
const InlineNameInput = ({
  defaultValue = '',
  placeholder,
  className,
  onSubmit,
  onCancel,
}: InlineNameInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  // Enter commits and unmounts the field, which then fires blur: without this
  // guard the same edit would be submitted (or cancelled) twice.
  const doneRef = useRef(false)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const finish = (commit: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    const name = inputRef.current?.value.trim() ?? ''
    if (commit && name) {
      onSubmit(name)
    } else {
      onCancel()
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className={classNames(style.inlineNameInput, className)}
      defaultValue={defaultValue}
      placeholder={placeholder}
      spellCheck={false}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') {
          event.preventDefault()
          finish(true)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          finish(false)
        }
      }}
      onBlur={() => finish(true)}
    />
  )
}

export default InlineNameInput
