import { useState } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { EmailTemplateSelector } from './EmailTemplateSelector';
import { useEmailSend } from '../../hooks/useEmailSend';
import type { EmailTemplateData } from '../../lib/emailTemplates';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EmailComposerProps {
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  contactId?: string;
  artworkIds?: string[];
  templateType?: string;
  attachmentBlob?: Blob | null;
  attachmentFilename?: string;
  templateData?: EmailTemplateData;
  onSent?: () => void;
  onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip data-url prefix (e.g. "data:application/pdf;base64,")
      const base64 = result.split(',')[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailComposer({
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  contactId,
  artworkIds,
  templateType: initialTemplateType,
  attachmentBlob = null,
  attachmentFilename,
  templateData,
  onSent,
  onCancel,
}: EmailComposerProps) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [templateType, setTemplateType] = useState(initialTemplateType ?? '');
  const [showTemplates, setShowTemplates] = useState(false);

  const { sendEmail, sending } = useEmailSend();

  // ---- Template selection -------------------------------------------------

  function handleTemplateSelect(type: string, subj: string, bod: string) {
    setTemplateType(type);
    setSubject(subj);
    setBody(bod);
    setShowTemplates(false);
  }

  // ---- Send ---------------------------------------------------------------

  async function handleSend() {
    if (!to || !subject || !body) return;

    let attachmentBase64: string | undefined;
    if (attachmentBlob) {
      attachmentBase64 = await blobToBase64(attachmentBlob);
    }

    const success = await sendEmail({
      to,
      subject,
      body,
      contactId,
      artworkIds,
      templateType: templateType || undefined,
      attachmentBase64,
      attachmentFilename,
    });

    if (success) {
      onSent?.();
    }
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* To */}
      <Input
        label="To"
        type="email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="recipient@example.com"
        required
      />

      {/* Subject */}
      <Input
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Email subject"
        required
      />

      {/* Template toggle */}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTemplates((prev) => !prev)}
        >
          {showTemplates ? 'Hide Templates' : 'Choose Template'}
        </Button>
      </div>

      {/* Template selector */}
      {showTemplates && (
        <EmailTemplateSelector
          onSelect={handleTemplateSelect}
          data={templateData}
        />
      )}

      {/* Body */}
      <Textarea
        label="Body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message..."
        rows={12}
        required
      />

      {/* Attachment indicator */}
      {attachmentBlob && attachmentFilename && (
        <div className="flex items-center gap-2 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-700">
          <svg
            className="h-4 w-4 shrink-0 text-primary-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
            />
          </svg>
          <span className="truncate">{attachmentFilename}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-primary-100 pt-4">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSend}
          loading={sending}
          disabled={!to || !subject || !body}
        >
          Send Email
        </Button>
      </div>
    </div>
  );
}
