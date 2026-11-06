import classNames from 'clsx'

import { Text } from '@components/ui'
import InlineNameInput from '@components/palettes/inlineNameInput/InlineNameInput'

import style from './navigationItem.module.css'

export interface NavigationItemProps {
  label: string
  color: string
  isActive?: boolean
  onClick?: () => void
  onContextMenu?: (event: React.MouseEvent) => void
  /** Shows an inline text field in place of the label. */
  isEditing?: boolean
  placeholder?: string
  onRename?: (name: string) => void
  onCancelEdit?: () => void
}

const NavigationItem = ({
  label,
  color,
  isActive,
  onClick,
  onContextMenu,
  isEditing,
  placeholder,
  onRename,
  onCancelEdit,
}: NavigationItemProps) => {
  const swatch = <div className={style.colorSwatch} style={{ backgroundColor: color }}></div>

  // An <input> can't live inside a <button>, so editing swaps the element.
  if (isEditing) {
    return (
      <div className={classNames(style.navigationItem, isActive && style.active)}>
        {swatch}
        <InlineNameInput
          defaultValue={label}
          placeholder={placeholder}
          onSubmit={(name) => onRename?.(name)}
          onCancel={() => onCancelEdit?.()}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      className={classNames(style.navigationItem, isActive && style.active)}
      onClick={onClick}
      onContextMenu={onContextMenu}
      aria-current={isActive ? 'true' : undefined}
    >
      {swatch}
      <Text as="span" color="primary" className={style.label}>
        {label}
      </Text>
    </button>
  )
}

export default NavigationItem
