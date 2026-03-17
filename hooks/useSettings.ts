import { useSettingsContext } from '@/contexts/SettingsContext';

export type { UserSettings } from '@/contexts/SettingsContext';

export function useSettings() {
    return useSettingsContext();
}
