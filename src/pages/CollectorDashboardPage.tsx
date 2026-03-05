// ---------------------------------------------------------------------------
// NOA Inventory -- Collector Dashboard Page
// Dashboard view for collector-role users showing their purchased artworks.
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { ArtworkRow, SaleRow, ContactRow, CertificateRow } from '../types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SaleWithArtwork extends SaleRow {
  artworks: ArtworkRow | null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CollectorDashboardPage() {
  const { profile } = useAuth();

  const [contact, setContact] = useState<ContactRow | null>(null);
  const [sales, setSales] = useState<SaleWithArtwork[]>([]);
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const contactId = profile?.contact_id;

  // ---- Fetch data ---------------------------------------------------------

  useEffect(() => {
    if (!contactId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);

      // Fetch contact details
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId!)
        .single();

      if (contactData) setContact(contactData as ContactRow);

      // Fetch sales with joined artworks
      const { data: salesData } = await supabase
        .from('sales')
        .select('*, artworks(*)')
        .eq('contact_id', contactId!)
        .order('sale_date', { ascending: false });

      if (salesData) setSales(salesData as SaleWithArtwork[]);

      // Fetch certificates for artworks owned by this collector
      const artworkIds = (salesData as SaleWithArtwork[] | null)
        ?.map((s) => s.artwork_id)
        .filter(Boolean) ?? [];

      if (artworkIds.length > 0) {
        const { data: certData } = await supabase
          .from('certificates')
          .select('*')
          .in('artwork_id', artworkIds);

        if (certData) setCertificates(certData as CertificateRow[]);
      }

      setLoading(false);
    }

    fetchData();
  }, [contactId]);

  // ---- Derived stats ------------------------------------------------------

  const totalOwned = sales.length;
  const totalCertificates = certificates.length;
  const recentPurchases = sales.slice(0, 6);

  const collectorName = contact
    ? `${contact.first_name} ${contact.last_name}`
    : 'Collector';

  // ---- Render: no contact_id configured -----------------------------------

  if (!loading && !contactId) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-primary-900">
            My Collection
          </h1>
        </div>
        <EmptyState
          icon={
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          }
          title="Your collector profile is not configured yet"
          description="Please contact an administrator to link your account to a collector profile."
        />
      </div>
    );
  }

  // ---- Render: loading ----------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---- Render: dashboard --------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-primary-900">
          My Collection
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          {collectorName}
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-primary-100 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
            Total Owned Artworks
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-primary-900">
            {totalOwned}
          </p>
        </div>

        <div className="rounded-lg border border-primary-100 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
            Total Certificates
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-primary-900">
            {totalCertificates}
          </p>
        </div>
      </div>

      {/* Recent purchases */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-primary-900">
          Recent Purchases
        </h2>
        {certificates.length > 0 && (
          <Link to="/collector/certificates">
            <Button variant="ghost" size="sm">
              View Certificates
            </Button>
          </Link>
        )}
      </div>

      {recentPurchases.length === 0 ? (
        <EmptyState
          title="No purchases yet"
          description="Your purchased artworks will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentPurchases.map((sale) => (
            <Card key={sale.id} className="overflow-hidden">
              {/* Image placeholder */}
              <div className="flex h-40 items-center justify-center bg-primary-50">
                <svg
                  className="h-10 w-10 text-primary-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z"
                  />
                </svg>
              </div>

              {/* Card body */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-primary-900 truncate">
                  {sale.artworks?.title ?? 'Untitled'}
                </h3>
                <p className="mt-1 text-xs text-primary-400">
                  {sale.artworks?.year ?? '\u2014'}
                  {sale.artworks?.medium ? ` \u00B7 ${sale.artworks.medium}` : ''}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
