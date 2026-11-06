import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { SettingsSection, SettingsItem } from '@components/settings'
import { useSettingsStore, DEFAULT_SETTINGS } from '@stores/settingsStore'
import { useHotkeyConflict } from '@hooks/index'
import { setPickerHotkey } from '@common/ipc'
import { HotkeyInput } from '@components/ui'
import { showToast } from '@stores/toastStore'
import { isPickerSupportedSync } from '@common/platform'

const PickerShortcutsSettings = () => {
  const SettingsT = useTranslation('settings', { keyPrefix: 'shortcuts.picker' })
  const CommonT = useTranslation('common')
  const pickerHotkey = useSettingsStore((state) => state.pickerHotkey)
  const updateSetting = useSettingsStore((state) => state.updateSetting)
  const checkConflict = useHotkeyConflict('pickerHotkey')

  const handleHotkeyChange = useCallback(
    async (hotkey: string) => {
      try {
        // Register with the OS first; only persist if it actually succeeded
        await setPickerHotkey(hotkey)
        await updateSetting('pickerHotkey', hotkey)
      } catch (error) {
        console.error('Failed to register picker hotkey:', error)
        showToast(SettingsT.t('pickerHotkey.errorToast'))
      }
    },
    [updateSetting, SettingsT],
  )

  return (
    <SettingsSection title={SettingsT.t('title')}>
      <SettingsItem
        label={SettingsT.t('pickerHotkey.label')}
        description={SettingsT.t('pickerHotkey.description')}
        disabled={!isPickerSupportedSync()}
        disabledReason={CommonT.t('unavailable.pickerLinuxShort')}
      >
        <HotkeyInput
          value={pickerHotkey}
          defaultValue={DEFAULT_SETTINGS.pickerHotkey}
          onChange={handleHotkeyChange}
          onValidate={checkConflict}
        />
      </SettingsItem>
    </SettingsSection>
  )
}

export default memo(PickerShortcutsSettings)
