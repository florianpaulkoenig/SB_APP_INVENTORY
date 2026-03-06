import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArtworks } from '../hooks/useArtworks';
import { useDocumentNumber } from '../hooks/useDocumentNumber';
import { useArtworkTemplates } from '../hooks/useArtworkTemplates';
import { ArtworkForm } from '../components/artworks/ArtworkForm';
import { ArtworkTemplateManager } from '../components/artworks/ArtworkTemplateManager';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { generateArtworkRefCode } from '../lib/utils';
import { DOC_PREFIXES } from '../lib/constants';
import type { ArtworkInsert, ArtworkTemplateRow } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ArtworkCreatePage() {
  const navigate = useNavigate();
  const { createArtwork } = useArtworks();
  const { generateNumber } = useDocumentNumber();
  const { templates } = useArtworkTemplates();

  const [loading, setLoading] = useState(false);
  const [inventoryNumber, setInventoryNumber] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ArtworkTemplateRow | null>(null);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // ---- Auto-generate inventory number & reference code on mount -----------

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const [invNumber, refCode] = await Promise.all([
        generateNumber(DOC_PREFIXES.artwork),
        Promise.resolve(generateArtworkRefCode()),
      ]);

      if (!cancelled) {
        setInventoryNumber(invNumber);
        setReferenceCode(refCode);
        setInitializing(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [generateNumber]);

  // ---- Submit handler -----------------------------------------------------

  async function handleSubmit(data: ArtworkInsert) {
    setLoading(true);
    const created = await createArtwork({
      ...data,
      inventory_number: inventoryNumber ?? data.inventory_number,
      reference_code: referenceCode ?? data.reference_code,
    });
    setLoading(false);

    if (created) {
      navigate(`/artworks/${created.id}`);
    }
  }

  // ---- Loading state while generating IDs ---------------------------------

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---- Template selection ---------------------------------------------------

  function handleTemplateChange(templateId: string) {
    if (!templateId) {
      setSelectedTemplate(null);
      setFormKey((k) => k + 1);
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setFormKey((k) => k + 1);
    }
  }

  /** Convert template to partial ArtworkInsert for form pre-filling */
  function templateToDefaultValues(template: ArtworkTemplateRow): Partial<ArtworkInsert> {
    return {
      medium: template.medium,
      height: template.height,
      width: template.width,
      depth: template.depth,
      dimension_unit: template.dimension_unit,
      framed_height: template.framed_height,
      framed_width: template.framed_width,
      framed_depth: template.framed_depth,
      weight: template.weight,
      edition_type: template.edition_type,
      price: template.price,
      currency: template.currency,
      category: template.category,
      motif: template.motif,
      series: template.series,
    };
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/artworks')}
          className="mb-4"
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
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Artworks
        </Button>

        <h1 className="font-display text-2xl font-bold text-primary-900">
          New Artwork
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Add a new artwork to your inventory.
        </p>
      </div>

      {/* Template picker */}
      <div className="mx-auto max-w-3xl mb-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Select
              label="Use Template"
              options={templates.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
              value={selectedTemplate?.id ?? ''}
              onChange={(e) => handleTemplateChange(e.target.value)}
              placeholder="No template (blank form)"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateManagerOpen(true)}
            title="Manage templates"
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
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Manage
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl rounded-lg border border-primary-100 bg-white p-6">
        <ArtworkForm
          key={formKey}
          inventoryNumber={inventoryNumber ?? undefined}
          referenceCode={referenceCode ?? undefined}
          defaultValues={selectedTemplate ? templateToDefaultValues(selectedTemplate) : undefined}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/artworks')}
          loading={loading}
        />
      </div>

      {/* Template Manager Modal */}
      <ArtworkTemplateManager
        isOpen={templateManagerOpen}
        onClose={() => setTemplateManagerOpen(false)}
      />
    </div>
  );
}
