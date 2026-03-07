// ---------------------------------------------------------------------------
// NOA Inventory -- Bulk Certificate Export Component
// Allows selecting multiple certificates and exporting them as a ZIP of PDFs.
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import JSZip from 'jszip';
import { CertificatePDF } from '../pdf/CertificatePDF';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
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

interface BulkCertificateExportProps {
  certificates: Array<
    CertificateRow & {
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
    }
  >;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BulkCertificateExport({
  certificates,
}: BulkCertificateExportProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [language, setLanguage] = useState<Language>('en');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // ---- Selection helpers --------------------------------------------------

  const allSelected = certificates.length > 0 && selectedIds.size === certificates.length;

  function handleToggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(certificates.map((c) => c.id)));
    }
  }

  function handleToggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ---- Export as ZIP ------------------------------------------------------

  const handleExport = useCallback(async () => {
    const selected = certificates.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;

    setExporting(true);
    setProgress({ current: 0, total: selected.length });

    try {
      const zip = new JSZip();

      for (let i = 0; i < selected.length; i++) {
        const cert = selected[i];
        setProgress({ current: i + 1, total: selected.length });

        const blob = await pdf(
          <CertificatePDF certificate={cert} language={language} />,
        ).toBlob();

        const fileName = `${cert.certificate_number}${
          cert.artworks ? `_${cert.artworks.reference_code}` : ''
        }.pdf`;

        zip.file(fileName, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Trigger download
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificates_export_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [certificates, selectedIds, language]);

  // ---- Empty state --------------------------------------------------------

  if (certificates.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-primary-400">
        No certificates available for export.
      </p>
    );
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full sm:w-48">
          <Select
            label="Language"
            options={[...LANGUAGE_OPTIONS]}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          />
        </div>

        <Button
          onClick={handleExport}
          loading={exporting}
          disabled={selectedIds.size === 0}
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
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
          Export {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} as ZIP
        </Button>

        {/* Progress indicator */}
        {exporting && progress.total > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-primary-100">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${Math.round((progress.current / progress.total) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs text-primary-500">
              {progress.current} / {progress.total}
            </span>
          </div>
        )}
      </div>

      {/* Select all / deselect all */}
      <div className="border-b border-primary-100 pb-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleToggleAll}
            className="h-4 w-4 rounded border-primary-300 text-accent focus:ring-accent"
          />
          {allSelected ? 'Deselect All' : 'Select All'}
          <span className="text-primary-400">
            ({certificates.length} certificate{certificates.length !== 1 ? 's' : ''})
          </span>
        </label>
      </div>

      {/* Certificate checkbox list */}
      <div className="max-h-96 overflow-y-auto">
        <ul className="divide-y divide-primary-100">
          {certificates.map((cert) => (
            <li key={cert.id} className="flex items-center gap-3 py-2.5">
              <input
                type="checkbox"
                checked={selectedIds.has(cert.id)}
                onChange={() => handleToggle(cert.id)}
                className="h-4 w-4 rounded border-primary-300 text-accent focus:ring-accent"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-primary-900">
                  {cert.certificate_number}
                </p>
                {cert.artworks && (
                  <p className="truncate text-xs text-primary-500">
                    {cert.artworks.title} ({cert.artworks.reference_code})
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
