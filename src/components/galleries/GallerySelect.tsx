import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Select } from '../ui/Select';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GallerySelectProps {
  value: string | null;
  onChange: (galleryId: string | null) => void;
  error?: string;
  label?: string;
}

// ---------------------------------------------------------------------------
// Lightweight gallery record for the dropdown
// ---------------------------------------------------------------------------

interface GalleryOption {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GallerySelect({
  value,
  onChange,
  error,
  label = 'Gallery',
}: GallerySelectProps) {
  const [galleries, setGalleries] = useState<GalleryOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from('galleries')
        .select('id, name')
        .order('name', { ascending: true });

      setGalleries((data as GalleryOption[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, []);

  const options = [
    { value: '', label: 'No gallery' },
    ...galleries.map((g) => ({ value: g.id, label: g.name })),
  ];

  return (
    <Select
      label={label}
      error={error}
      options={options}
      value={value ?? ''}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === '' ? null : val);
      }}
      disabled={loading}
    />
  );
}
