import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Button } from '@components/ui'

import style from './contextMenu.module.css'

export interface ContextMenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
}

export interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

/** Right-click menu positioned at the cursor, kept inside the window. */
const ContextMenu = ({ x, y, items, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })

  // Flip the menu back inside the window when opened near its right/bottom edge.
  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const { width, height } = menu.getBoundingClientRect()
    setPosition({
      left: Math.max(4, Math.min(x, window.innerWidth - width - 4)),
      top: Math.max(4, Math.min(y, window.innerHeight - height - 4)),
    })
  }, [x, y])

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('blur', onClose)
    return () => {
      window.removeEventListener('mousedown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className={style.contextMenu}
      style={position}
      role="menu"
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item) => (
        <Button
          key={item.label}
          variant="transparent"
          className={item.danger ? style.contextMenuItemDanger : style.contextMenuItem}
          onClick={() => {
            onClose()
            item.onSelect()
          }}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}

export default ContextMenu
