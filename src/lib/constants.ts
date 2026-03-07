// ---------------------------------------------------------------------------
// NOA Inventory -- Application Constants
// ---------------------------------------------------------------------------

export const ARTIST_NAME = 'Simon Berger' as const;
export const COMPANY_NAME = 'NOA Contemporary' as const;
export const COMPANY_EMAIL = 'info@noacontemporary.com' as const;

// ---------------------------------------------------------------------------
// Artwork reference code prefix: NOA-SB-[Year]-[K7M2]
// Format: 2 random uppercase letters + 2 random digits, immutable once set
// ---------------------------------------------------------------------------
export const ARTWORK_REF_PREFIX = 'NOA-SB' as const;

// ---------------------------------------------------------------------------
// Document number prefixes (for sequential documents)
// ---------------------------------------------------------------------------
export const DOC_PREFIXES = {
  artwork: 'SB',
  delivery: 'DEL',
  packing: 'PL',
  production: 'PO',
  certificate: 'COA',
  invoice: 'INV',
  forwarding: 'GF',
} as const;

// ---------------------------------------------------------------------------
// Artwork statuses
// ---------------------------------------------------------------------------
export const ARTWORK_STATUSES = [
  { value: 'available', label: 'Available', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'sold', label: 'Sold', color: 'bg-red-100 text-red-800' },
  { value: 'reserved', label: 'Reserved', color: 'bg-amber-100 text-amber-800' },
  { value: 'in_production', label: 'In Production', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_transit', label: 'In Transit', color: 'bg-purple-100 text-purple-800' },
  { value: 'on_consignment', label: 'On Consignment', color: 'bg-sky-100 text-sky-800' },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'pending_sale', label: 'Pending Sale', color: 'bg-orange-100 text-orange-800' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-100 text-gray-500' },
  { value: 'destroyed', label: 'Destroyed', color: 'bg-red-200 text-red-900' },
] as const;

// ---------------------------------------------------------------------------
// Artwork categories
// ---------------------------------------------------------------------------
export const ARTWORK_CATEGORIES = [
  { value: 'painting', label: 'Painting' },
  { value: 'sculpture', label: 'Sculpture' },
  { value: 'drawing', label: 'Drawing' },
  { value: 'mixed_media', label: 'Mixed Media' },
  { value: 'print', label: 'Print' },
  { value: 'photography', label: 'Photography' },
  { value: 'installation', label: 'Installation' },
  { value: 'digital', label: 'Digital' },
  { value: 'other', label: 'Other' },
] as const;

// ---------------------------------------------------------------------------
// Artwork motifs
// ---------------------------------------------------------------------------
export const ARTWORK_MOTIFS = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'abstract', label: 'Abstract' },
  { value: 'figurative', label: 'Figurative' },
  { value: 'still_life', label: 'Still Life' },
  { value: 'architectural', label: 'Architectural' },
  { value: 'conceptual', label: 'Conceptual' },
  { value: 'other', label: 'Other' },
] as const;

// ---------------------------------------------------------------------------
// Artwork series
// ---------------------------------------------------------------------------
export const ARTWORK_SERIES = [
  { value: 'animal', label: 'Animal' },
  { value: 'untitled_portrait', label: 'Untitled Portrait' },
  { value: 'specific_portrait', label: 'Specific Portrait' },
  { value: 'god', label: 'God' },
  { value: 'personal_commission', label: 'Personal Commission' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'abstract', label: 'Abstract' },
  { value: 'figurative', label: 'Figurative' },
  { value: 'skull', label: 'Skull' },
  { value: 'sphere', label: 'Sphere' },
  { value: 'half_sphere', label: 'Half-Sphere' },
  { value: 'other', label: 'Other' },
] as const;

// ---------------------------------------------------------------------------
// Artwork colors
// ---------------------------------------------------------------------------
export const ARTWORK_COLORS = [
  { value: 'green', label: 'Green' },
  { value: 'red', label: 'Red' },
  { value: 'white', label: 'White' },
  { value: 'silver', label: 'Silver' },
  { value: 'dark_grey', label: 'Dark Grey' },
  { value: 'other', label: 'Other' },
] as const;

// ---------------------------------------------------------------------------
// Edition types
// ---------------------------------------------------------------------------
export const EDITION_TYPES = [
  { value: 'unique', label: 'Unique' },
  { value: 'numbered', label: 'Numbered Edition' },
  { value: 'AP', label: 'Artist Proof (AP)' },
  { value: 'HC', label: 'Hors Commerce (HC)' },
  { value: 'EA', label: "Épreuve d'Artiste (EA)" },
] as const;

// ---------------------------------------------------------------------------
// Currencies
// ---------------------------------------------------------------------------
export const CURRENCIES = [
  { value: 'EUR', label: 'EUR', symbol: '\u20AC' },
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'CHF', label: 'CHF', symbol: 'CHF' },
  { value: 'GBP', label: 'GBP', symbol: '\u00A3' },
] as const;

// ---------------------------------------------------------------------------
// Dimension units
// ---------------------------------------------------------------------------
export const DIMENSION_UNITS = [
  { value: 'cm', label: 'cm' },
  { value: 'inches', label: 'inches' },
] as const;

// ---------------------------------------------------------------------------
// Delivery statuses
// ---------------------------------------------------------------------------
export const DELIVERY_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-blue-100 text-blue-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-emerald-100 text-emerald-800' },
] as const;

// ---------------------------------------------------------------------------
// Production statuses
// ---------------------------------------------------------------------------
export const PRODUCTION_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'ordered', label: 'Ordered', color: 'bg-amber-100 text-amber-800' },
  { value: 'in_production', label: 'In Production', color: 'bg-blue-100 text-blue-800' },
  { value: 'quality_check', label: 'Quality Check', color: 'bg-purple-100 text-purple-800' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
] as const;

// ---------------------------------------------------------------------------
// Gallery forwarding statuses
// ---------------------------------------------------------------------------
export const FORWARDING_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'prepared', label: 'Prepared', color: 'bg-amber-100 text-amber-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_transit', label: 'In Transit', color: 'bg-purple-100 text-purple-800' },
  { value: 'received', label: 'Received', color: 'bg-emerald-100 text-emerald-800' },
] as const;

// ---------------------------------------------------------------------------
// Condition grades
// ---------------------------------------------------------------------------
export const CONDITION_GRADES = [
  { value: 'excellent', label: 'Excellent', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'good', label: 'Good', color: 'bg-blue-100 text-blue-800' },
  { value: 'fair', label: 'Fair', color: 'bg-amber-100 text-amber-800' },
  { value: 'damaged', label: 'Damaged', color: 'bg-red-100 text-red-800' },
] as const;

// ---------------------------------------------------------------------------
// Loan statuses
// ---------------------------------------------------------------------------
export const LOAN_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  { value: 'active', label: 'Active', color: 'bg-blue-100 text-blue-800' },
  { value: 'returned', label: 'Returned', color: 'bg-emerald-100 text-emerald-800' },
] as const;

// ---------------------------------------------------------------------------
// Expense categories
// ---------------------------------------------------------------------------
export const EXPENSE_CATEGORIES = [
  { value: 'framing', label: 'Framing' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'photography', label: 'Photography' },
  { value: 'restoration', label: 'Restoration' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'storage', label: 'Storage' },
  { value: 'other', label: 'Other' },
] as const;

// ---------------------------------------------------------------------------
// Contact types
// ---------------------------------------------------------------------------
export const CONTACT_TYPES = [
  { value: 'collector', label: 'Collector' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'institution', label: 'Institution' },
] as const;

// ---------------------------------------------------------------------------
// Interaction types
// ---------------------------------------------------------------------------
export const INTERACTION_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
] as const;

// ---------------------------------------------------------------------------
// Deal stages
// ---------------------------------------------------------------------------
export const DEAL_STAGES = [
  { value: 'lead', label: 'Lead', color: 'bg-gray-100 text-gray-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800' },
  { value: 'quoted', label: 'Quoted', color: 'bg-amber-100 text-amber-800' },
  { value: 'negotiating', label: 'Negotiating', color: 'bg-purple-100 text-purple-800' },
  { value: 'sold', label: 'Sold', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' },
] as const;

// ---------------------------------------------------------------------------
// Invoice statuses
// ---------------------------------------------------------------------------
export const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-800' },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
] as const;

// ---------------------------------------------------------------------------
// Email template types
// ---------------------------------------------------------------------------
export const EMAIL_TEMPLATES = [
  { value: 'certificate', label: 'Certificate of Authenticity' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'delivery_receipt', label: 'Delivery Receipt' },
  { value: 'quote', label: 'Quote / Offer' },
  { value: 'catalogue', label: 'Catalogue' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'gallery_report', label: 'Gallery Report' },
  { value: 'custom', label: 'Custom' },
] as const;

// ---------------------------------------------------------------------------
// Email statuses
// ---------------------------------------------------------------------------
export const EMAIL_STATUSES = [
  { value: 'sent', label: 'Sent', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' },
  { value: 'bounced', label: 'Bounced', color: 'bg-amber-100 text-amber-800' },
] as const;

// ---------------------------------------------------------------------------
// Image types
// ---------------------------------------------------------------------------
export const IMAGE_TYPES = [
  { value: 'raw', label: 'RAW' },
  { value: 'retouched', label: 'Retouched' },
  { value: 'detail', label: 'Detail' },
] as const;

// ---------------------------------------------------------------------------
// Gallery types
// ---------------------------------------------------------------------------
export const GALLERY_TYPES = [
  { value: 'representative', label: 'Representative' },
  { value: 'project', label: 'Project' },
  { value: 'agent', label: 'Agent' },
] as const;

// ---------------------------------------------------------------------------
// Sale types
// ---------------------------------------------------------------------------
export const SALE_TYPES = [
  { value: 'art_fair', label: 'Art Fair' },
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'direct', label: 'Direct' },
] as const;

// ---------------------------------------------------------------------------
// Institution types (for public collections)
// ---------------------------------------------------------------------------
export const INSTITUTION_TYPES = [
  { value: 'museum', label: 'Museum' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'corporate', label: 'Corporate Collection' },
  { value: 'university', label: 'University' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
] as const;
