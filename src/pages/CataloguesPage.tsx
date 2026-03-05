// ---------------------------------------------------------------------------
// NOA Inventory -- Catalogues Page
// On-the-fly catalogue generation (not stored). Uses CatalogueBuilder.
// ---------------------------------------------------------------------------

import { CatalogueBuilder } from '../components/catalogues/CatalogueBuilder';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CataloguesPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Catalogues
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Build and generate PDF catalogues from your artwork inventory.
          </p>
        </div>
      </div>

      {/* Builder */}
      <CatalogueBuilder />
    </div>
  );
}
