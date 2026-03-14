// ---------------------------------------------------------------------------
// NOA Inventory -- Excel Import Wizard
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef, useMemo } from 'react';
// xlsx loaded dynamically in downloadTemplate() to keep bundle light
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { GallerySelect } from '../galleries/GallerySelect';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import { useArtworks } from '../../hooks/useArtworks';
import { generateArtworkRefCode } from '../../lib/utils';
import type { ArtworkInsert } from '../../types/database';
import {
  parseExcelFile,
  mapRowToArtwork,
  validateImportRow,
  autoDetectMappings,
  MAPPABLE_FIELDS,
  type ExcelRow,
  type ColumnMapping,
  type ValidationResult,
} from '../../lib/excelImport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExcelImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing';

interface ImportProgress {
  total: number;
  completed: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Select options derived from MAPPABLE_FIELDS
// ---------------------------------------------------------------------------

const FIELD_OPTIONS = MAPPABLE_FIELDS.map((f) => ({
  value: f.value,
  label: f.label,
}));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExcelImporter({
  isOpen,
  onClose,
  onImportComplete,
}: ExcelImporterProps) {
  // ---- Hooks ---------------------------------------------------------------
  const { generateNumber } = useDocumentNumber();
  const { createArtwork } = useArtworks();

  // ---- State ---------------------------------------------------------------
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    completed: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Derived data --------------------------------------------------------

  // Map + validate each row with current mappings
  const mappedRows = useMemo(() => {
    return rows.map((row, index) => {
      const mapped = mapRowToArtwork(row, mappings);
      const validation = validateImportRow(mapped, index);
      return { mapped, validation };
    });
  }, [rows, mappings]);

  const validRowCount = mappedRows.filter((r) => r.validation.valid).length;
  const errorRowCount = mappedRows.filter((r) => !r.validation.valid).length;

  const isTitleMapped = mappings.some((m) => m.artworkField === 'title');

  // ---- Handlers ------------------------------------------------------------

  const resetState = useCallback(() => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setParseError(null);
    setIsDragging(false);
    setSelectedGalleryId(null);
    setProgress({
      total: 0,
      completed: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
    });
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);

    // Validate file type
    const validExtensions = ['.xlsx', '.csv', '.xls'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setParseError('Please select an .xlsx or .csv file');
      return;
    }

    try {
      const result = await parseExcelFile(file);
      setFileName(file.name);
      setHeaders(result.headers);
      setRows(result.rows);

      // Auto-detect column mappings
      const detected = autoDetectMappings(result.headers);
      setMappings(detected);
      setStep('mapping');
    } catch (err) {
      setParseError('Failed to parse file. Please check the format and try again.');
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleMappingChange = useCallback(
    (excelColumn: string, artworkField: string) => {
      setMappings((prev) =>
        prev.map((m) =>
          m.excelColumn === excelColumn ? { ...m, artworkField } : m,
        ),
      );
    },
    [],
  );

  const handleImport = useCallback(async () => {
    const validRows = mappedRows.filter((r) => r.validation.valid);
    if (validRows.length === 0) return;

    setStep('importing');
    setProgress({
      total: validRows.length,
      completed: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
    });

    let successCount = 0;
    let errorCount = 0;
    const importErrors: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const { mapped } = validRows[i];

      try {
        // Generate inventory number
        const inventoryNumber = await generateNumber('SB');
        if (!inventoryNumber) {
          throw new Error('Failed to generate inventory number');
        }

        // Generate reference code
        const referenceCode = generateArtworkRefCode();

        // Build the full insert payload
        const artworkData: ArtworkInsert = {
          inventory_number: inventoryNumber,
          reference_code: referenceCode,
          title: mapped.title || 'Untitled',
          ...mapped,
          ...(selectedGalleryId ? { gallery_id: selectedGalleryId } : {}),
        };

        const result = await createArtwork(artworkData);

        if (result) {
          successCount++;
        } else {
          throw new Error(`Failed to create artwork "${mapped.title}"`);
        }
      } catch (err) {
        errorCount++;
        importErrors.push(
          err instanceof Error
            ? err.message
            : `Failed to import row ${i + 1}`,
        );
      }

      setProgress({
        total: validRows.length,
        completed: i + 1,
        successCount,
        errorCount,
        errors: [...importErrors],
      });
    }
  }, [mappedRows, generateNumber, createArtwork, selectedGalleryId]);

  const handleDone = useCallback(() => {
    onImportComplete();
    handleClose();
  }, [onImportComplete, handleClose]);

  // ---- Download template ----------------------------------------------------

  const handleDownloadTemplate = useCallback(async () => {
    const exampleRows = [
      {
        Title: 'Shattered Portrait #1',
        Medium: 'Laminated glass, hammer',
        Year: 2024,
        Height: 100,
        Width: 80,
        Depth: 5,
        'Dimension Unit': 'cm',
        'Framed Height': 110,
        'Framed Width': 90,
        'Framed Depth': 8,
        Weight: 25,
        'Edition Type': 'unique',
        'Edition Number': '',
        'Edition Total': '',
        Price: 18000,
        Currency: 'EUR',
        Status: 'available',
        'Current Location': 'Studio Bern',
        Category: 'sculpture',
        Motif: 'portrait',
        Series: 'specific_portrait',
        Color: 'green',
        Notes: 'Commission for Gallery XYZ',
      },
      {
        Title: 'Fractured Landscape #3',
        Medium: 'Laminated glass, hammer',
        Year: 2024,
        Height: 120,
        Width: 160,
        Depth: 4,
        'Dimension Unit': 'cm',
        'Framed Height': '',
        'Framed Width': '',
        'Framed Depth': '',
        Weight: 35,
        'Edition Type': 'numbered',
        'Edition Number': 1,
        'Edition Total': 3,
        Price: 24000,
        Currency: 'CHF',
        Status: 'available',
        'Current Location': 'NOA Gallery Zurich',
        Category: 'sculpture',
        Motif: 'landscape',
        Series: 'landscape',
        Color: 'white',
        Notes: '',
      },
      {
        Title: 'Abstract Study VII',
        Medium: 'Float glass, UV-print',
        Year: 2023,
        Height: 60,
        Width: 60,
        Depth: 3,
        'Dimension Unit': 'cm',
        'Framed Height': 70,
        'Framed Width': 70,
        'Framed Depth': 6,
        Weight: 8,
        'Edition Type': 'AP',
        'Edition Number': '',
        'Edition Total': '',
        Price: 8500,
        Currency: 'EUR',
        Status: 'on_consignment',
        'Current Location': 'Galerie Berlin',
        Category: 'mixed_media',
        Motif: 'abstract',
        Series: 'abstract',
        Color: 'silver',
        Notes: 'Artist proof, not for sale',
      },
    ];

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(exampleRows);

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 28 }, // Title
      { wch: 26 }, // Medium
      { wch: 6 },  // Year
      { wch: 8 },  // Height
      { wch: 8 },  // Width
      { wch: 8 },  // Depth
      { wch: 16 }, // Dimension Unit
      { wch: 14 }, // Framed Height
      { wch: 14 }, // Framed Width
      { wch: 14 }, // Framed Depth
      { wch: 8 },  // Weight
      { wch: 14 }, // Edition Type
      { wch: 16 }, // Edition Number
      { wch: 14 }, // Edition Total
      { wch: 10 }, // Price
      { wch: 10 }, // Currency
      { wch: 16 }, // Status
      { wch: 22 }, // Current Location
      { wch: 14 }, // Category
      { wch: 12 }, // Motif
      { wch: 18 }, // Series
      { wch: 12 }, // Color
      { wch: 30 }, // Notes
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Artworks');
    XLSX.writeFile(wb, 'NOA_Artwork_Import_Template.xlsx');
  }, []);

  // ---- Step titles ---------------------------------------------------------

  const stepTitles: Record<ImportStep, string> = {
    upload: 'Import from Excel',
    mapping: 'Map Columns',
    preview: 'Preview & Validate',
    importing: 'Importing Artworks',
  };

  // ---- Render helpers ------------------------------------------------------

  const renderStepIndicator = () => {
    const steps: { key: ImportStep; label: string; number: number }[] = [
      { key: 'upload', label: 'Upload', number: 1 },
      { key: 'mapping', label: 'Map', number: 2 },
      { key: 'preview', label: 'Preview', number: 3 },
      { key: 'importing', label: 'Import', number: 4 },
    ];

    const currentIndex = steps.findIndex((s) => s.key === step);

    return (
      <div className="mb-6 flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i < currentIndex
                  ? 'bg-accent text-white'
                  : i === currentIndex
                    ? 'bg-primary-900 text-white'
                    : 'bg-primary-100 text-primary-400'
              }`}
            >
              {i < currentIndex ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              ) : (
                s.number
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                i <= currentIndex ? 'text-primary-700' : 'text-primary-400'
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-8 ${
                  i < currentIndex ? 'bg-accent' : 'bg-primary-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // ---- Step 1: Upload ------------------------------------------------------

  const renderUploadStep = () => (
    <div>
      {/* Gallery selection for bulk import */}
      <div className="mb-4">
        <GallerySelect
          value={selectedGalleryId}
          onChange={setSelectedGalleryId}
          label="Assign to Gallery (optional)"
        />
        <p className="mt-1 text-xs text-primary-400">
          All imported artworks will be assigned to this gallery.
        </p>
      </div>

      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
          isDragging
            ? 'border-accent bg-accent/5'
            : 'border-primary-200 bg-primary-50 hover:border-primary-300'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <svg
          className="mb-3 h-10 w-10 text-primary-300"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <p className="mb-1 text-sm font-medium text-primary-700">
          {isDragging ? 'Drop your file here' : 'Drag & drop a file here'}
        </p>
        <p className="text-xs text-primary-400">or click to browse</p>
        <p className="mt-2 text-xs text-primary-400">
          Supported: .xlsx, .csv
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.csv,.xls"
          onChange={handleFileInput}
        />
      </div>

      {parseError && (
        <div className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {parseError}
        </div>
      )}

      {/* Download template link */}
      <div className="mt-4 flex items-center justify-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadTemplate();
          }}
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Download Example Template (.xlsx)
        </button>
      </div>
    </div>
  );

  // ---- Step 2: Column mapping ----------------------------------------------

  const renderMappingStep = () => (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-primary-600">
            <span className="font-medium text-primary-800">{fileName}</span>
            {' \u2014 '}
            {rows.length} row{rows.length !== 1 ? 's' : ''} detected
          </p>
        </div>
        {!isTitleMapped && (
          <Badge variant="danger">Title mapping required</Badge>
        )}
      </div>

      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-400">
        Column Mappings
      </p>

      <div className="max-h-72 overflow-y-auto rounded-lg border border-primary-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary-100 bg-primary-50">
              <th className="px-4 py-2 text-left font-medium text-primary-600">
                Excel Column
              </th>
              <th className="px-4 py-2 text-left font-medium text-primary-600">
                Maps To
              </th>
              <th className="px-4 py-2 text-left font-medium text-primary-600">
                Sample Value
              </th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header) => {
              const currentMapping = mappings.find(
                (m) => m.excelColumn === header,
              );
              const sampleValue =
                rows.length > 0 ? rows[0][header] : null;

              return (
                <tr
                  key={header}
                  className="border-b border-primary-50 last:border-0"
                >
                  <td className="px-4 py-2 font-medium text-primary-800">
                    {header}
                  </td>
                  <td className="px-4 py-2">
                    <Select
                      options={FIELD_OPTIONS}
                      value={currentMapping?.artworkField ?? '_skip'}
                      onChange={(e) =>
                        handleMappingChange(header, e.target.value)
                      }
                      placeholder="Select field..."
                    />
                  </td>
                  <td className="px-4 py-2 text-primary-500">
                    {sampleValue != null
                      ? String(sampleValue).substring(0, 40)
                      : '\u2014'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between">
        <Button variant="outline" onClick={() => setStep('upload')}>
          Back
        </Button>
        <Button
          variant="primary"
          disabled={!isTitleMapped}
          onClick={() => setStep('preview')}
        >
          Next
        </Button>
      </div>
    </div>
  );

  // ---- Step 3: Preview & Validation ----------------------------------------

  const renderPreviewStep = () => {
    // Get mapped fields that are not skipped for table columns
    const activeFields = mappings.filter((m) => m.artworkField !== '_skip');
    const previewRows = mappedRows.slice(0, 10);

    return (
      <div>
        <div className="mb-4 flex items-center gap-3">
          <Badge variant="success">
            {validRowCount} row{validRowCount !== 1 ? 's' : ''} ready
          </Badge>
          {errorRowCount > 0 && (
            <Badge variant="danger">
              {errorRowCount} row{errorRowCount !== 1 ? 's' : ''} with errors
            </Badge>
          )}
        </div>

        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-400">
          Preview (first {Math.min(10, mappedRows.length)} rows)
        </p>

        <div className="max-h-72 overflow-auto rounded-lg border border-primary-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-primary-100 bg-primary-50">
                <th className="sticky left-0 z-10 bg-primary-50 px-3 py-2 text-left font-medium text-primary-600">
                  #
                </th>
                {activeFields.map((f) => {
                  const fieldDef = MAPPABLE_FIELDS.find(
                    (mf) => mf.value === f.artworkField,
                  );
                  return (
                    <th
                      key={f.excelColumn}
                      className="whitespace-nowrap px-3 py-2 text-left font-medium text-primary-600"
                    >
                      {fieldDef?.label ?? f.artworkField}
                    </th>
                  );
                })}
                <th className="px-3 py-2 text-left font-medium text-primary-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map(({ mapped, validation }, index) => (
                <tr
                  key={index}
                  className={`border-b border-primary-50 last:border-0 ${
                    !validation.valid ? 'bg-red-50/50' : ''
                  }`}
                >
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-2 font-medium text-primary-500">
                    {index + 1}
                  </td>
                  {activeFields.map((f) => {
                    const value = (mapped as Record<string, unknown>)[
                      f.artworkField
                    ];
                    return (
                      <td
                        key={f.excelColumn}
                        className="whitespace-nowrap px-3 py-2 text-primary-700"
                      >
                        {value != null
                          ? String(value).substring(0, 30)
                          : '\u2014'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2">
                    {validation.valid ? (
                      <Badge variant="success">OK</Badge>
                    ) : (
                      <span title={validation.errors.join('\n')}>
                        <Badge variant="danger">
                          {validation.errors.length} error
                          {validation.errors.length !== 1 ? 's' : ''}
                        </Badge>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Error details */}
        {errorRowCount > 0 && (
          <div className="mt-3 max-h-32 overflow-y-auto rounded-md bg-red-50 p-3">
            <p className="mb-1 text-xs font-semibold text-red-700">
              Validation Errors:
            </p>
            <ul className="space-y-0.5 text-xs text-red-600">
              {mappedRows
                .filter((r) => !r.validation.valid)
                .flatMap((r) => r.validation.errors)
                .slice(0, 20)
                .map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              {mappedRows
                .filter((r) => !r.validation.valid)
                .flatMap((r) => r.validation.errors).length > 20 && (
                <li className="font-medium">
                  ...and more errors not shown
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="mt-4 flex justify-between">
          <Button variant="outline" onClick={() => setStep('mapping')}>
            Back
          </Button>
          <Button
            variant="primary"
            disabled={validRowCount === 0}
            onClick={handleImport}
          >
            Import {validRowCount} Artwork{validRowCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    );
  };

  // ---- Step 4: Importing ---------------------------------------------------

  const renderImportingStep = () => {
    const percent =
      progress.total > 0
        ? Math.round((progress.completed / progress.total) * 100)
        : 0;
    const isComplete = progress.completed === progress.total;

    return (
      <div>
        <div className="mb-6 text-center">
          {isComplete ? (
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg
                className="h-7 w-7 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
          ) : (
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
              <svg
                className="h-7 w-7 animate-spin text-primary-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}

          <p className="text-sm font-medium text-primary-800">
            {isComplete
              ? 'Import Complete'
              : `Importing artwork ${progress.completed + 1} of ${progress.total}...`}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-primary-500">
            <span>
              {progress.completed} / {progress.total}
            </span>
            <span>{percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-primary-100">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Results summary */}
        {isComplete && (
          <div className="mb-4 flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {progress.successCount}
              </p>
              <p className="text-xs text-primary-500">Imported</p>
            </div>
            {progress.errorCount > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {progress.errorCount}
                </p>
                <p className="text-xs text-primary-500">Failed</p>
              </div>
            )}
          </div>
        )}

        {/* Import errors */}
        {progress.errors.length > 0 && (
          <div className="mb-4 max-h-32 overflow-y-auto rounded-md bg-red-50 p-3">
            <p className="mb-1 text-xs font-semibold text-red-700">Errors:</p>
            <ul className="space-y-0.5 text-xs text-red-600">
              {progress.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {isComplete && (
          <div className="flex justify-center">
            <Button variant="primary" onClick={handleDone}>
              Done
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ---- Main render ---------------------------------------------------------

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === 'importing' ? () => {} : handleClose}
      title={stepTitles[step]}
      size="xl"
    >
      {renderStepIndicator()}

      {step === 'upload' && renderUploadStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'importing' && renderImportingStep()}
    </Modal>
  );
}
