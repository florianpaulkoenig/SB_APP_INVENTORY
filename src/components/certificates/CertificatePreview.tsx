// ---------------------------------------------------------------------------
// NOA Inventory -- Certificate Preview Component
// Shows certificate details with download and delete options.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { CertificatePDF } from '../pdf/CertificatePDF';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { formatDate, downloadBlob, buildCertificateFilename } from '../../lib/utils';
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

interface CertificatePreviewProps {
  certificate: CertificateRow & {
    artworks?: {
      title: string;
      reference_code: string;
      medium: string | null;
      year: number | null;
      height: number | null;
      width: number | null;
      depth: number | null;
      dimension_unit: string;
      framed_height: number | null;
      framed_width: number | null;
      framed_depth: number | null;
      edition_type: string;
      edition_number: number | null;
      edition_total: number | null;
    };
  };
  onDelete?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CertificatePreview({
  certificate,
  onDelete,
}: CertificatePreviewProps) {
  const [language, setLanguage] = useState<Language>('en');
  const [downloading, setDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ---- Download the certificate PDF ---------------------------------------

  async function handleDownload() {
    setDownloading(true);

    try {
      const blob = await pdf(
        <CertificatePDF certificate={certificate} language={language} />,
      ).toBlob();

      downloadBlob(blob, certificate.artworks
        ? buildCertificateFilename(certificate.artworks)
        : `${certificate.certificate_number}.pdf`
      );
    } finally {
      setDownloading(false);
    }
  }

  // ---- Render -------------------------------------------------------------

  return (
    <>
      <Card className="p-5">
        {/* Certificate info */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
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
              <h3 className="text-sm font-semibold text-primary-900">
                {certificate.certificate_number}
              </h3>
            </div>
            <p className="mt-1 text-xs text-primary-500">
              Issued {formatDate(certificate.issue_date)}
            </p>
          </div>

          {/* Delete button */}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-primary-400 hover:text-danger"
            >
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
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </Button>
          )}
        </div>

        {/* Artwork info */}
        {certificate.artworks && (
          <div className="mb-4 rounded-md bg-primary-50 px-3 py-2">
            <p className="text-sm font-medium text-primary-800">
              {certificate.artworks.title}
            </p>
            <p className="text-xs text-primary-500">
              {certificate.artworks.reference_code}
            </p>
          </div>
        )}

        {/* Language selector + download */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Select
              label="Language"
              options={[...LANGUAGE_OPTIONS]}
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            />
          </div>

          <Button size="sm" onClick={handleDownload} loading={downloading}>
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
        </div>
      </Card>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete?.()}
        title="Delete Certificate"
        message={`Are you sure you want to delete certificate ${certificate.certificate_number}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
