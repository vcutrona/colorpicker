import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'clsx'

import { Text, Button } from '@components/ui'
import Icon, { IconEnum } from '@components/icons'
import InlineNameInput from '@components/palettes/inlineNameInput/InlineNameInput'

import style from './navigationSection.module.css'

export interface NavigationSectionAction {
  label: string
  onSelect: () => void
}

const NO_ACTIONS: NavigationSectionAction[] = []

export interface NavigationSectionProps {
  label: string
  isOpen: boolean
  onToggle: (isOpen: boolean) => void
  /** Entries of the "⋮" menu. */
  actions?: NavigationSectionAction[]
  onContextMenu?: (event: React.MouseEvent) => void
  /** Shows an inline text field in place of the label. */
  isEditing?: boolean
  placeholder?: string
  onRename?: (name: string) => void
  onCancelEdit?: () => void
  children?: React.ReactNode
}

const NavigationSection = ({
  label,
  isOpen,
  onToggle,
  actions = NO_ACTIONS,
  onContextMenu,
  isEditing,
  placeholder,
  onRename,
  onCancelEdit,
  children,
}: NavigationSectionProps) => {
  const { t } = useTranslation('palettes')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMenuOpen) return
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', closeMenu)
    return () => window.removeEventListener('mousedown', closeMenu)
  }, [isMenuOpen])

  return (
    <>
      <div
        className={style.navigationSection}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => !isEditing && onToggle(!isOpen)}
        onContextMenu={onContextMenu}
        onKeyDown={(event) => {
          if (!isEditing && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            onToggle(!isOpen)
          }
        }}
      >
        <div className={style.navigationSectionToggle}>
          <span className={classNames(style.chevron, isOpen && style.chevronOpen)}>
            <Icon type={IconEnum.ARROW} />
          </span>
          {isEditing ? (
            <InlineNameInput
              defaultValue={label}
              placeholder={placeholder}
              onSubmit={(name) => onRename?.(name)}
              onCancel={() => onCancelEdit?.()}
            />
          ) : (
            <Text
              color="primary"
              size="small"
              weight="semibold"
              className={style.navigationSectionLabel}
            >
              {label}
            </Text>
          )}
        </div>

        {actions.length > 0 && !isEditing && (
          <div
            className={style.navigationSectionMenu}
            ref={menuRef}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              variant="transparent"
              className={classNames(
                style.navigationSectionMenuButton,
                isMenuOpen && style.navigationSectionMenuButtonActive,
              )}
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label={t('section.options')}
            >
              &#8942;
            </Button>

            {isMenuOpen && (
              <div className={style.navigationSectionDropdown}>
                {actions.map((action) => (
                  <Button
                    key={action.label}
                    variant="transparent"
                    className={style.navigationSectionDropdownItem}
                    onClick={() => {
                      setIsMenuOpen(false)
                      action.onSelect()
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {isOpen && children && <section className={style.navigationSectionItems}>{children}</section>}
    </>
  )
}

export default NavigationSection
