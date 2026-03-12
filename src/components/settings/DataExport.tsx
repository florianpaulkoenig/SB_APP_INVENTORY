import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { sanitizeFilterTerm, downloadBlob } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Select, type SelectOption } from '../ui/Select';
import { useToast } from '../ui/Toast';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABLE_OPTIONS: SelectOption[] = [
  { value: 'artworks', label: 'Artworks' },
  { value: 'galleries', label: 'Galleries' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'sales', label: 'Sales' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'deliveries', label: 'Deliveries' },
  { value: 'certificates', label: 'Certificates' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'exhibitions', label: 'Exhibitions' },
  { value: 'loans', label: 'Loans' },
  { value: 'condition_reports', label: 'Condition Reports' },
];

const FORMAT_OPTIONS: SelectOption[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);

  const escapeValue = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.join(',');
  const rows = data.map((row) =>
    headers.map((header) => escapeValue(row[header])).join(','),
  );

  return [headerRow, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataExport() {
  const { toast } = useToast();
  const { role } = useAuth();

  const [selectedTable, setSelectedTable] = useState('artworks');
  const [format, setFormat] = useState('csv');
  const [filter, setFilter] = useState('');
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (role !== 'admin') {
      toast({
        title: 'Access denied',
        description: 'Only administrators can export data.',
        variant: 'error',
      });
      return;
    }

    setExporting(true);

    try {
      let query = supabase.from(selectedTable as never).select('*').limit(10000);

      // Apply a simple ilike filter across common text columns if provided
      if (filter.trim()) {
        const safeFilter = sanitizeFilterTerm(filter);
        if (!safeFilter) {
          toast({
            title: 'Invalid filter',
            description: 'The filter term contains invalid characters.',
            variant: 'error',
          });
          setExporting(false);
          return;
        }
        query = query.or(
          `name.ilike.%${safeFilter}%,status.ilike.%${safeFilter}%`,
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: 'No data found',
          description: `The "${selectedTable}" table returned no rows.`,
          variant: 'info',
        });
        return;
      }

      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'csv') {
        content = convertToCSV(data as Record<string, unknown>[]);
        mimeType = 'text/csv;charset=utf-8;';
        extension = 'csv';
      } else {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json;charset=utf-8;';
        extension = 'json';
      }

      const blob = new Blob([content], { type: mimeType });
      downloadBlob(blob, `${selectedTable}_export.${extension}`);

      toast({
        title: 'Export successful',
        description: `${data.length} rows exported as ${extension.toUpperCase()}.`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Export failed',
        description: 'An error occurred. Please try again.',
        variant: 'error',
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-6">
      {/* Header */}
      <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
        Data Export
      </h2>

      <div className="space-y-4">
        {/* Table selector */}
        <Select
          label="Table"
          options={TABLE_OPTIONS}
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
        />

        {/* Format selector */}
        <Select
          label="Format"
          options={FORMAT_OPTIONS}
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        />

        {/* Optional filter */}
        <div className="w-full">
          <label
            htmlFor="export-filter"
            className="mb-1 block text-sm font-medium text-primary-700"
          >
            Filter (optional)
          </label>
          <input
            id="export-filter"
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="e.g. gallery name or status"
            className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 transition-colors focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
        </div>

        {/* Export button */}
        <div className="pt-2">
          <Button onClick={handleExport} loading={exporting}>
            Export
          </Button>
        </div>
      </div>
    </section>
  );
}
