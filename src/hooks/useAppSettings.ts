import { useState, useEffect } from 'react';
import { getAppSettings } from '../lib/appwrite';
import type { AppSettingsDoc } from '../types';

export const defaultAppSettings: AppSettingsDoc = {
  $id: 'global_config',
  paystackUrl: '',
  flutterwaveUrl: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  isDonationsEnabled: true,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettingsDoc>(defaultAppSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getAppSettings().then(data => {
      if (mounted) {
        if (data) {
          setSettings(data);
        }
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { settings, loading };
}
