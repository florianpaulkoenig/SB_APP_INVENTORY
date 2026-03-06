// ---------------------------------------------------------------------------
// NOA Inventory -- Reusable PDF Header Component
// ---------------------------------------------------------------------------

import { View, Text } from '@react-pdf/renderer';
import styles from './PDFStyles';
import { COMPANY_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------
const HEADER_TRANSLATIONS: Record<string, { certificateTitle: string }> = {
  en: { certificateTitle: 'Certificate of Authenticity' },
  de: { certificateTitle: 'Echtheitszertifikat' },
  fr: { certificateTitle: "Certificat d'Authenticit\u00e9" },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface PDFHeaderProps {
  title: string;
  subtitle?: string;
  language?: 'en' | 'de' | 'fr';
  companyName?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PDFHeader({ title, subtitle, language = 'en', companyName }: PDFHeaderProps) {
  // Use the provided title directly; caller may pass the translated certificate
  // title or any custom heading.  The `language` prop is available if the caller
  // wants automatic translation via the helper below.
  void language; // reserved for future per-field translations within the header

  return (
    <View style={styles.header}>
      <Text style={styles.companyName}>{companyName ?? COMPANY_NAME}</Text>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      <View style={styles.accentLine} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helper -- get translated certificate title
// ---------------------------------------------------------------------------
export function getCertificateTitle(language: 'en' | 'de' | 'fr'): string {
  return HEADER_TRANSLATIONS[language]?.certificateTitle ?? HEADER_TRANSLATIONS.en.certificateTitle;
}
