import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '@components/ui'
import { isPickerSupportedSync } from '@common/platform'

import DisplaySettings from './display/displaySettings'
import BehaviorSettings from './behavior/behaviorSettings'

import style from './PickerPage.module.css'

const PickerPage = () => {
  const CommonT = useTranslation('common')

  return (
    <>
      {!isPickerSupportedSync() && (
        <Text size="small" color="secondary" className={style.unavailableNotice}>
          {CommonT.t('unavailable.pickerLinux')}
        </Text>
      )}
      <DisplaySettings />
      <BehaviorSettings />
    </>
  )
}

export default memo(PickerPage)
