import { useState, useCallback, useEffect, createElement } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { ARTIST_NAME } from '../lib/constants';

interface CVEntry {
  id: string;
  year: number | null;
  category: string;
  title: string;
  location: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

const CV_CATEGORIES = [
  { value: 'education', label: 'Education' },
  { value: 'solo_exhibition', label: 'Solo Exhibition' },
  { value: 'group_exhibition', label: 'Group Exhibition' },
  { value: 'award', label: 'Award' },
  { value: 'publication', label: 'Publication' },
  { value: 'residency', label: 'Residency' },
  { value: 'collection', label: 'Collection' },
  { value: 'other', label: 'Other' },
] as const;

function getCategoryLabel(value: string): string {
  const cat = CV_CATEGORIES.find((c) => c.value === value);
  return cat ? cat.label : value;
}

export function useCVEntries() {
  const [entries, setEntries] = useState<CVEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cv_entries')
        .select('*')
        .order('year', { ascending: false })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setEntries((data as CVEntry[]) || []);
    } catch (err) {
      console.error('Error fetching CV entries:', err);
      toast({
        title: 'Error',
        description: 'Failed to load CV entries.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const createEntry = useCallback(
    async (
      data: Omit<CVEntry, 'id' | 'created_at' | 'sort_order'>
    ): Promise<CVEntry | null> => {
      try {
        // Get max sort_order for the category
        const { data: existing } = await supabase
          .from('cv_entries')
          .select('sort_order')
          .eq('category', data.category)
          .order('sort_order', { ascending: false })
          .limit(1);

        const nextOrder = existing && existing.length > 0 ? (existing[0] as { sort_order: number }).sort_order + 1 : 0;

        const { data: created, error } = await supabase
          .from('cv_entries')
          .insert({
            ...data,
            sort_order: nextOrder,
          } as never)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Entry Created',
          description: 'CV entry has been added.',
          variant: 'success',
        });

        await fetchEntries();
        return created as CVEntry;
      } catch (err) {
        console.error('Error creating CV entry:', err);
        toast({
          title: 'Error',
          description: 'Failed to create CV entry.',
          variant: 'error',
        });
        return null;
      }
    },
    [toast, fetchEntries]
  );

  const updateEntry = useCallback(
    async (id: string, data: Partial<CVEntry>): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('cv_entries')
          .update(data as never)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Entry Updated',
          description: 'CV entry has been updated.',
          variant: 'success',
        });

        await fetchEntries();
        return true;
      } catch (err) {
        console.error('Error updating CV entry:', err);
        toast({
          title: 'Error',
          description: 'Failed to update CV entry.',
          variant: 'error',
        });
        return false;
      }
    },
    [toast, fetchEntries]
  );

  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('cv_entries').delete().eq('id', id);

        if (error) throw error;

        toast({
          title: 'Entry Deleted',
          description: 'CV entry has been removed.',
          variant: 'success',
        });

        await fetchEntries();
        return true;
      } catch (err) {
        console.error('Error deleting CV entry:', err);
        toast({
          title: 'Error',
          description: 'Failed to delete CV entry.',
          variant: 'error',
        });
        return false;
      }
    },
    [toast, fetchEntries]
  );

  const exportPDF = useCallback(async () => {
    try {
      toast({
        title: 'Generating PDF',
        description: 'Please wait...',
        variant: 'success',
      });

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
      for (const entry of entries) {
        if (!grouped[entry.category]) {
          grouped[entry.category] = [];
        }
        grouped[entry.category].push(entry);
      }

      const categoryOrder = CV_CATEGORIES.map((c) => c.value);

      const pageContent: React.ReactElement[] = [];

      pageContent.push(
        createElement(Text, { key: 'title', style: styles.title }, `${ARTIST_NAME}`),
        createElement(Text, { key: 'subtitle', style: styles.subtitle }, 'Curriculum Vitae')
      );

      for (const catValue of categoryOrder) {
        const catEntries = grouped[catValue];
        if (!catEntries || catEntries.length === 0) continue;

        pageContent.push(
          createElement(
            Text,
            { key: `cat-${catValue}`, style: styles.categoryHeader },
            getCategoryLabel(catValue)
          )
        );

        for (const entry of catEntries) {
          pageContent.push(
            createElement(
              View,
              { key: `entry-${entry.id}`, style: styles.entryRow },
              createElement(Text, { style: styles.yearCol }, entry.year ? String(entry.year) : ''),
              createElement(Text, { style: styles.titleCol }, entry.title),
              createElement(Text, { style: styles.locationCol }, entry.location || '')
            )
          );
        }
      }

      const doc = createElement(
        Document,
        null,
        createElement(Page, { size: 'A4', style: styles.page }, ...pageContent)
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${ARTIST_NAME.replace(/\s+/g, '_')}_CV.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'PDF Exported',
        description: 'CV has been downloaded as PDF.',
        variant: 'success',
      });
    } catch (err) {
      console.error('Error exporting PDF:', err);
      toast({
        title: 'Export Failed',
        description: 'Could not generate PDF.',
        variant: 'error',
      });
    }
  }, [entries, toast]);

  const exportXLS = useCallback(async () => {
    try {
      toast({
        title: 'Generating XLS',
        description: 'Please wait...',
        variant: 'success',
      });

      const XLSX = await import('xlsx');

      const worksheetData = entries.map((entry) => ({
        Year: entry.year ?? '',
        Category: getCategoryLabel(entry.category),
        Title: entry.title,
        Location: entry.location ?? '',
        Description: entry.description ?? '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'CV');

      // Set column widths
      worksheet['!cols'] = [
        { wch: 8 },
        { wch: 20 },
        { wch: 40 },
        { wch: 25 },
        { wch: 40 },
      ];

      XLSX.writeFile(workbook, `${ARTIST_NAME.replace(/\s+/g, '_')}_CV.xlsx`);

      toast({
        title: 'XLS Exported',
        description: 'CV has been downloaded as XLS.',
        variant: 'success',
      });
    } catch (err) {
      console.error('Error exporting XLS:', err);
      toast({
        title: 'Export Failed',
        description: 'Could not generate XLS file.',
        variant: 'error',
      });
    }
  }, [entries, toast]);

  const refetch = useCallback(async () => {
    await fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    loading,
    createEntry,
    updateEntry,
    deleteEntry,
    exportPDF,
    exportXLS,
    refetch,
  };
}
