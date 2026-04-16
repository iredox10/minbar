import { useUser } from '../context/UserContext';
import { translations } from '../lib/i18n';
import type { TranslationKey } from '../lib/i18n';

export function useTranslation() {
  const { user } = useUser();
  const lang = user?.prefs?.language || 'en';

  const t = (key: TranslationKey): string => {
    return translations[lang][key] || translations.en[key] || key;
  };

  return { t, lang };
}
