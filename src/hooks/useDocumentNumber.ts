import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDocumentNumber() {
  const { toast } = useToast();

  const generateNumber = useCallback(
    async (prefix: string): Promise<string | null> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const { data, error } = await supabase.rpc('generate_document_number', {
          p_user_id: session.user.id,
          p_prefix: prefix,
        });

        if (error) throw error;

        return data as string;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to generate document number';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast],
  );

  return { generateNumber };
}
