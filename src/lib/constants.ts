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
  { value: 'primary_flagship', label: 'Primary Flagship Gallery' },
  { value: 'regional_partner', label: 'Regional Partner' },
  { value: 'project_partner', label: 'Project Partner' },
  { value: 'sales_agent', label: 'Sales Agent / Intermediary' },
  { value: 'terminated', label: 'Terminated Partner' },
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

// ---------------------------------------------------------------------------
// Enquiry sources, statuses, priorities
// ---------------------------------------------------------------------------
export const ENQUIRY_SOURCES = [
  { value: 'email', label: 'Email', color: 'bg-blue-100 text-blue-800' },
  { value: 'instagram', label: 'Instagram', color: 'bg-pink-100 text-pink-800' },
  { value: 'website', label: 'Website', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'art_fair', label: 'Art Fair', color: 'bg-purple-100 text-purple-800' },
  { value: 'phone', label: 'Phone', color: 'bg-teal-100 text-teal-800' },
  { value: 'referral', label: 'Referral', color: 'bg-amber-100 text-amber-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
] as const;

export const ENQUIRY_STATUSES = [
  { value: 'new', label: 'New', color: '#93c5fd' },
  { value: 'reviewing', label: 'Reviewing', color: '#fbbf24' },
  { value: 'qualified', label: 'Qualified', color: '#2563eb' },
  { value: 'lead', label: 'Lead', color: '#f97316' },
  { value: 'sold', label: 'Sold', color: '#c9a96e' },
  { value: 'archived', label: 'Archived', color: '#9ca3af' },
] as const;

export const ENQUIRY_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
] as const;

// ---------------------------------------------------------------------------
// Exhibition types
// ---------------------------------------------------------------------------
export const EXHIBITION_TYPES = [
  { value: 'exhibition', label: 'Exhibition', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'art_fair', label: 'Art Fair', color: 'bg-purple-100 text-purple-800' },
  { value: 'solo_show', label: 'Solo Show', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'group_show', label: 'Group Show', color: 'bg-amber-100 text-amber-800' },
] as const;

// ---------------------------------------------------------------------------
// Project statuses
// ---------------------------------------------------------------------------
export const PROJECT_STATUSES = [
  { value: 'planned', label: 'Planned', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-100 text-amber-800' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-gray-100 text-gray-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
] as const;

// ---------------------------------------------------------------------------
// Schedule event type colors (for annual Gantt chart)
// ---------------------------------------------------------------------------
export const SCHEDULE_EVENT_COLORS: Record<string, { bg: string; text: string; light: string; label: string }> = {
  exhibition: { bg: 'bg-indigo-500', text: 'text-white', light: 'bg-indigo-100 text-indigo-800', label: 'Exhibition' },
  art_fair: { bg: 'bg-purple-500', text: 'text-white', light: 'bg-purple-100 text-purple-800', label: 'Art Fair' },
  solo_show: { bg: 'bg-emerald-500', text: 'text-white', light: 'bg-emerald-100 text-emerald-800', label: 'Solo Show' },
  group_show: { bg: 'bg-amber-500', text: 'text-white', light: 'bg-amber-100 text-amber-800', label: 'Group Show' },
  production_order: { bg: 'bg-blue-500', text: 'text-white', light: 'bg-blue-100 text-blue-800', label: 'Production' },
  project: { bg: 'bg-rose-500', text: 'text-white', light: 'bg-rose-100 text-rose-800', label: 'Project' },
};

export type ScheduleEventType = keyof typeof SCHEDULE_EVENT_COLORS;

// ---------------------------------------------------------------------------
// Auction results & houses
// ---------------------------------------------------------------------------
export const AUCTION_RESULTS = [
  { value: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-800' },
  { value: 'sold', label: 'Sold', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'bought_in', label: 'Bought In', color: 'bg-red-100 text-red-800' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-gray-100 text-gray-800' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-800' },
] as const;

export const AUCTION_HOUSES = [
  "Christie's",
  "Sotheby's",
  'Phillips',
  'Bonhams',
  'Dorotheum',
  'Ketterer Kunst',
  'Koller',
  'Artcurial',
  'Grisebach',
  'Lempertz',
] as const;

// ---------------------------------------------------------------------------
// Intelligence Platform — Reporting & Analytics enums
// ---------------------------------------------------------------------------

export const REPORTING_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'reserved', label: 'Reserved', color: 'bg-blue-100 text-blue-800' },
  { value: 'sold_pending_details', label: 'Pending Details', color: 'bg-amber-100 text-amber-800' },
  { value: 'sold_reported', label: 'Reported', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'verified', label: 'Verified', color: 'bg-green-100 text-green-800' },
] as const;

export const SALE_LOCATION_TYPES = [
  { value: 'gallery', label: 'Gallery' },
  { value: 'fair', label: 'Art Fair' },
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'private', label: 'Private Sale' },
  { value: 'online', label: 'Online' },
] as const;

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  { value: 'partial', label: 'Partial', color: 'bg-amber-100 text-amber-800' },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
] as const;

export const COLLECTOR_ANONYMITY_MODES = [
  { value: 'named', label: 'Named Collector' },
  { value: 'anonymous', label: 'Anonymous (Metadata Only)' },
  { value: 'private', label: 'Private (Internal Only)' },
] as const;

export const SIZE_CATEGORIES = [
  { value: 'small', label: 'Small', description: 'Up to 50cm' },
  { value: 'medium', label: 'Medium', description: '50-120cm' },
  { value: 'large', label: 'Large', description: '120-200cm' },
  { value: 'monumental', label: 'Monumental', description: '200cm+' },
] as const;

export const MILESTONE_TYPES = [
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'museum_show', label: 'Museum Show' },
  { value: 'publication', label: 'Publication' },
  { value: 'award', label: 'Award' },
  { value: 'institutional', label: 'Institutional' },
  { value: 'collection', label: 'Collection' },
  { value: 'fair', label: 'Art Fair' },
] as const;

export const ACCESS_TIERS = [
  { value: 'standard', label: 'Standard', color: 'bg-gray-100 text-gray-800' },
  { value: 'priority', label: 'Priority', color: 'bg-blue-100 text-blue-800' },
  { value: 'premium', label: 'Premium', color: 'bg-amber-100 text-amber-800' },
] as const;

export const COLLECTOR_SEGMENTS = [
  { value: 'new', label: 'New' },
  { value: 'returning', label: 'Returning' },
  { value: 'vip', label: 'VIP' },
  { value: 'institutional', label: 'Institutional' },
] as const;
