import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoices } from '../hooks/useInvoices';
import { useDocumentNumber } from '../hooks/useDocumentNumber';
import { InvoiceForm } from '../components/invoices/InvoiceForm';
import { Button } from '../components/ui/Button';
import type { InvoiceInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function InvoiceCreatePage() {
  const navigate = useNavigate();
  const { createInvoice } = useInvoices();
  const { generateNumber } = useDocumentNumber();

  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // ---- Auto-generate invoice number on mount ------------------------------

  useEffect(() => {
    async function generate() {
      const num = await generateNumber('INV');
      if (num) {
        setInvoiceNumber(num);
      }
    }

    generate();
  }, [generateNumber]);

  // ---- Submit handler -----------------------------------------------------

  async function handleSubmit(data: InvoiceInsert) {
    setLoading(true);

    const created = await createInvoice({
      ...data,
      invoice_number: invoiceNumber || data.invoice_number,
    });

    setLoading(false);

    if (created) {
      navigate(`/invoices/${created.id}`);
    }
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/invoices')}
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
          Back to Invoices
        </Button>

        <h1 className="font-display text-2xl font-bold text-primary-900">
          New Invoice
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Create a new invoice for artwork sales.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl rounded-lg border border-primary-100 bg-white p-6">
        <InvoiceForm
          invoiceNumber={invoiceNumber}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/invoices')}
          loading={loading}
        />
      </div>
    </div>
  );
}
