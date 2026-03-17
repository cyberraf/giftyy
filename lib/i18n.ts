import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../assets/locales/en.json';
import fr from '../assets/locales/fr.json';

const resources = {
  en: { translation: en },
};

// Default everything to English for now
const getInitialLocale = () => 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLocale(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
