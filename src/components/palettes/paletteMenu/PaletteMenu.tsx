import { Heading } from '@components/ui'

import style from './paletteMenu.module.css'

export interface PaletteMenuProps {
  title?: string
  /** Toolbar controls shown on the right. */
  children?: React.ReactNode
}

const PaletteMenu = ({ title, children }: PaletteMenuProps) => {
  return (
    <section className={style.paletteMenu}>
      {title && (
        <Heading level={3} color="primary" className={style.paletteMenuTitle}>
          {title}
        </Heading>
      )}
      {children && <div className={style.paletteMenuActions}>{children}</div>}
    </section>
  )
}

export default PaletteMenu
