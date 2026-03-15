// ---------------------------------------------------------------------------
// NOA Inventory -- Excel Import Utilities
// ---------------------------------------------------------------------------

// exceljs is loaded dynamically to keep the main bundle light
import type {
  ArtworkInsert,
  ArtworkStatus,
  ArtworkCategory,
  ArtworkMotif,
  ArtworkSeries,
  ArtworkColor,
  EditionType,
  Currency,
  DimensionUnit,
} from '../types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExcelRow {
  [key: string]: string | number | null | undefined;
}

export interface ColumnMapping {
  excelColumn: string;
  artworkField: string;
}

export interface ParseResult {
  headers: string[];
  rows: ExcelRow[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Mappable fields -- used to populate column-mapping dropdowns
// ---------------------------------------------------------------------------

export const MAPPABLE_FIELDS = [
  { value: 'title', label: 'Title', required: true },
  { value: 'medium', label: 'Medium' },
  { value: 'year', label: 'Year' },
  { value: 'height', label: 'Height' },
  { value: 'width', label: 'Width' },
  { value: 'depth', label: 'Depth' },
  { value: 'dimension_unit', label: 'Dimension Unit' },
  { value: 'framed_height', label: 'Framed Height' },
  { value: 'framed_width', label: 'Framed Width' },
  { value: 'framed_depth', label: 'Framed Depth' },
  { value: 'weight', label: 'Weight' },
  { value: 'edition_type', label: 'Edition Type' },
  { value: 'edition_number', label: 'Edition Number' },
  { value: 'edition_total', label: 'Edition Total' },
  { value: 'price', label: 'Price' },
  { value: 'currency', label: 'Currency' },
  { value: 'status', label: 'Status' },
  { value: 'current_location', label: 'Current Location' },
  { value: 'category', label: 'Category' },
  { value: 'motif', label: 'Motif' },
  { value: 'series', label: 'Series' },
  { value: 'color', label: 'Color' },
  { value: 'notes', label: 'Notes' },
  { value: '_skip', label: '-- Skip Column --' },
] as const;

// ---------------------------------------------------------------------------
// Allowed enum values (used for validation)
// ---------------------------------------------------------------------------

const VALID_STATUSES: ArtworkStatus[] = [
  'available',
  'sold',
  'reserved',
  'in_production',
  'in_transit',
  'on_consignment',
];

const VALID_CATEGORIES: ArtworkCategory[] = [
  'painting',
  'sculpture',
  'drawing',
  'mixed_media',
  'print',
  'photography',
  'installation',
  'digital',
  'other',
];

const VALID_MOTIFS: ArtworkMotif[] = [
  'portrait',
  'landscape',
  'abstract',
  'figurative',
  'still_life',
  'architectural',
  'conceptual',
  'other',
];

const VALID_SERIES: ArtworkSeries[] = [
  'animal',
  'untitled_portrait',
  'specific_portrait',
  'god',
  'personal_commission',
  'landscape',
  'abstract',
  'figurative',
  'skull',
  'sphere',
  'half_sphere',
  'other',
];

const VALID_COLORS: ArtworkColor[] = [
  'green',
  'red',
  'white',
  'silver',
  'dark_grey',
  'other',
];

const VALID_EDITION_TYPES: EditionType[] = [
  'unique',
  'numbered',
  'AP',
  'HC',
  'EA',
];

const VALID_CURRENCIES: Currency[] = ['EUR', 'USD', 'CHF', 'GBP'];

const VALID_DIMENSION_UNITS: DimensionUnit[] = ['cm', 'inches'];

// ---------------------------------------------------------------------------
// Numeric artwork fields
// ---------------------------------------------------------------------------

const NUMERIC_FIELDS = new Set([
  'year',
  'height',
  'width',
  'depth',
  'framed_height',
  'framed_width',
  'framed_depth',
  'weight',
  'edition_number',
  'edition_total',
  'price',
]);

// ---------------------------------------------------------------------------
// parseExcelFile -- Read an .xlsx / .csv file and return headers + rows
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit to mitigate DoS via large files
const MAX_ROWS = 5000; // Prevent excessive memory usage

export async function parseExcelFile(file: File): Promise<ParseResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed is 10 MB.`);
  }

  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  const buffer = await file.arrayBuffer();
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (ext === '.csv') {
    await workbook.csv.load(buffer);
  } else {
    await workbook.xlsx.load(buffer);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    throw new Error('No sheets found in the file');
  }

  // First row = headers
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim();
  });

  if (headers.length === 0) {
    throw new Error('The spreadsheet is empty');
  }

  const dataRowCount = worksheet.rowCount - 1;
  if (dataRowCount > MAX_ROWS) {
    throw new Error(`Too many rows (${dataRowCount}). Maximum allowed is ${MAX_ROWS}.`);
  }

  const rows: ExcelRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header row
    const rowData: ExcelRow = {};
    headers.forEach((header, idx) => {
      const cell = row.getCell(idx + 1);
      const val = cell.value;
      if (val === null || val === undefined) {
        rowData[header] = null;
      } else if (typeof val === 'object' && 'result' in (val as Record<string, unknown>)) {
        // Formula cell — use the computed result
        rowData[header] = (val as { result: string | number }).result;
      } else if (val instanceof Date) {
        rowData[header] = val.toISOString().split('T')[0];
      } else {
        rowData[header] = typeof val === 'number' ? val : String(val);
      }
    });
    rows.push(rowData);
  });

  if (rows.length === 0) {
    throw new Error('The spreadsheet is empty');
  }

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// mapRowToArtwork -- Convert a raw Excel row to a partial ArtworkInsert
// ---------------------------------------------------------------------------

export function mapRowToArtwork(
  row: ExcelRow,
  mappings: ColumnMapping[],
): Partial<ArtworkInsert> {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    if (mapping.artworkField === '_skip') continue;

    const rawValue = row[mapping.excelColumn];

    if (rawValue === null || rawValue === undefined || rawValue === '') {
      continue;
    }

    const field = mapping.artworkField;

    // Handle numeric fields
    if (NUMERIC_FIELDS.has(field)) {
      const num = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (!isNaN(num)) {
        result[field] = field === 'year' ? Math.round(num) : num;
      }
      continue;
    }

    // Handle enum fields with validation
    const strValue = String(rawValue).trim();

    if (field === 'status') {
      const lower = strValue.toLowerCase();
      if (VALID_STATUSES.includes(lower as ArtworkStatus)) {
        result[field] = lower;
      }
    } else if (field === 'category') {
      const lower = strValue.toLowerCase().replace(/\s+/g, '_');
      if (VALID_CATEGORIES.includes(lower as ArtworkCategory)) {
        result[field] = lower;
      }
    } else if (field === 'motif') {
      const lower = strValue.toLowerCase().replace(/\s+/g, '_');
      if (VALID_MOTIFS.includes(lower as ArtworkMotif)) {
        result[field] = lower;
      }
    } else if (field === 'series') {
      const lower = strValue.toLowerCase().replace(/\s+/g, '_');
      if (VALID_SERIES.includes(lower as ArtworkSeries)) {
        result[field] = lower;
      }
    } else if (field === 'color') {
      const lower = strValue.toLowerCase().replace(/\s+/g, '_');
      if (VALID_COLORS.includes(lower as ArtworkColor)) {
        result[field] = lower;
      }
    } else if (field === 'edition_type') {
      // Edition type is case-sensitive for AP, HC, EA
      const matched =
        VALID_EDITION_TYPES.find(
          (t) => t.toLowerCase() === strValue.toLowerCase(),
        ) ?? null;
      if (matched) {
        result[field] = matched;
      }
    } else if (field === 'currency') {
      const upper = strValue.toUpperCase();
      if (VALID_CURRENCIES.includes(upper as Currency)) {
        result[field] = upper;
      }
    } else if (field === 'dimension_unit') {
      const lower = strValue.toLowerCase();
      if (VALID_DIMENSION_UNITS.includes(lower as DimensionUnit)) {
        result[field] = lower;
      }
    } else {
      // Text fields: title, medium, current_location, notes
      result[field] = strValue;
    }
  }

  return result as Partial<ArtworkInsert>;
}

// ---------------------------------------------------------------------------
// validateImportRow -- Check that a mapped row has all required fields
// ---------------------------------------------------------------------------

export function validateImportRow(
  data: Partial<ArtworkInsert>,
  rowIndex: number,
): ValidationResult {
  const errors: string[] = [];
  const rowLabel = `Row ${rowIndex + 1}`;

  // Title is required
  if (!data.title || String(data.title).trim() === '') {
    errors.push(`${rowLabel}: Title is required`);
  }

  // Validate numeric fields
  for (const field of NUMERIC_FIELDS) {
    const value = (data as Record<string, unknown>)[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`${rowLabel}: ${field} must be a valid number`);
      } else if (field === 'year' && (value < 1000 || value > 9999)) {
        errors.push(`${rowLabel}: Year must be a 4-digit number`);
      } else if (field !== 'year' && value < 0) {
        errors.push(`${rowLabel}: ${field} must be a positive number`);
      }
    }
  }

  // Validate enum fields
  if (
    data.status &&
    !VALID_STATUSES.includes(data.status)
  ) {
    errors.push(`${rowLabel}: Invalid status "${data.status}"`);
  }

  if (
    data.category &&
    !VALID_CATEGORIES.includes(data.category)
  ) {
    errors.push(`${rowLabel}: Invalid category "${data.category}"`);
  }

  if (
    data.motif &&
    !VALID_MOTIFS.includes(data.motif)
  ) {
    errors.push(`${rowLabel}: Invalid motif "${data.motif}"`);
  }

  if (
    data.series &&
    !VALID_SERIES.includes(data.series)
  ) {
    errors.push(`${rowLabel}: Invalid series "${data.series}"`);
  }

  if (
    data.color &&
    !VALID_COLORS.includes(data.color as ArtworkColor)
  ) {
    errors.push(`${rowLabel}: Invalid color "${data.color}"`);
  }

  if (
    data.edition_type &&
    !VALID_EDITION_TYPES.includes(data.edition_type)
  ) {
    errors.push(`${rowLabel}: Invalid edition type "${data.edition_type}"`);
  }

  if (
    data.currency &&
    !VALID_CURRENCIES.includes(data.currency)
  ) {
    errors.push(`${rowLabel}: Invalid currency "${data.currency}"`);
  }

  if (
    data.dimension_unit &&
    !VALID_DIMENSION_UNITS.includes(data.dimension_unit)
  ) {
    errors.push(
      `${rowLabel}: Invalid dimension unit "${data.dimension_unit}"`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// autoDetectMappings -- Try to match Excel headers to artwork fields
// ---------------------------------------------------------------------------

export function autoDetectMappings(headers: string[]): ColumnMapping[] {
  const fieldAliases: Record<string, string[]> = {
    title: ['title', 'name', 'artwork', 'artwork title', 'work title', 'piece'],
    medium: ['medium', 'material', 'technique', 'media'],
    year: ['year', 'date', 'created', 'creation year'],
    height: ['height', 'h', 'ht'],
    width: ['width', 'w', 'wd'],
    depth: ['depth', 'd', 'dp'],
    dimension_unit: ['unit', 'dimension unit', 'dim unit', 'measurement'],
    framed_height: ['framed height', 'frame height', 'framed h'],
    framed_width: ['framed width', 'frame width', 'framed w'],
    framed_depth: ['framed depth', 'frame depth', 'framed d'],
    weight: ['weight', 'wt', 'mass'],
    edition_type: ['edition type', 'edition', 'ed type'],
    edition_number: ['edition number', 'ed number', 'ed no', 'ed #'],
    edition_total: ['edition total', 'ed total', 'total edition', 'ed size'],
    price: ['price', 'cost', 'amount', 'value', 'retail price'],
    currency: ['currency', 'curr', 'ccy'],
    status: ['status', 'availability', 'state'],
    current_location: ['location', 'current location', 'place', 'stored at', 'storage'],
    category: ['category', 'type', 'art type', 'genre'],
    motif: ['motif', 'subject', 'theme'],
    series: ['series', 'collection', 'group'],
    color: ['color', 'colour', 'farbe'],
    notes: ['notes', 'note', 'comments', 'comment', 'remarks', 'description'],
  };

  return headers.map((header) => {
    const normalizedHeader = header.toLowerCase().trim().replace(/[_-]/g, ' ');

    // Exact match first, then substring match
    for (const [field, aliases] of Object.entries(fieldAliases)) {
      for (const alias of aliases) {
        if (normalizedHeader === alias) {
          return { excelColumn: header, artworkField: field };
        }
      }
    }

    // Fuzzy / substring match
    for (const [field, aliases] of Object.entries(fieldAliases)) {
      for (const alias of aliases) {
        if (
          normalizedHeader.includes(alias) ||
          alias.includes(normalizedHeader)
        ) {
          return { excelColumn: header, artworkField: field };
        }
      }
    }

    return { excelColumn: header, artworkField: '_skip' };
  });
}
