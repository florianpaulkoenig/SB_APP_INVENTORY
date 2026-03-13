import React, { Suspense, Component, type ReactNode, type ErrorInfo } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleGuard } from './components/auth/RoleGuard';
import { AppLayout } from './components/layout/AppLayout';

// ---------------------------------------------------------------------------
// Error boundary for lazy-loaded chunks that fail to load
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
// Lazy-loaded pages (code splitting)
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
const GalleryForwardingOrdersPage = React.lazy(() =>
  import('./pages/GalleryForwardingOrdersPage').then((m) => ({ default: m.GalleryForwardingOrdersPage })),
);
const GalleryForwardingCreatePage = React.lazy(() =>
  import('./pages/GalleryForwardingCreatePage').then((m) => ({ default: m.GalleryForwardingCreatePage })),
);
const GalleryForwardingDetailPage = React.lazy(() =>
  import('./pages/GalleryForwardingDetailPage').then((m) => ({ default: m.GalleryForwardingDetailPage })),
);
const EmailLogPage = React.lazy(() =>
  import('./pages/EmailLogPage').then((m) => ({ default: m.EmailLogPage })),
);
const CataloguesPage = React.lazy(() =>
  import('./pages/CataloguesPage').then((m) => ({ default: m.CataloguesPage })),
);
const SharingPage = React.lazy(() =>
  import('./pages/SharingPage').then((m) => ({ default: m.SharingPage })),
);
const SharePage = React.lazy(() =>
  import('./pages/SharePage').then((m) => ({ default: m.SharePage })),
);
const ViewingRoomsPage = React.lazy(() =>
  import('./pages/ViewingRoomsPage').then((m) => ({ default: m.ViewingRoomsPage })),
);
const ViewingRoomCreatePage = React.lazy(() =>
  import('./pages/ViewingRoomCreatePage').then((m) => ({ default: m.ViewingRoomCreatePage })),
);
const ViewingRoomDetailPage = React.lazy(() =>
  import('./pages/ViewingRoomDetailPage').then((m) => ({ default: m.ViewingRoomDetailPage })),
);
const ViewingRoomPage = React.lazy(() =>
  import('./pages/ViewingRoomPage').then((m) => ({ default: m.ViewingRoomPage })),
);
const UserManagementPage = React.lazy(() =>
  import('./pages/UserManagementPage').then((m) => ({ default: m.UserManagementPage })),
);
const GalleryDashboardPage = React.lazy(() =>
  import('./pages/GalleryDashboardPage').then((m) => ({ default: m.GalleryDashboardPage })),
);
const GalleryArtworksPage = React.lazy(() =>
  import('./pages/GalleryArtworksPage').then((m) => ({ default: m.GalleryArtworksPage })),
);
const CollectorDashboardPage = React.lazy(() =>
  import('./pages/CollectorDashboardPage').then((m) => ({ default: m.CollectorDashboardPage })),
);
const CollectorCertificatesPage = React.lazy(() =>
  import('./pages/CollectorCertificatesPage').then((m) => ({ default: m.CollectorCertificatesPage })),
);
const AnalyticsPage = React.lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);
const ActivityLogPage = React.lazy(() =>
  import('./pages/ActivityLogPage').then((m) => ({ default: m.ActivityLogPage })),
);
const SettingsPage = React.lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const GalleryDeliveriesPage = React.lazy(() =>
  import('./pages/GalleryDeliveriesPage').then((m) => ({ default: m.GalleryDeliveriesPage })),
);
const GalleryDeliveryDetailPage = React.lazy(() =>
  import('./pages/GalleryDeliveryDetailPage').then((m) => ({ default: m.GalleryDeliveryDetailPage })),
);
const GalleryCertificatesPage = React.lazy(() =>
  import('./pages/GalleryCertificatesPage').then((m) => ({ default: m.GalleryCertificatesPage })),
);
const SaleRequestsPage = React.lazy(() =>
  import('./pages/SaleRequestsPage').then((m) => ({ default: m.SaleRequestsPage })),
);
const MediaLibraryPage = React.lazy(() =>
  import('./pages/MediaLibraryPage').then((m) => ({ default: m.MediaLibraryPage })),
);
const CVEditorPage = React.lazy(() =>
  import('./pages/CVEditorPage').then((m) => ({ default: m.CVEditorPage })),
);
const GalleryMediaPage = React.lazy(() =>
  import('./pages/GalleryMediaPage').then((m) => ({ default: m.GalleryMediaPage })),
);
const NewsPage = React.lazy(() =>
  import('./pages/NewsPage').then((m) => ({ default: m.NewsPage })),
);
const GalleryNewsPage = React.lazy(() =>
  import('./pages/GalleryNewsPage').then((m) => ({ default: m.GalleryNewsPage })),
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
const DemandHeatMapPage = React.lazy(() =>
  import('./pages/DemandHeatMapPage').then((m) => ({ default: m.DemandHeatMapPage })),
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
const ArtFairHeatMapPage = React.lazy(() =>
  import('./pages/ArtFairHeatMapPage').then((m) => ({ default: m.ArtFairHeatMapPage })),
);
const PriceManagementPage = React.lazy(() =>
  import('./pages/PriceManagementPage').then((m) => ({ default: m.PriceManagementPage })),
);
const AuctionTrackingPage = React.lazy(() =>
  import('./pages/AuctionTrackingPage').then((m) => ({ default: m.AuctionTrackingPage })),
);
const GalleryAvailableWorksPage = React.lazy(() =>
  import('./pages/GalleryAvailableWorksPage').then((m) => ({ default: m.GalleryAvailableWorksPage })),
);
const InventoryHealthPage = React.lazy(() =>
  import('./pages/analytics/InventoryHealthPage').then((m) => ({ default: m.InventoryHealthPage })),
);
const GalleryPerformancePage = React.lazy(() =>
  import('./pages/analytics/GalleryPerformancePage').then((m) => ({ default: m.GalleryPerformancePage })),
);
const RevenueOverviewPage = React.lazy(() =>
  import('./pages/analytics/RevenueOverviewPage').then((m) => ({ default: m.RevenueOverviewPage })),
);
const DemandVelocityPage = React.lazy(() =>
  import('./pages/analytics/DemandVelocityPage').then((m) => ({ default: m.DemandVelocityPage })),
);
const PriceLadderPage = React.lazy(() =>
  import('./pages/analytics/PriceLadderPage').then((m) => ({ default: m.PriceLadderPage })),
);
const CollectorIntelligencePage = React.lazy(() =>
  import('./pages/analytics/CollectorIntelligencePage').then((m) => ({ default: m.CollectorIntelligencePage })),
);
const SeriesPerformancePage = React.lazy(() =>
  import('./pages/analytics/SeriesPerformancePage').then((m) => ({ default: m.SeriesPerformancePage })),
);
const ExhibitionImpactPage = React.lazy(() =>
  import('./pages/analytics/ExhibitionImpactPage').then((m) => ({ default: m.ExhibitionImpactPage })),
);
const SupplyPlanningPage = React.lazy(() =>
  import('./pages/analytics/SupplyPlanningPage').then((m) => ({ default: m.SupplyPlanningPage })),
);
const CareerTrajectoryPage = React.lazy(() =>
  import('./pages/analytics/CareerTrajectoryPage').then((m) => ({ default: m.CareerTrajectoryPage })),
);
const StrategicIntelligencePage = React.lazy(() =>
  import('./pages/analytics/StrategicIntelligencePage').then((m) => ({ default: m.StrategicIntelligencePage })),
);
const IntelligenceChatPage = React.lazy(() =>
  import('./pages/analytics/IntelligenceChatPage').then((m) => ({ default: m.IntelligenceChatPage })),
);

// ---------------------------------------------------------------------------
// Suspense fallback with error boundary
// ---------------------------------------------------------------------------
function SuspenseFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

/** Wraps lazy-loaded pages with both error boundary and suspense */
function LazyPage({ children }: { children: ReactNode }) {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<SuspenseFallback />}>{children}</Suspense>
    </ChunkErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Router
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
            <Suspense fallback={<SuspenseFallback />}>
              <DashboardPage />
            </Suspense>
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
                <PublicCollectionsPage />
              </Suspense>
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

        // Viewing Rooms (admin only)
        {
          path: 'viewing-rooms',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ViewingRoomsPage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'viewing-rooms/new',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ViewingRoomCreatePage /></LazyPage>
            </RoleGuard>
          ),
        },
        {
          path: 'viewing-rooms/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><ViewingRoomDetailPage /></LazyPage>
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

        // Sharing (admin only)
        {
          path: 'sharing',
          element: (
            <RoleGuard allowed={['admin']}>
              <LazyPage><SharingPage /></LazyPage>
            </RoleGuard>
          ),
        },

        // Analytics (admin only)
        {
          path: 'analytics',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <AnalyticsPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/inventory-health',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <InventoryHealthPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/revenue-overview',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <RevenueOverviewPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/gallery-performance',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <GalleryPerformancePage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/demand-velocity',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <DemandVelocityPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/price-ladder',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <PriceLadderPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/collector-intelligence',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <CollectorIntelligencePage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/series-performance',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <SeriesPerformancePage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/exhibition-impact',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <ExhibitionImpactPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/supply-planning',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <SupplyPlanningPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/career-trajectory',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <CareerTrajectoryPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/strategic-intelligence',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <StrategicIntelligencePage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'analytics/intelligence-chat',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <IntelligenceChatPage />
              </Suspense>
            </RoleGuard>
          ),
        },

        // Email Log (admin only)
        {
          path: 'email-log',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <EmailLogPage />
              </Suspense>
            </RoleGuard>
          ),
        },

        // Activity Log (admin only)
        {
          path: 'activity-log',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <ActivityLogPage />
              </Suspense>
            </RoleGuard>
          ),
        },

        // Settings (admin only)
        {
          path: 'settings',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <SettingsPage />
              </Suspense>
            </RoleGuard>
          ),
        },

        // Users (admin only)
        {
          path: 'users',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <UserManagementPage />
              </Suspense>
            </RoleGuard>
          ),
        },

        // Enquiries (admin only)
        {
          path: 'enquiries',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <EnquiriesPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'enquiries/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <EnquiryDetailPage />
              </Suspense>
            </RoleGuard>
          ),
        },

        // Market Intelligence (admin only)
        {
          path: 'demand-map',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <DemandHeatMapPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'schedule',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <AnnualSchedulePage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'projects',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <ProjectsPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'projects/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <ProjectDetailPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'exhibitions',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <ExhibitionsPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'exhibitions/:id',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <ExhibitionDetailPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'art-fair-map',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <ArtFairHeatMapPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'price-management',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <PriceManagementPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'auction-tracking',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <AuctionTrackingPage />
              </Suspense>
            </RoleGuard>
          ),
        },

        // Gallery portal routes (admin + gallery)
        {
          path: 'gallery/available-works',
          element: (
            <RoleGuard allowed={['admin', 'gallery']}>
              <Suspense fallback={<SuspenseFallback />}>
                <GalleryAvailableWorksPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'gallery/dashboard',
          element: (
            <RoleGuard allowed={['admin', 'gallery']}>
              <Suspense fallback={<SuspenseFallback />}>
                <GalleryDashboardPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'gallery/artworks',
          element: (
            <RoleGuard allowed={['admin', 'gallery']}>
              <Suspense fallback={<SuspenseFallback />}>
                <GalleryArtworksPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'gallery/deliveries',
          element: (
            <RoleGuard allowed={['admin', 'gallery']}>
              <Suspense fallback={<SuspenseFallback />}>
                <GalleryDeliveriesPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'gallery/deliveries/:id',
          element: (
            <RoleGuard allowed={['admin', 'gallery']}>
              <Suspense fallback={<SuspenseFallback />}>
                <GalleryDeliveryDetailPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'gallery/certificates',
          element: (
            <RoleGuard allowed={['admin', 'gallery']}>
              <Suspense fallback={<SuspenseFallback />}>
                <GalleryCertificatesPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'gallery/media',
          element: (
            <RoleGuard allowed={['admin', 'gallery']}>
              <Suspense fallback={<SuspenseFallback />}>
                <GalleryMediaPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'gallery/news',
          element: (
            <RoleGuard allowed={['admin', 'gallery']}>
              <Suspense fallback={<SuspenseFallback />}>
                <GalleryNewsPage />
              </Suspense>
            </RoleGuard>
          ),
        },

        // Admin routes
        {
          path: 'admin/sale-requests',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <SaleRequestsPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'media',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <MediaLibraryPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'cv',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <CVEditorPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'news',
          element: (
            <RoleGuard allowed={['admin']}>
              <Suspense fallback={<SuspenseFallback />}>
                <NewsPage />
              </Suspense>
            </RoleGuard>
          ),
        },

        // Collector portal routes (admin + collector)
        {
          path: 'collector/dashboard',
          element: (
            <RoleGuard allowed={['admin', 'collector']}>
              <Suspense fallback={<SuspenseFallback />}>
                <CollectorDashboardPage />
              </Suspense>
            </RoleGuard>
          ),
        },
        {
          path: 'collector/certificates',
          element: (
            <RoleGuard allowed={['admin', 'collector']}>
              <Suspense fallback={<SuspenseFallback />}>
                <CollectorCertificatesPage />
              </Suspense>
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

    // Public: Share link (high-res image sharing)
    {
      path: '/share/:token',
      element: (
        <Suspense fallback={<SuspenseFallback />}>
          <SharePage />
        </Suspense>
      ),
    },

    // Public: Viewing room
    {
      path: '/view/:slug',
      element: (
        <Suspense fallback={<SuspenseFallback />}>
          <ViewingRoomPage />
        </Suspense>
      ),
    },
  ],
  {
    basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
  },
);

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  );
}
