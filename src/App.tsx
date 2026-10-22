import React, { Suspense, Component, type ReactNode, type ErrorInfo } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PortfolioProvider } from './contexts/PortfolioContext';
import { ToastProvider } from './components/ui/Toast';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleGuard } from './components/auth/RoleGuard';
import { RouteErrorBoundary } from './components/ui/RouteErrorBoundary';
import { reportError } from './lib/monitoring';
import { AppLayout } from './components/layout/AppLayout';

// ---------------------------------------------------------------------------
class ChunkErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('Chunk load error:', error);
    reportError(error, { boundary: 'chunk' });
    // Guarded so a genuine network outage doesn't cause a reload loop.
    const isChunkError = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(error.message);
    const RELOAD_FLAG = 'chunk-reload-at';
    const lastReload = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
    if (isChunkError && Date.now() - lastReload > 30_000) {
      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4">
          <p className="text-sm text-primary-500">
            Failed to load page. Please check your connection.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary-900 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
const LoginPage = React.lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = React.lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const NotFoundPage = React.lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const ArtistsPage = React.lazy(() =>
  import('./pages/ArtistsPage').then((m) => ({ default: m.ArtistsPage })),
);
const ArtistDetailPage = React.lazy(() =>
  import('./pages/ArtistDetailPage').then((m) => ({ default: m.ArtistDetailPage })),
);
const GalleriesPage = React.lazy(() =>
  import('./pages/GalleriesPage').then((m) => ({ default: m.GalleriesPage })),
);
const GalleryCreatePage = React.lazy(() =>
  import('./pages/GalleryCreatePage').then((m) => ({ default: m.GalleryCreatePage })),
);
const GalleryDetailPage = React.lazy(() =>
  import('./pages/GalleryDetailPage').then((m) => ({ default: m.GalleryDetailPage })),
);
const GalleryEditPage = React.lazy(() =>
  import('./pages/GalleryEditPage').then((m) => ({ default: m.GalleryEditPage })),
);
const ArtworksPage = React.lazy(() =>
  import('./pages/ArtworksPage').then((m) => ({ default: m.ArtworksPage })),
);
const ArtworkCreatePage = React.lazy(() =>
  import('./pages/ArtworkCreatePage').then((m) => ({ default: m.ArtworkCreatePage })),
);
const ArtworkDetailPage = React.lazy(() =>
  import('./pages/ArtworkDetailPage').then((m) => ({ default: m.ArtworkDetailPage })),
);
const ArtworkEditPage = React.lazy(() =>
  import('./pages/ArtworkEditPage').then((m) => ({ default: m.ArtworkEditPage })),
);
const ContactsPage = React.lazy(() =>
  import('./pages/ContactsPage').then((m) => ({ default: m.ContactsPage })),
);
const ContactCreatePage = React.lazy(() =>
  import('./pages/ContactCreatePage').then((m) => ({ default: m.ContactCreatePage })),
);
const ContactDetailPage = React.lazy(() =>
  import('./pages/ContactDetailPage').then((m) => ({ default: m.ContactDetailPage })),
);
const ContactEditPage = React.lazy(() =>
  import('./pages/ContactEditPage').then((m) => ({ default: m.ContactEditPage })),
);
const DealsPage = React.lazy(() =>
  import('./pages/DealsPage').then((m) => ({ default: m.DealsPage })),
);
const SalesPage = React.lazy(() =>
  import('./pages/SalesPage').then((m) => ({ default: m.SalesPage })),
);
const InvoicesPage = React.lazy(() =>
  import('./pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage })),
);
const InvoiceCreatePage = React.lazy(() =>
  import('./pages/InvoiceCreatePage').then((m) => ({ default: m.InvoiceCreatePage })),
);
const InvoiceDetailPage = React.lazy(() =>
  import('./pages/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })),
);
const CertificatesPage = React.lazy(() =>
  import('./pages/CertificatesPage').then((m) => ({ default: m.CertificatesPage })),
);
const DeliveriesPage = React.lazy(() =>
  import('./pages/DeliveriesPage').then((m) => ({ default: m.DeliveriesPage })),
);
const DeliveryCreatePage = React.lazy(() =>
  import('./pages/DeliveryCreatePage').then((m) => ({ default: m.DeliveryCreatePage })),
);
const DeliveryDetailPage = React.lazy(() =>
  import('./pages/DeliveryDetailPage').then((m) => ({ default: m.DeliveryDetailPage })),
);
const PackingListsPage = React.lazy(() =>
  import('./pages/PackingListsPage').then((m) => ({ default: m.PackingListsPage })),
);
const PackingListCreatePage = React.lazy(() =>
  import('./pages/PackingListCreatePage').then((m) => ({ default: m.PackingListCreatePage })),
);
const PackingListDetailPage = React.lazy(() =>
  import('./pages/PackingListDetailPage').then((m) => ({ default: m.PackingListDetailPage })),
);
const ProductionOrdersPage = React.lazy(() =>
  import('./pages/ProductionOrdersPage').then((m) => ({ default: m.ProductionOrdersPage })),
);
const ProductionOrderCreatePage = React.lazy(() =>
  import('./pages/ProductionOrderCreatePage').then((m) => ({ default: m.ProductionOrderCreatePage })),
);
const ProductionOrderDetailPage = React.lazy(() =>
  import('./pages/ProductionOrderDetailPage').then((m) => ({ default: m.ProductionOrderDetailPage })),
);
const ProductionRequestsPage = React.lazy(() =>
  import('./pages/ProductionRequestsPage').then((m) => ({ default: m.ProductionRequestsPage })),
);
const ProductionRequestCreatePage = React.lazy(() =>
  import('./pages/ProductionRequestCreatePage').then((m) => ({ default: m.ProductionRequestCreatePage })),
);
const GalleryForwardingOrdersPage = React.lazy(() =>
  import('./pages/GalleryForwardingOrdersPage').then((m) => ({ default: m.GalleryForwardingOrdersPage })),
);
const GalleryForwardingCreatePage = React.lazy(() =>
  import('./pages/GalleryForwardingCreatePage').then((m) => ({ default: m.GalleryForwardingCreatePage })),
);
const GalleryForwardingDetailPage = React.lazy(() =>
  import('./pages/GalleryForwardingDetailPage').then((m) => ({ default: m.GalleryForwardingDetailPage })),
);
const CataloguesPage = React.lazy(() =>
  import('./pages/CataloguesPage').then((m) => ({ default: m.CataloguesPage })),
);
const AnalyticsPage = React.lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);
const SettingsPage = React.lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const MediaLibraryPage = React.lazy(() =>
  import('./pages/MediaLibraryPage').then((m) => ({ default: m.MediaLibraryPage })),
);
const CVEditorPage = React.lazy(() =>
  import('./pages/CVEditorPage').then((m) => ({ default: m.CVEditorPage })),
);
const PublicCollectionsPage = React.lazy(() =>
  import('./pages/PublicCollectionsPage').then((m) => ({ default: m.PublicCollectionsPage })),
);
const EnquiriesPage = React.lazy(() =>
  import('./pages/EnquiriesPage').then((m) => ({ default: m.EnquiriesPage })),
);
const EnquiryDetailPage = React.lazy(() =>
  import('./pages/EnquiryDetailPage').then((m) => ({ default: m.EnquiryDetailPage })),
);
const AnnualSchedulePage = React.lazy(() =>
  import('./pages/AnnualSchedulePage').then((m) => ({ default: m.AnnualSchedulePage })),
);
const ProjectsPage = React.lazy(() =>
  import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
);
const ProjectDetailPage = React.lazy(() =>
  import('./pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })),
);
const ExhibitionsPage = React.lazy(() =>
  import('./pages/ExhibitionsPage').then((m) => ({ default: m.ExhibitionsPage })),
);
const ExhibitionDetailPage = React.lazy(() =>
  import('./pages/ExhibitionDetailPage').then((m) => ({ default: m.ExhibitionDetailPage })),
);
const PriceManagementPage = React.lazy(() =>
  import('./pages/PriceManagementPage').then((m) => ({ default: m.PriceManagementPage })),
);
const AuctionTrackingPage = React.lazy(() =>
  import('./pages/AuctionTrackingPage').then((m) => ({ default: m.AuctionTrackingPage })),
);
const MonthlyReportPage = React.lazy(() =>
  import('./pages/analytics/MonthlyReportPage').then((m) => ({ default: m.MonthlyReportPage })),
);
const SocialMediaPage = React.lazy(() =>
  import('./pages/SocialMediaPage').then((m) => ({ default: m.SocialMediaPage })),
);
const LiquidityPlanningPage = React.lazy(() =>
  import('./pages/LiquidityPlanningPage').then((m) => ({ default: m.LiquidityPlanningPage })),
);
const PublicationBudgetPage = React.lazy(() =>
  import('./pages/PublicationBudgetPage').then((m) => ({ default: m.PublicationBudgetPage })),
);
const AnlageverwaltungPage = React.lazy(() =>
  import('./pages/AnlageverwaltungPage').then((m) => ({ default: m.AnlageverwaltungPage })),
);
// Consolidated dashboards
const PortfolioOverviewPage = React.lazy(() =>
  import('./pages/analytics/PortfolioOverviewPage').then((m) => ({ default: m.PortfolioOverviewPage })),
);
const RevenuePricingPage = React.lazy(() =>
  import('./pages/analytics/RevenuePricingPage').then((m) => ({ default: m.RevenuePricingPage })),
);
const GalleryIntelligencePage = React.lazy(() =>
  import('./pages/analytics/GalleryIntelligencePage').then((m) => ({ default: m.GalleryIntelligencePage })),
);
const CollectorSalesPage = React.lazy(() =>
  import('./pages/analytics/CollectorSalesPage').then((m) => ({ default: m.CollectorSalesPage })),
);
const MarketAuctionPage = React.lazy(() =>
  import('./pages/analytics/MarketAuctionPage').then((m) => ({ default: m.MarketAuctionPage })),
);
const ExhibitionCareerPage = React.lazy(() =>
  import('./pages/analytics/ExhibitionCareerPage').then((m) => ({ default: m.ExhibitionCareerPage })),
);
const SeriesArtworkPage = React.lazy(() =>
  import('./pages/analytics/SeriesArtworkPage').then((m) => ({ default: m.SeriesArtworkPage })),
);

// ---------------------------------------------------------------------------
function SuspenseFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

/** Wraps lazy-loaded pages with chunk error boundary, route error boundary, and suspense */
function LazyPage({ children }: { children: ReactNode }) {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<SuspenseFallback />}>
        <RouteErrorBoundary>{children}</RouteErrorBoundary>
      </Suspense>
    </ChunkErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
const router = createBrowserRouter(
  [
    // Public: Login
    {
      path: '/login',
      element: (
        <Suspense fallback={<SuspenseFallback />}>
          <LoginPage />
        </Suspense>
      ),
    },

    // Protected: Main app
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><DashboardPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },

        // Artworks (admin only)
        {
          path: 'artworks',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ArtworksPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'artworks/new',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ArtworkCreatePage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'artworks/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ArtworkDetailPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'artworks/:id/edit',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ArtworkEditPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Galleries (admin only)
        {
          path: 'artists',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ArtistsPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'artists/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ArtistDetailPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'galleries',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><GalleriesPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'galleries/new',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><GalleryCreatePage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'galleries/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><GalleryDetailPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'galleries/:id/edit',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><GalleryEditPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Public Collections
        {
          path: 'collections',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><PublicCollectionsPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },

        // Deliveries (admin only)
        {
          path: 'deliveries',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><DeliveriesPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'deliveries/new',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><DeliveryCreatePage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'deliveries/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><DeliveryDetailPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Packing Lists (admin only)
        {
          path: 'packing-lists',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><PackingListsPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'packing-lists/new',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><PackingListCreatePage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'packing-lists/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><PackingListDetailPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Production (admin only)
        {
          path: 'production',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ProductionOrdersPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'production/new',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ProductionOrderCreatePage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'production/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ProductionOrderDetailPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Production Requests (admin only)
        {
          path: 'production-requests',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ProductionRequestsPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'production-requests/new',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ProductionRequestCreatePage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Gallery Forwarding (admin only)
        {
          path: 'forwarding',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><GalleryForwardingOrdersPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'forwarding/new',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><GalleryForwardingCreatePage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'forwarding/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><GalleryForwardingDetailPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Certificates (admin only)
        {
          path: 'certificates',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><CertificatesPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Sales (admin only)
        {
          path: 'sales',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><SalesPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Contacts (admin only)
        {
          path: 'contacts',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ContactsPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'contacts/new',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ContactCreatePage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'contacts/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ContactDetailPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'contacts/:id/edit',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ContactEditPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Deals (admin only)
        {
          path: 'deals',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><DealsPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Invoices (admin only)
        {
          path: 'invoices',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><InvoicesPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'invoices/new',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><InvoiceCreatePage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'invoices/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><InvoiceDetailPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Catalogues (admin only)
        {
          path: 'catalogues',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><CataloguesPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Analytics (admin only)
        {
          path: 'analytics',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><AnalyticsPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/monthly-report',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><MonthlyReportPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },

        // ---- Consolidated Analytics Dashboards ----
        {
          path: 'analytics/portfolio',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><PortfolioOverviewPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/revenue',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><RevenuePricingPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/galleries',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><GalleryIntelligencePage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/collectors',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><CollectorSalesPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/market',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><MarketAuctionPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/exhibitions',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ExhibitionCareerPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/series',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><SeriesArtworkPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Publication Budget (admin only)
        {
          path: 'publication-budget',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><PublicationBudgetPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },

        // Liquidity Planning (admin only)
        {
          path: 'liquidity',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><LiquidityPlanningPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },
        // Social Media Tracker (admin only)
        {
          path: 'social-media',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><SocialMediaPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },
        // Anlageverwaltung — NOA Collection (admin only)
        {
          path: 'anlageverwaltung',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><AnlageverwaltungPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },

        // Settings (admin only)
        {
          path: 'settings',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><SettingsPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },

        // Enquiries (admin only)
        {
          path: 'enquiries',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><EnquiriesPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'enquiries/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><EnquiryDetailPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },

        // Market Intelligence (admin only)
        {
          path: 'schedule',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><AnnualSchedulePage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'projects',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><ProjectsPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'projects/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><ProjectDetailPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'exhibitions',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><ExhibitionsPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'exhibitions/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><ExhibitionDetailPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'price-management',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><PriceManagementPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'auction-tracking',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><AuctionTrackingPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },

        // Admin routes
        {
          path: 'media',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><MediaLibraryPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'cv',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RouteErrorBoundary><CVEditorPage />
              </RouteErrorBoundary></Suspense>
            </RoleGuard>
          ),
        },

        // 404 catch-all within protected area
        {
          path: '*',
          element: (
            <Suspense fallback={<SuspenseFallback />}>
              <NotFoundPage />
            </Suspense>
          ),
        },
      ],
    },

  ],
  {
    basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
  },
);

// ---------------------------------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <PortfolioProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </PortfolioProvider>
    </AuthProvider>
  );
}
