// ---------------------------------------------------------------------------
// NOA Inventory -- Certificate Generator Component
// Generates a certificate of authenticity for a single artwork.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { CertificatePDF } from '../pdf/CertificatePDF';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import { useCertificates } from '../../hooks/useCertificates';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { DOC_PREFIXES } from '../../lib/constants';
import { formatDate } from '../../lib/utils';
import type { CertificateRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Language options
// ---------------------------------------------------------------------------

type Language = 'en' | 'de' | 'fr';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Francais' },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CertificateGeneratorProps {
  artworkId: string;
  artworkTitle: string;
  artworkReferenceCode: string;
  existingCertificate?: CertificateRow | null;
  onGenerated?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CertificateGenerator({
  artworkId,
  artworkTitle,
  artworkReferenceCode,
  existingCertificate,
  onGenerated,
}: CertificateGeneratorProps) {
  const [language, setLanguage] = useState<Language>('en');
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);

  const { generateNumber } = useDocumentNumber();
  const { createCertificate } = useCertificates({ filters: { artworkId } });

  // ---- Generate a new certificate -----------------------------------------

  async function handleGenerate() {
    setGenerating(true);

    try {
      const certNumber = await generateNumber(DOC_PREFIXES.certificate);
      if (!certNumber) return;

      const result = await createCertificate({
        artwork_id: artworkId,
        certificate_number: certNumber,
        issue_date: new Date().toISOString().split('T')[0],
      });

      if (result) {
        onGenerated?.();
      }
    } finally {
      setGenerating(false);
    }
  }

  // ---- Download the certificate PDF ---------------------------------------

  async function handleDownload() {
    if (!existingCertificate) return;

    setDownloading(true);

    try {
      const blob = await pdf(
        <CertificatePDF certificate={existingCertificate} language={language} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${existingCertificate.certificate_number}_${artworkReferenceCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  // ---- No existing certificate -- show generate UI ------------------------

  if (!existingCertificate) {
    return (
      <div className="flex flex-col gap-4">
        <div className="w-full sm:w-48">
          <Select
            label="Language"
            options={[...LANGUAGE_OPTIONS]}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          />
        </div>

        <div>
          <Button onClick={handleGenerate} loading={generating}>
            Generate Certificate
          </Button>
        </div>
      </div>
    );
  }

  // ---- Existing certificate -- show info + download / regenerate ----------

  return (
    <div className="flex flex-col gap-4">
      {/* Certificate info */}
      <div className="rounded-md border border-primary-100 bg-primary-50 p-4">
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-primary-900">
              {existingCertificate.certificate_number}
            </p>
            <p className="text-xs text-primary-500">
              Issued {formatDate(existingCertificate.issue_date)}
            </p>
          </div>
        </div>
      </div>

      {/* Language selector + actions */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48">
          <Select
            label="Language"
            options={[...LANGUAGE_OPTIONS]}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          />
        </div>

        <Button onClick={handleDownload} loading={downloading}>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Download PDF
        </Button>

        {!showRegenerate ? (
          <Button variant="ghost" size="sm" onClick={() => setShowRegenerate(true)}>
            Regenerate
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary-500">
              This will create a new certificate number.
            </span>
            <Button variant="danger" size="sm" onClick={handleGenerate} loading={generating}>
              Confirm Regenerate
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowRegenerate(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
