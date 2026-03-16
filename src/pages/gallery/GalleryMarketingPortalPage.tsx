// ---------------------------------------------------------------------------
// NOA Inventory -- Gallery Marketing Asset Portal
// Self-service page where galleries access marketing materials for their
// consigned works: artwork images, artist CV, and press materials.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, createElement } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { getSignedUrls } from '../../lib/signedUrlCache';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { formatCurrency, downloadBlob } from '../../lib/utils';
import { ARTIST_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Artwork {
  id: string;
  title: string | null;
  series: string | null;
  category: string | null;
  year: number | null;
  reference_code: string | null;
  price: number | null;
  currency: string | null;
  description: string | null;
}

interface ArtworkImage {
  id: string;
  artwork_id: string;
  storage_path: string;
  file_name: string;
  image_type: string;
  is_primary: boolean;
}

interface CVEntry {
  id: string;
  year: number | null;
  category: string;
  title: string;
  location: string | null;
  description: string | null;
  sort_order: number;
}

interface MediaFile {
  id: string;
  category: string;
  title: string;
  description: string | null;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  content_type: 'file' | 'text';
  text_content: string | null;
}

// ---------------------------------------------------------------------------
// CV category labels
// ---------------------------------------------------------------------------

const CV_CATEGORIES = [
  { value: 'education', label: 'Education' },
  { value: 'solo_exhibition', label: 'Solo Exhibitions' },
  { value: 'group_exhibition', label: 'Group Exhibitions' },
  { value: 'award', label: 'Awards' },
  { value: 'publication', label: 'Publications' },
  { value: 'residency', label: 'Residencies' },
  { value: 'collection', label: 'Collections' },
  { value: 'other', label: 'Other' },
] as const;

function getCategoryLabel(value: string): string {
  const cat = CV_CATEGORIES.find((c) => c.value === value);
  return cat ? cat.label : value;
}

function getMediaCategoryLabel(value: string): string {
  const labels: Record<string, string> = {
    press_release: 'Press Release',
    artist_statement: 'Artist Statement',
    biography: 'Biography',
    exhibition_text: 'Exhibition Text',
    press_clipping: 'Press Clipping',
    catalogue: 'Catalogue',
    other: 'Other',
  };
  return labels[value] || value.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryMarketingPortalPage() {
  const { profile, isGallery } = useAuth();
  const galleryId = profile?.gallery_id;

  const [loading, setLoading] = useState(true);
  const [galleryName, setGalleryName] = useState<string>('Gallery');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artworkImages, setArtworkImages] = useState<Map<string, ArtworkImage[]>>(new Map());
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [cvEntries, setCvEntries] = useState<CVEntry[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [downloadingImage, setDownloadingImage] = useState<string | null>(null);
  const [downloadingMedia, setDownloadingMedia] = useState<string | null>(null);
  const [generatingCV, setGeneratingCV] = useState(false);

  // ---- Fetch all data -------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!galleryId) return;
    setLoading(true);

    try {
      // Gallery name
      const { data: gallery } = await supabase
        .from('galleries')
        .select('name')
        .eq('id', galleryId)
        .single();
      if (gallery?.name) setGalleryName(gallery.name);

      // Consigned artworks
      const { data: artworksData } = await supabase
        .from('artworks')
        .select('id, title, series, category, year, reference_code, price, currency, description')
        .eq('gallery_id', galleryId)
        .in('status', ['on_consignment', 'available'])
        .order('title', { ascending: true });

      const works = (artworksData as Artwork[]) || [];
      setArtworks(works);

      // Artwork images
      if (works.length > 0) {
        const artworkIds = works.map((a) => a.id);
        const { data: imagesData } = await supabase
          .from('artwork_images')
          .select('id, artwork_id, storage_path, file_name, image_type, is_primary')
          .in('artwork_id', artworkIds)
          .order('is_primary', { ascending: false });

        const images = (imagesData as ArtworkImage[]) || [];
        const imageMap = new Map<string, ArtworkImage[]>();
        for (const img of images) {
          const list = imageMap.get(img.artwork_id) || [];
          list.push(img);
          imageMap.set(img.artwork_id, list);
        }
        setArtworkImages(imageMap);

        // Generate signed URLs for display (thumbnails)
        const storagePaths = images.map((img) => img.storage_path);
        if (storagePaths.length > 0) {
          const urlMap = await getSignedUrls('artwork-images', storagePaths);
          setImageUrls(urlMap);
        }
      }

      // CV entries
      const { data: cvData } = await supabase
        .from('cv_entries')
        .select('id, year, category, title, location, description, sort_order')
        .order('year', { ascending: false })
        .order('sort_order', { ascending: true });

      setCvEntries((cvData as CVEntry[]) || []);

      // Published media files (press materials)
      const { data: mediaData } = await supabase
        .from('media_files')
        .select('id, category, title, description, file_name, storage_path, file_size, mime_type, status, content_type, text_content')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      setMediaFiles((mediaData as MediaFile[]) || []);
    } catch {
      // Errors are non-fatal; sections will show empty state
    } finally {
      setLoading(false);
    }
  }, [galleryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Download handlers ----------------------------------------------------

  const handleDownloadImage = useCallback(async (image: ArtworkImage) => {
    setDownloadingImage(image.id);
    try {
      const { data, error } = await supabase.storage
        .from('artwork-images')
        .createSignedUrl(image.storage_path, 60);

      if (error || !data?.signedUrl) throw new Error('Could not generate download URL');

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = image.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // silent
    } finally {
      setDownloadingImage(null);
    }
  }, []);

  const handleDownloadMedia = useCallback(async (file: MediaFile) => {
    setDownloadingMedia(file.id);
    try {
      const { data, error } = await supabase.storage
        .from('media-files')
        .createSignedUrl(file.storage_path, 60);

      if (error || !data?.signedUrl) throw new Error('Could not generate download URL');

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = file.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // silent
    } finally {
      setDownloadingMedia(null);
    }
  }, []);

  const handleDownloadCV = useCallback(async () => {
    if (cvEntries.length === 0) return;
    setGeneratingCV(true);

    try {
      const ReactPDF = await import('@react-pdf/renderer');
      const { Document, Page, Text, View, StyleSheet, Font, pdf } = ReactPDF;

      // Register AnzianoPro font
      try {
        Font.register({
          family: 'AnzianoPro',
          fonts: [
            { src: '/assets/fonts/AnzianoPro-Regular.ttf', fontWeight: 'normal' },
            { src: '/assets/fonts/AnzianoPro-Bold.ttf', fontWeight: 'bold' },
          ],
        });
      } catch {
        // Font may not be available, fall back to Helvetica
      }

      const styles = StyleSheet.create({
        page: {
          padding: 40,
          fontFamily: 'AnzianoPro',
          fontSize: 10,
        },
        title: {
          fontSize: 18,
          fontWeight: 'bold',
          marginBottom: 4,
          textAlign: 'center',
        },
        subtitle: {
          fontSize: 12,
          marginBottom: 24,
          textAlign: 'center',
          color: '#666',
        },
        categoryHeader: {
          fontSize: 13,
          fontWeight: 'bold',
          marginTop: 16,
          marginBottom: 8,
          paddingBottom: 4,
          borderBottomWidth: 1,
          borderBottomColor: '#333',
        },
        entryRow: {
          flexDirection: 'row',
          marginBottom: 4,
          paddingLeft: 8,
        },
        yearCol: {
          width: 50,
          fontWeight: 'bold',
        },
        titleCol: {
          flex: 1,
        },
        locationCol: {
          width: 150,
          color: '#555',
        },
      });

      // Group entries by category
      const grouped: Record<string, CVEntry[]> = {};
      for (const entry of cvEntries) {
        if (!grouped[entry.category]) grouped[entry.category] = [];
        grouped[entry.category].push(entry);
      }

      const categoryOrder = CV_CATEGORIES.map((c) => c.value);
      const pageContent: React.ReactElement[] = [];

      pageContent.push(
        createElement(Text, { key: 'title', style: styles.title }, `${ARTIST_NAME}`),
        createElement(Text, { key: 'subtitle', style: styles.subtitle }, 'Curriculum Vitae'),
      );

      for (const catValue of categoryOrder) {
        const catEntries = grouped[catValue];
        if (!catEntries || catEntries.length === 0) continue;

        pageContent.push(
          createElement(
            Text,
            { key: `cat-${catValue}`, style: styles.categoryHeader },
            getCategoryLabel(catValue),
          ),
        );

        for (const entry of catEntries) {
          pageContent.push(
            createElement(
              View,
              { key: `entry-${entry.id}`, style: styles.entryRow },
              createElement(Text, { style: styles.yearCol }, entry.year ? String(entry.year) : ''),
              createElement(Text, { style: styles.titleCol }, entry.title),
              createElement(Text, { style: styles.locationCol }, entry.location || ''),
            ),
          );
        }
      }

      const doc = createElement(
        Document,
        null,
        createElement(Page, { size: 'A4', style: styles.page }, ...pageContent),
      );

      const blob = await pdf(doc).toBlob();
      downloadBlob(blob, `${ARTIST_NAME.replace(/\s+/g, '_')}_CV.pdf`);
    } catch {
      // silent
    } finally {
      setGeneratingCV(false);
    }
  }, [cvEntries]);

  // ---- Access control -------------------------------------------------------

  if (!isGallery) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-900">
            Marketing Kit
          </h1>
        </div>
        <Card className="p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-primary-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-primary-900">
            Access Denied
          </h3>
          <p className="mt-1 text-sm text-primary-500">
            This page is only accessible to gallery users. Please contact an administrator if you believe this is an error.
          </p>
        </Card>
      </div>
    );
  }

  if (!galleryId) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-900">
            Marketing Kit
          </h1>
        </div>
        <Card className="p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-primary-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-primary-900">
            Gallery profile not configured
          </h3>
          <p className="mt-1 text-sm text-primary-500">
            Please contact an administrator to link your account to a gallery.
          </p>
        </Card>
      </div>
    );
  }

  // ---- Loading --------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---- Group CV entries by category -----------------------------------------

  const groupedCV: Record<string, CVEntry[]> = {};
  for (const entry of cvEntries) {
    if (!groupedCV[entry.category]) groupedCV[entry.category] = [];
    groupedCV[entry.category].push(entry);
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-900">
          Marketing Kit
        </h1>
        <p className="mt-1 text-sm text-primary-500">{galleryName}</p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Your Artworks                                            */}
      {/* ------------------------------------------------------------------ */}

      <div className="mb-10">
        <h2 className="font-display text-lg font-semibold text-primary-900 mb-4">
          Your Artworks
        </h2>

        {artworks.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-primary-500">No consigned artworks found.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((artwork) => {
              const images = artworkImages.get(artwork.id) || [];
              const primaryImage = images.find((img) => img.is_primary) || images[0];
              const thumbUrl = primaryImage ? imageUrls.get(primaryImage.storage_path) : null;

              return (
                <Card key={artwork.id} className="overflow-hidden">
                  {/* Image */}
                  <div className="aspect-[4/3] bg-primary-50 relative">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={artwork.title || 'Artwork'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg
                          className="h-10 w-10 text-primary-200"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <h3 className="font-display text-sm font-semibold text-primary-900 truncate">
                      {artwork.title || 'Untitled'}
                    </h3>
                    {artwork.series && (
                      <p className="text-xs text-primary-500 mt-0.5 truncate">{artwork.series}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {artwork.year && (
                        <Badge variant="default">{artwork.year}</Badge>
                      )}
                      {artwork.reference_code && (
                        <Badge variant="default">{artwork.reference_code}</Badge>
                      )}
                      {artwork.category && (
                        <Badge variant="default">{artwork.category}</Badge>
                      )}
                    </div>
                    {artwork.price != null && artwork.currency && (
                      <p className="mt-2 text-sm font-medium text-primary-900">
                        {formatCurrency(artwork.price, artwork.currency)}
                      </p>
                    )}

                    {/* Download buttons for all images */}
                    {images.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        {images.map((img) => (
                          <Button
                            key={img.id}
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            disabled={downloadingImage === img.id}
                            onClick={() => handleDownloadImage(img)}
                          >
                            {downloadingImage === img.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <svg
                                  className="mr-1.5 h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth="1.5"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                                  />
                                </svg>
                                Download{img.is_primary ? ' (Primary)' : ` (${img.image_type || 'Image'})`}
                              </>
                            )}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Artist Biography & CV                                    */}
      {/* ------------------------------------------------------------------ */}

      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-primary-900">
            Artist Biography &amp; CV
          </h2>
          {cvEntries.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={generatingCV}
              onClick={handleDownloadCV}
            >
              {generatingCV ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <svg
                    className="mr-1.5 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  Download CV as PDF
                </>
              )}
            </Button>
          )}
        </div>

        {/* Artist bio from media_files (biography category) */}
        {mediaFiles
          .filter((f) => f.category === 'biography' && f.content_type === 'text' && f.text_content)
          .slice(0, 1)
          .map((bio) => (
            <Card key={bio.id} className="p-5 mb-4">
              <h3 className="font-display text-sm font-semibold text-primary-900 mb-2">
                {bio.title || 'Artist Biography'}
              </h3>
              <p className="text-sm text-primary-700 whitespace-pre-line leading-relaxed">
                {bio.text_content}
              </p>
            </Card>
          ))}

        {/* CV entries grouped by category */}
        {cvEntries.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-primary-500">No CV entries available.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {CV_CATEGORIES.map(({ value, label }) => {
              const entries = groupedCV[value];
              if (!entries || entries.length === 0) return null;

              return (
                <Card key={value} className="p-5">
                  <h3 className="font-display text-sm font-semibold text-primary-900 mb-3">
                    {label}
                  </h3>
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span className="font-medium text-primary-600 w-12 shrink-0">
                          {entry.year || ''}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-primary-900">{entry.title}</span>
                          {entry.location && (
                            <span className="text-primary-500 ml-1">
                              -- {entry.location}
                            </span>
                          )}
                          {entry.description && (
                            <p className="text-primary-400 text-xs mt-0.5">
                              {entry.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Press Materials                                          */}
      {/* ------------------------------------------------------------------ */}

      <div className="mb-10">
        <h2 className="font-display text-lg font-semibold text-primary-900 mb-4">
          Press Materials
        </h2>

        {mediaFiles.filter((f) => f.category !== 'biography').length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-primary-500">No press materials available.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {mediaFiles
              .filter((f) => f.category !== 'biography')
              .map((file) => (
                <Card key={file.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-primary-900 truncate">
                        {file.title}
                      </h3>
                      <Badge variant="default">
                        {getMediaCategoryLabel(file.category)}
                      </Badge>
                    </div>
                    {file.description && (
                      <p className="text-xs text-primary-500 mt-1 line-clamp-2">
                        {file.description}
                      </p>
                    )}
                    {file.file_size && (
                      <p className="text-xs text-primary-400 mt-0.5">
                        {(file.file_size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    )}
                  </div>

                  {file.content_type === 'text' && file.text_content ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([file.text_content!], { type: 'text/plain' });
                        downloadBlob(blob, `${file.title.replace(/\s+/g, '_')}.txt`);
                      }}
                    >
                      <svg
                        className="mr-1.5 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                        />
                      </svg>
                      Download
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingMedia === file.id}
                      onClick={() => handleDownloadMedia(file)}
                    >
                      {downloadingMedia === file.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <svg
                            className="mr-1.5 h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                            />
                          </svg>
                          Download
                        </>
                      )}
                    </Button>
                  )}
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
