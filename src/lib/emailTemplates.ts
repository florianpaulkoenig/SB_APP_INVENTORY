// ---------------------------------------------------------------------------
// NOA Inventory -- Email Template Generators
// ---------------------------------------------------------------------------

import { COMPANY_NAME, ARTIST_NAME } from './constants';

// ---------------------------------------------------------------------------
// Template data shape
// ---------------------------------------------------------------------------

export interface EmailTemplateData {
  recipientName?: string;
  artworkTitle?: string;
  artworkReferenceCode?: string;
  invoiceNumber?: string;
  invoiceTotal?: string;
  deliveryNumber?: string;
  certificateNumber?: string;
  galleryName?: string;
  customMessage?: string;
}

// ---------------------------------------------------------------------------
// Subject generation
// ---------------------------------------------------------------------------

export function getEmailSubject(
  templateType: string,
  data: EmailTemplateData = {},
): string {
  switch (templateType) {
    case 'certificate':
      return `Certificate of Authenticity - ${data.artworkTitle ?? 'Artwork'}`;

    case 'invoice':
      return `Invoice ${data.invoiceNumber ?? ''} - ${COMPANY_NAME}`;

    case 'delivery_receipt':
      return `Delivery Receipt ${data.deliveryNumber ?? ''}`;

    case 'quote':
      return `Artwork Offer - ${data.artworkTitle ?? 'Artwork'}`;

    case 'follow_up':
      return `Following up - ${COMPANY_NAME}`;

    case 'gallery_report':
      return `Sales Report - ${COMPANY_NAME}`;

    case 'custom':
      return data.customMessage ?? `Message from ${COMPANY_NAME}`;

    default:
      return data.customMessage ?? `Message from ${COMPANY_NAME}`;
  }
}

// ---------------------------------------------------------------------------
// Body generation
// ---------------------------------------------------------------------------

const SIGN_OFF = `\n\nBest regards,\n${COMPANY_NAME}`;

export function getEmailBody(
  templateType: string,
  data: EmailTemplateData = {},
): string {
  const greeting = data.recipientName
    ? `Dear ${data.recipientName},`
    : 'Dear Sir or Madam,';

  switch (templateType) {
    case 'certificate': {
      const certRef = data.certificateNumber ? ` (${data.certificateNumber})` : '';
      const artworkRef = data.artworkTitle ?? 'the artwork';

      return (
        `${greeting}\n\n` +
        `Please find enclosed the Certificate of Authenticity${certRef} for "${artworkRef}". ` +
        `This document certifies the originality and provenance of the work by ${ARTIST_NAME}.\n\n` +
        'Please keep this certificate in a safe place as it serves as the official record of authenticity.' +
        SIGN_OFF
      );
    }

    case 'invoice': {
      const invNum = data.invoiceNumber ? ` ${data.invoiceNumber}` : '';
      const total = data.invoiceTotal ? ` for a total of ${data.invoiceTotal}` : '';

      return (
        `${greeting}\n\n` +
        `Please find enclosed Invoice${invNum}${total}.\n\n` +
        'If you have any questions regarding this invoice, please do not hesitate to contact us.\n\n' +
        'We kindly ask for payment within the terms specified on the invoice.' +
        SIGN_OFF
      );
    }

    case 'delivery_receipt': {
      const delNum = data.deliveryNumber ? ` ${data.deliveryNumber}` : '';

      return (
        `${greeting}\n\n` +
        `Please find enclosed Delivery Receipt${delNum} confirming the shipment of the artwork(s).\n\n` +
        'Please review the details and confirm receipt at your earliest convenience. ' +
        'Should there be any discrepancies or concerns regarding the condition of the work(s), ' +
        'please notify us within 48 hours of delivery.' +
        SIGN_OFF
      );
    }

    case 'quote': {
      const artworkRef = data.artworkTitle ?? 'the artwork';
      const refCode = data.artworkReferenceCode ? ` (Ref: ${data.artworkReferenceCode})` : '';

      return (
        `${greeting}\n\n` +
        `Thank you for your interest in the work of ${ARTIST_NAME}. ` +
        `We are pleased to present "${artworkRef}"${refCode} for your consideration.\n\n` +
        'Please find the details of this work attached. Should you wish to proceed or require ' +
        'any additional information, we would be delighted to assist.\n\n' +
        'This offer is valid for 14 days from the date of this email.' +
        SIGN_OFF
      );
    }

    case 'follow_up':
      return (
        `${greeting}\n\n` +
        `I hope this message finds you well. I wanted to follow up on our recent conversation ` +
        `and see if you had any further questions about the work(s) we discussed.\n\n` +
        'We would be happy to arrange a private viewing or provide any additional information ' +
        'that may be helpful in your decision.\n\n' +
        'Please do not hesitate to reach out at your convenience.' +
        SIGN_OFF
      );

    case 'gallery_report': {
      const gallery = data.galleryName ? `Dear ${data.galleryName} team,` : greeting;

      return (
        `${gallery}\n\n` +
        `Please find attached the latest sales performance report for works by ${ARTIST_NAME} ` +
        'consigned to your gallery.\n\n' +
        'We kindly ask you to review the report and let us know if there are any discrepancies ' +
        'or if you require further details. We look forward to continuing our successful partnership.' +
        SIGN_OFF
      );
    }

    case 'custom': {
      const message = data.customMessage ?? '';
      if (data.recipientName && message) {
        return `${greeting}\n\n${message}${SIGN_OFF}`;
      }
      if (message) {
        return `${message}${SIGN_OFF}`;
      }
      return `${greeting}${SIGN_OFF}`;
    }

    default: {
      const message = data.customMessage ?? '';
      if (message) {
        return `${greeting}\n\n${message}${SIGN_OFF}`;
      }
      return `${greeting}${SIGN_OFF}`;
    }
  }
}
