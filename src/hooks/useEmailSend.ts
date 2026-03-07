import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { COMPANY_EMAIL } from '../lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  contactId?: string;
  artworkIds?: string[];
  templateType?: string;
  attachmentBase64?: string;
  attachmentFilename?: string;
}

export interface UseEmailSendReturn {
  sendEmail: (params: SendEmailParams) => Promise<boolean>;
  sending: boolean;
}

// ---------------------------------------------------------------------------
// Hook -- send email via edge function + log to email_log
// ---------------------------------------------------------------------------

export function useEmailSend(): UseEmailSendReturn {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const sendEmail = useCallback(
    async (params: SendEmailParams): Promise<boolean> => {
      setSending(true);

      try {
        // Get current user session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in to send emails', variant: 'error' });
          return false;
        }

        // Call the Supabase Edge Function
        const { data, error: fnError } = await supabase.functions.invoke('send-email', {
          body: {
            to: params.to,
            subject: params.subject,
            body: params.body,
            attachmentBase64: params.attachmentBase64,
            attachmentFilename: params.attachmentFilename,
          },
        });

        if (fnError) throw fnError;

        // Check if the edge function returned an error payload
        if (data?.error) {
          throw new Error(data.error);
        }

        // Determine the from_email: use user email or fallback to company email
        const fromEmail = session.user.email ?? COMPANY_EMAIL;

        // Log to email_log table
        const { error: logError } = await supabase.from('email_log').insert({
          user_id: session.user.id,
          from_email: fromEmail,
          to_email: params.to,
          subject: params.subject,
          body_preview: params.body.substring(0, 500) || null,
          artwork_ids: params.artworkIds ?? [],
          contact_id: params.contactId ?? null,
          template_type: params.templateType ?? null,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });

        if (logError) {
          // Log failure is non-critical -- don't fail the overall send
        }

        toast({ title: 'Email sent', description: `Email sent to ${params.to}`, variant: 'success' });
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to send email';
        toast({ title: 'Email failed', description: 'An error occurred. Please try again.', variant: 'error' });

        // Attempt to log the failure
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.user) {
            await supabase.from('email_log').insert({
              user_id: session.user.id,
              from_email: session.user.email ?? COMPANY_EMAIL,
              to_email: params.to,
              subject: params.subject,
              body_preview: params.body.substring(0, 500) || null,
              artwork_ids: params.artworkIds ?? [],
              contact_id: params.contactId ?? null,
              template_type: params.templateType ?? null,
              status: 'failed',
              sent_at: new Date().toISOString(),
            });
          }
        } catch {
          // Silently ignore logging failures in the error path
        }

        return false;
      } finally {
        setSending(false);
      }
    },
    [toast],
  );

  return { sendEmail, sending };
}
