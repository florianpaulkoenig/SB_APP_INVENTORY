// ---------------------------------------------------------------------------
// NOA Inventory -- Supabase Database Types
// ---------------------------------------------------------------------------

// ---- Enum-like type aliases ------------------------------------------------

export type ArtworkStatus =
  | 'available'
  | 'sold'
  | 'reserved'
  | 'in_production'
  | 'in_transit'
  | 'on_consignment';

export type ArtworkCategory =
  | 'painting'
  | 'sculpture'
  | 'drawing'
  | 'mixed_media'
  | 'print'
  | 'photography'
  | 'installation'
  | 'digital'
  | 'other';

export type ArtworkMotif =
  | 'portrait'
  | 'landscape'
  | 'abstract'
  | 'figurative'
  | 'still_life'
  | 'architectural'
  | 'conceptual'
  | 'other';

export type ArtworkSeries =
  | 'animal'
  | 'untitled_portrait'
  | 'specific_portrait'
  | 'god'
  | 'personal_commission'
  | 'landscape'
  | 'abstract'
  | 'figurative'
  | 'other';

export type DimensionUnit = 'cm' | 'inches';

export type Currency = 'EUR' | 'USD' | 'CHF' | 'GBP';

export type DeliveryStatus = 'draft' | 'shipped' | 'delivered';

export type ProductionStatus =
  | 'draft'
  | 'ordered'
  | 'in_production'
  | 'quality_check'
  | 'completed';

export type ImageType = 'raw' | 'retouched' | 'detail';

export type EditionType = 'unique' | 'numbered' | 'AP' | 'HC' | 'EA';

export type ContactType = 'collector' | 'prospect' | 'institution';

export type InteractionType = 'email' | 'call' | 'meeting' | 'note';

export type DealStage = 'lead' | 'contacted' | 'quoted' | 'negotiating' | 'sold' | 'lost';

// ---- Table row / insert / update types -------------------------------------

// -- galleries ---------------------------------------------------------------

export interface GalleryRow {
  id: string;
  user_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  commission_rate: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryInsert {
  id?: string;
  user_id?: string;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  commission_rate?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type GalleryUpdate = Partial<GalleryInsert>;

// -- artworks ----------------------------------------------------------------

export interface ArtworkRow {
  id: string;
  user_id: string;
  inventory_number: string;
  reference_code: string;
  title: string;
  medium: string | null;
  year: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  dimension_unit: DimensionUnit;
  framed_height: number | null;
  framed_width: number | null;
  framed_depth: number | null;
  weight: number | null;
  edition_type: EditionType;
  edition_number: number | null;
  edition_total: number | null;
  is_unique: boolean;
  price: number | null;
  currency: Currency;
  status: ArtworkStatus;
  current_location: string | null;
  gallery_id: string | null;
  commission_gallery: number | null;
  commission_noa: number | null;
  commission_artist: number | null;
  category: ArtworkCategory | null;
  motif: ArtworkMotif | null;
  series: ArtworkSeries | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArtworkInsert {
  id?: string;
  user_id?: string;
  inventory_number: string;
  reference_code: string;
  title: string;
  medium?: string | null;
  year?: number | null;
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  dimension_unit?: DimensionUnit;
  framed_height?: number | null;
  framed_width?: number | null;
  framed_depth?: number | null;
  weight?: number | null;
  edition_type?: EditionType;
  edition_number?: number | null;
  edition_total?: number | null;
  is_unique?: boolean;
  price?: number | null;
  currency?: Currency;
  status?: ArtworkStatus;
  current_location?: string | null;
  gallery_id?: string | null;
  commission_gallery?: number | null;
  commission_noa?: number | null;
  commission_artist?: number | null;
  category?: ArtworkCategory | null;
  motif?: ArtworkMotif | null;
  series?: ArtworkSeries | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ArtworkUpdate = Partial<ArtworkInsert>;

// -- artwork_images ----------------------------------------------------------

export interface ArtworkImageRow {
  id: string;
  user_id: string;
  artwork_id: string;
  storage_path: string;
  file_name: string;
  image_type: ImageType;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface ArtworkImageInsert {
  id?: string;
  user_id?: string;
  artwork_id: string;
  storage_path: string;
  file_name: string;
  image_type?: ImageType;
  is_primary?: boolean;
  sort_order?: number;
  created_at?: string;
}

export type ArtworkImageUpdate = Partial<ArtworkImageInsert>;

// -- artwork_movements -------------------------------------------------------

export interface ArtworkMovementRow {
  id: string;
  user_id: string;
  artwork_id: string;
  from_location: string | null;
  to_location: string;
  gallery_id: string | null;
  movement_date: string;
  movement_type: string;
  notes: string | null;
  created_at: string;
}

export interface ArtworkMovementInsert {
  id?: string;
  user_id?: string;
  artwork_id: string;
  from_location?: string | null;
  to_location: string;
  gallery_id?: string | null;
  movement_date: string;
  movement_type: string;
  notes?: string | null;
  created_at?: string;
}

export type ArtworkMovementUpdate = Partial<ArtworkMovementInsert>;

// -- sales -------------------------------------------------------------------

export interface SaleRow {
  id: string;
  user_id: string;
  artwork_id: string;
  gallery_id: string | null;
  sale_date: string;
  sale_price: number;
  currency: Currency;
  contact_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  commission_percent: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleInsert {
  id?: string;
  user_id?: string;
  artwork_id: string;
  gallery_id?: string | null;
  contact_id?: string | null;
  sale_date: string;
  sale_price: number;
  currency?: Currency;
  buyer_name?: string | null;
  buyer_email?: string | null;
  commission_percent?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type SaleUpdate = Partial<SaleInsert>;

// -- deliveries --------------------------------------------------------------

export interface DeliveryRow {
  id: string;
  user_id: string;
  delivery_number: string;
  gallery_id: string | null;
  recipient_name: string;
  recipient_address: string | null;
  delivery_date: string | null;
  status: DeliveryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryInsert {
  id?: string;
  user_id?: string;
  delivery_number: string;
  gallery_id?: string | null;
  recipient_name: string;
  recipient_address?: string | null;
  delivery_date?: string | null;
  status?: DeliveryStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type DeliveryUpdate = Partial<DeliveryInsert>;

// -- delivery_items ----------------------------------------------------------

export interface DeliveryItemRow {
  id: string;
  user_id: string;
  delivery_id: string;
  artwork_id: string;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export interface DeliveryItemInsert {
  id?: string;
  user_id?: string;
  delivery_id: string;
  artwork_id: string;
  sort_order?: number;
  notes?: string | null;
  created_at?: string;
}

export type DeliveryItemUpdate = Partial<DeliveryItemInsert>;

// -- packing_lists -----------------------------------------------------------

export interface PackingListRow {
  id: string;
  user_id: string;
  packing_number: string;
  delivery_id: string | null;
  recipient_name: string;
  packing_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackingListInsert {
  id?: string;
  user_id?: string;
  packing_number: string;
  delivery_id?: string | null;
  recipient_name: string;
  packing_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PackingListUpdate = Partial<PackingListInsert>;

// -- packing_list_items ------------------------------------------------------

export interface PackingListItemRow {
  id: string;
  user_id: string;
  packing_list_id: string;
  artwork_id: string;
  crate_number: string | null;
  packaging_type: string | null;
  special_handling: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export interface PackingListItemInsert {
  id?: string;
  user_id?: string;
  packing_list_id: string;
  artwork_id: string;
  crate_number?: string | null;
  packaging_type?: string | null;
  special_handling?: string | null;
  sort_order?: number;
  notes?: string | null;
  created_at?: string;
}

export type PackingListItemUpdate = Partial<PackingListItemInsert>;

// -- production_orders -------------------------------------------------------

export interface ProductionOrderRow {
  id: string;
  user_id: string;
  order_number: string;
  title: string;
  description: string | null;
  status: ProductionStatus;
  ordered_date: string | null;
  deadline: string | null;
  gallery_id: string | null;
  contact_id: string | null;
  price: number | null;
  currency: Currency;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionOrderInsert {
  id?: string;
  user_id?: string;
  order_number: string;
  title: string;
  description?: string | null;
  status?: ProductionStatus;
  ordered_date?: string | null;
  deadline?: string | null;
  gallery_id?: string | null;
  contact_id?: string | null;
  price?: number | null;
  currency?: Currency;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ProductionOrderUpdate = Partial<ProductionOrderInsert>;

// -- production_order_items --------------------------------------------------

export interface ProductionOrderItemRow {
  id: string;
  user_id: string;
  production_order_id: string;
  description: string;
  medium: string | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  dimension_unit: DimensionUnit;
  framed_height: number | null;
  framed_width: number | null;
  framed_depth: number | null;
  weight: number | null;
  year: number | null;
  edition_type: EditionType;
  edition_number: number | null;
  edition_total: number | null;
  price: number | null;
  currency: Currency;
  category: ArtworkCategory | null;
  motif: ArtworkMotif | null;
  series: ArtworkSeries | null;
  quantity: number;
  notes: string | null;
  artwork_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProductionOrderItemInsert {
  id?: string;
  user_id?: string;
  production_order_id: string;
  description: string;
  medium?: string | null;
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  dimension_unit?: DimensionUnit;
  framed_height?: number | null;
  framed_width?: number | null;
  framed_depth?: number | null;
  weight?: number | null;
  year?: number | null;
  edition_type?: EditionType;
  edition_number?: number | null;
  edition_total?: number | null;
  price?: number | null;
  currency?: Currency;
  category?: ArtworkCategory | null;
  motif?: ArtworkMotif | null;
  series?: ArtworkSeries | null;
  quantity?: number;
  notes?: string | null;
  artwork_id?: string | null;
  sort_order?: number;
  created_at?: string;
}

export type ProductionOrderItemUpdate = Partial<ProductionOrderItemInsert>;

// -- certificates ------------------------------------------------------------

export interface CertificateRow {
  id: string;
  user_id: string;
  artwork_id: string;
  certificate_number: string;
  issue_date: string;
  qr_code_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface CertificateInsert {
  id?: string;
  user_id?: string;
  artwork_id: string;
  certificate_number: string;
  issue_date: string;
  qr_code_url?: string | null;
  notes?: string | null;
  created_at?: string;
}

export type CertificateUpdate = Partial<CertificateInsert>;

// -- document_sequences ------------------------------------------------------

export interface DocumentSequenceRow {
  id: string;
  user_id: string;
  prefix: string;
  year: number;
  last_number: number;
}

export interface DocumentSequenceInsert {
  id?: string;
  user_id?: string;
  prefix: string;
  year: number;
  last_number?: number;
}

export type DocumentSequenceUpdate = Partial<DocumentSequenceInsert>;

// -- contacts ----------------------------------------------------------------

export interface ContactRow {
  id: string;
  user_id: string;
  type: ContactType;
  first_name: string;
  last_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tags: string[];
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactInsert {
  id?: string;
  user_id?: string;
  type?: ContactType;
  first_name: string;
  last_name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  tags?: string[];
  notes?: string | null;
  source?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ContactUpdate = Partial<ContactInsert>;

// -- interactions ------------------------------------------------------------

export interface InteractionRow {
  id: string;
  user_id: string;
  contact_id: string;
  type: InteractionType;
  subject: string | null;
  body: string | null;
  interaction_date: string;
  artwork_ids: string[];
  created_at: string;
}

export interface InteractionInsert {
  id?: string;
  user_id?: string;
  contact_id: string;
  type: InteractionType;
  subject?: string | null;
  body?: string | null;
  interaction_date?: string;
  artwork_ids?: string[];
  created_at?: string;
}

export type InteractionUpdate = Partial<InteractionInsert>;

// -- deals -------------------------------------------------------------------

export interface DealRow {
  id: string;
  user_id: string;
  contact_id: string;
  artwork_id: string | null;
  stage: DealStage;
  value: number | null;
  currency: Currency | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealInsert {
  id?: string;
  user_id?: string;
  contact_id: string;
  artwork_id?: string | null;
  stage?: DealStage;
  value?: number | null;
  currency?: Currency | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type DealUpdate = Partial<DealInsert>;

// -- tasks -------------------------------------------------------------------

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  contact_id: string | null;
  artwork_id: string | null;
  deal_id: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskInsert {
  id?: string;
  user_id?: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  contact_id?: string | null;
  artwork_id?: string | null;
  deal_id?: string | null;
  completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type TaskUpdate = Partial<TaskInsert>;

// -- wish_list_items ---------------------------------------------------------

export interface WishListItemRow {
  id: string;
  user_id: string;
  contact_id: string;
  artwork_id: string;
  added_date: string;
  notes: string | null;
  created_at: string;
}

export interface WishListItemInsert {
  id?: string;
  user_id?: string;
  contact_id: string;
  artwork_id: string;
  added_date?: string;
  notes?: string | null;
  created_at?: string;
}

export type WishListItemUpdate = Partial<WishListItemInsert>;

// -- condition_reports --------------------------------------------------------

export type ConditionGrade = 'excellent' | 'good' | 'fair' | 'damaged';

export interface ConditionReportRow {
  id: string;
  user_id: string;
  artwork_id: string;
  condition: ConditionGrade;
  report_date: string;
  movement_id: string | null;
  photos: string[];
  notes: string | null;
  reported_by: string | null;
  created_at: string;
}

export interface ConditionReportInsert {
  id?: string;
  user_id?: string;
  artwork_id: string;
  condition: ConditionGrade;
  report_date?: string;
  movement_id?: string | null;
  photos?: string[];
  notes?: string | null;
  reported_by?: string | null;
  created_at?: string;
}

export type ConditionReportUpdate = Partial<ConditionReportInsert>;

// -- insurance_records -------------------------------------------------------

export interface InsuranceRecordRow {
  id: string;
  user_id: string;
  artwork_id: string;
  insured_value: number;
  currency: Currency;
  insurer: string | null;
  policy_number: string | null;
  valid_from: string | null;
  valid_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsuranceRecordInsert {
  id?: string;
  user_id?: string;
  artwork_id: string;
  insured_value: number;
  currency?: Currency;
  insurer?: string | null;
  policy_number?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type InsuranceRecordUpdate = Partial<InsuranceRecordInsert>;

// -- valuations --------------------------------------------------------------

export interface ValuationRow {
  id: string;
  user_id: string;
  artwork_id: string;
  value: number;
  currency: Currency;
  appraiser: string | null;
  valuation_date: string;
  notes: string | null;
  created_at: string;
}

export interface ValuationInsert {
  id?: string;
  user_id?: string;
  artwork_id: string;
  value: number;
  currency?: Currency;
  appraiser?: string | null;
  valuation_date?: string;
  notes?: string | null;
  created_at?: string;
}

export type ValuationUpdate = Partial<ValuationInsert>;

// -- exhibitions -------------------------------------------------------------

export interface ExhibitionRow {
  id: string;
  user_id: string;
  title: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  catalogue_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExhibitionInsert {
  id?: string;
  user_id?: string;
  title: string;
  venue?: string | null;
  city?: string | null;
  country?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  catalogue_reference?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ExhibitionUpdate = Partial<ExhibitionInsert>;

// -- exhibition_artworks -----------------------------------------------------

export interface ExhibitionArtworkRow {
  id: string;
  user_id: string;
  exhibition_id: string;
  artwork_id: string;
  created_at: string;
}

export interface ExhibitionArtworkInsert {
  id?: string;
  user_id?: string;
  exhibition_id: string;
  artwork_id: string;
  created_at?: string;
}

export type ExhibitionArtworkUpdate = Partial<ExhibitionArtworkInsert>;

// -- loans -------------------------------------------------------------------

export type LoanStatus = 'pending' | 'active' | 'returned';

export interface LoanRow {
  id: string;
  user_id: string;
  artwork_id: string;
  borrower: string;
  loan_start: string;
  loan_end: string | null;
  insurance_required: boolean;
  return_date: string | null;
  terms: string | null;
  status: LoanStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanInsert {
  id?: string;
  user_id?: string;
  artwork_id: string;
  borrower: string;
  loan_start: string;
  loan_end?: string | null;
  insurance_required?: boolean;
  return_date?: string | null;
  terms?: string | null;
  status?: LoanStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type LoanUpdate = Partial<LoanInsert>;

// -- expenses ----------------------------------------------------------------

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export type ExpenseCategory = 'framing' | 'shipping' | 'photography' | 'restoration' | 'insurance' | 'storage' | 'other';

export interface ExpenseRow {
  id: string;
  user_id: string;
  artwork_id: string | null;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  expense_date: string;
  vendor: string | null;
  receipt_path: string | null;
  notes: string | null;
  created_at: string;
}

export interface ExpenseInsert {
  id?: string;
  user_id?: string;
  artwork_id?: string | null;
  category: ExpenseCategory;
  amount: number;
  currency?: Currency;
  expense_date?: string;
  vendor?: string | null;
  receipt_path?: string | null;
  notes?: string | null;
  created_at?: string;
}

export type ExpenseUpdate = Partial<ExpenseInsert>;

// -- price_history -----------------------------------------------------------

export interface PriceHistoryRow {
  id: string;
  user_id: string;
  artwork_id: string;
  price: number;
  currency: Currency;
  effective_date: string;
  notes: string | null;
  created_at: string;
}

export interface PriceHistoryInsert {
  id?: string;
  user_id?: string;
  artwork_id: string;
  price: number;
  currency?: Currency;
  effective_date?: string;
  notes?: string | null;
  created_at?: string;
}

export type PriceHistoryUpdate = Partial<PriceHistoryInsert>;

// -- invoices ----------------------------------------------------------------

export interface InvoiceRow {
  id: string;
  user_id: string;
  invoice_number: string;
  contact_id: string | null;
  gallery_id: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  total: number;
  currency: Currency;
  stripe_payment_link: string | null;
  stripe_payment_intent_id: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceInsert {
  id?: string;
  user_id?: string;
  invoice_number: string;
  contact_id?: string | null;
  gallery_id?: string | null;
  status?: InvoiceStatus;
  issue_date?: string;
  due_date?: string | null;
  total?: number;
  currency?: Currency;
  stripe_payment_link?: string | null;
  stripe_payment_intent_id?: string | null;
  paid_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type InvoiceUpdate = Partial<InvoiceInsert>;

// -- invoice_items -----------------------------------------------------------

export interface InvoiceItemRow {
  id: string;
  user_id: string;
  invoice_id: string;
  artwork_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface InvoiceItemInsert {
  id?: string;
  user_id?: string;
  invoice_id: string;
  artwork_id?: string | null;
  description: string;
  quantity?: number;
  unit_price: number;
  total: number;
  created_at?: string;
}

export type InvoiceItemUpdate = Partial<InvoiceItemInsert>;

// -- email_log ---------------------------------------------------------------

export type EmailStatus = 'sent' | 'failed' | 'bounced';

export interface EmailLogRow {
  id: string;
  user_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body_preview: string | null;
  artwork_ids: string[];
  contact_id: string | null;
  template_type: string | null;
  status: EmailStatus;
  sent_at: string;
  created_at: string;
}

export interface EmailLogInsert {
  id?: string;
  user_id?: string;
  from_email: string;
  to_email: string;
  subject: string;
  body_preview?: string | null;
  artwork_ids?: string[];
  contact_id?: string | null;
  template_type?: string | null;
  status?: EmailStatus;
  sent_at?: string;
  created_at?: string;
}

export type EmailLogUpdate = Partial<EmailLogInsert>;

// -- share_links -------------------------------------------------------------

export interface ShareLinkRow {
  id: string;
  user_id: string;
  token: string;
  artwork_ids: string[];
  image_types: string[];
  expiry: string | null;
  download_count: number;
  created_at: string;
}

export interface ShareLinkInsert {
  id?: string;
  user_id?: string;
  token: string;
  artwork_ids: string[];
  image_types?: string[];
  expiry?: string | null;
  download_count?: number;
  created_at?: string;
}

export type ShareLinkUpdate = Partial<ShareLinkInsert>;

// -- viewing_rooms ------------------------------------------------------------

export type ViewingRoomVisibility = 'public' | 'link_only' | 'password';

export interface ViewingRoomRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  slug: string;
  artwork_ids: string[];
  visibility: ViewingRoomVisibility;
  password_hash: string | null;
  contact_id: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ViewingRoomInsert {
  id?: string;
  user_id?: string;
  title: string;
  description?: string | null;
  slug: string;
  artwork_ids?: string[];
  visibility?: ViewingRoomVisibility;
  password_hash?: string | null;
  contact_id?: string | null;
  published?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ViewingRoomUpdate = Partial<ViewingRoomInsert>;

// -- user_profiles ------------------------------------------------------------

export type UserRole = 'admin' | 'gallery' | 'collector';

export interface UserProfileRow {
  id: string;
  user_id: string;
  role: UserRole;
  gallery_id: string | null;
  contact_id: string | null;
  display_name: string;
  created_at: string;
}

export interface UserProfileInsert {
  id?: string;
  user_id: string;
  role: UserRole;
  gallery_id?: string | null;
  contact_id?: string | null;
  display_name: string;
  created_at?: string;
}

export type UserProfileUpdate = Partial<UserProfileInsert>;

// -- activity_log -------------------------------------------------------------

export interface ActivityLogRow {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface ActivityLogInsert {
  id?: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  changes?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at?: string;
}

export type ActivityLogUpdate = Partial<ActivityLogInsert>;

// -- reminders ----------------------------------------------------------------

export type ReminderType = 'consignment_followup' | 'loan_return' | 'invoice_overdue' | 'task_due';

export interface ReminderRow {
  id: string;
  user_id: string;
  type: ReminderType;
  entity_type: string;
  entity_id: string;
  trigger_date: string;
  sent: boolean;
  notes: string | null;
  created_at: string;
}

export interface ReminderInsert {
  id?: string;
  user_id?: string;
  type: ReminderType;
  entity_type: string;
  entity_id: string;
  trigger_date: string;
  sent?: boolean;
  notes?: string | null;
  created_at?: string;
}

export type ReminderUpdate = Partial<ReminderInsert>;

// ---- Supabase Database type (standard pattern) -----------------------------

export interface Database {
  public: {
    Tables: {
      galleries: {
        Row: GalleryRow;
        Insert: GalleryInsert;
        Update: GalleryUpdate;
      };
      artworks: {
        Row: ArtworkRow;
        Insert: ArtworkInsert;
        Update: ArtworkUpdate;
      };
      artwork_images: {
        Row: ArtworkImageRow;
        Insert: ArtworkImageInsert;
        Update: ArtworkImageUpdate;
      };
      artwork_movements: {
        Row: ArtworkMovementRow;
        Insert: ArtworkMovementInsert;
        Update: ArtworkMovementUpdate;
      };
      sales: {
        Row: SaleRow;
        Insert: SaleInsert;
        Update: SaleUpdate;
      };
      deliveries: {
        Row: DeliveryRow;
        Insert: DeliveryInsert;
        Update: DeliveryUpdate;
      };
      delivery_items: {
        Row: DeliveryItemRow;
        Insert: DeliveryItemInsert;
        Update: DeliveryItemUpdate;
      };
      packing_lists: {
        Row: PackingListRow;
        Insert: PackingListInsert;
        Update: PackingListUpdate;
      };
      packing_list_items: {
        Row: PackingListItemRow;
        Insert: PackingListItemInsert;
        Update: PackingListItemUpdate;
      };
      production_orders: {
        Row: ProductionOrderRow;
        Insert: ProductionOrderInsert;
        Update: ProductionOrderUpdate;
      };
      production_order_items: {
        Row: ProductionOrderItemRow;
        Insert: ProductionOrderItemInsert;
        Update: ProductionOrderItemUpdate;
      };
      certificates: {
        Row: CertificateRow;
        Insert: CertificateInsert;
        Update: CertificateUpdate;
      };
      document_sequences: {
        Row: DocumentSequenceRow;
        Insert: DocumentSequenceInsert;
        Update: DocumentSequenceUpdate;
      };
      invoices: {
        Row: InvoiceRow;
        Insert: InvoiceInsert;
        Update: InvoiceUpdate;
      };
      invoice_items: {
        Row: InvoiceItemRow;
        Insert: InvoiceItemInsert;
        Update: InvoiceItemUpdate;
      };
      email_log: {
        Row: EmailLogRow;
        Insert: EmailLogInsert;
        Update: EmailLogUpdate;
      };
      share_links: {
        Row: ShareLinkRow;
        Insert: ShareLinkInsert;
        Update: ShareLinkUpdate;
      };
      contacts: {
        Row: ContactRow;
        Insert: ContactInsert;
        Update: ContactUpdate;
      };
      interactions: {
        Row: InteractionRow;
        Insert: InteractionInsert;
        Update: InteractionUpdate;
      };
      deals: {
        Row: DealRow;
        Insert: DealInsert;
        Update: DealUpdate;
      };
      tasks: {
        Row: TaskRow;
        Insert: TaskInsert;
        Update: TaskUpdate;
      };
      wish_list_items: {
        Row: WishListItemRow;
        Insert: WishListItemInsert;
        Update: WishListItemUpdate;
      };
      condition_reports: {
        Row: ConditionReportRow;
        Insert: ConditionReportInsert;
        Update: ConditionReportUpdate;
      };
      insurance_records: {
        Row: InsuranceRecordRow;
        Insert: InsuranceRecordInsert;
        Update: InsuranceRecordUpdate;
      };
      valuations: {
        Row: ValuationRow;
        Insert: ValuationInsert;
        Update: ValuationUpdate;
      };
      exhibitions: {
        Row: ExhibitionRow;
        Insert: ExhibitionInsert;
        Update: ExhibitionUpdate;
      };
      exhibition_artworks: {
        Row: ExhibitionArtworkRow;
        Insert: ExhibitionArtworkInsert;
        Update: ExhibitionArtworkUpdate;
      };
      loans: {
        Row: LoanRow;
        Insert: LoanInsert;
        Update: LoanUpdate;
      };
      expenses: {
        Row: ExpenseRow;
        Insert: ExpenseInsert;
        Update: ExpenseUpdate;
      };
      price_history: {
        Row: PriceHistoryRow;
        Insert: PriceHistoryInsert;
        Update: PriceHistoryUpdate;
      };
      viewing_rooms: {
        Row: ViewingRoomRow;
        Insert: ViewingRoomInsert;
        Update: ViewingRoomUpdate;
      };
      user_profiles: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
      };
      activity_log: {
        Row: ActivityLogRow;
        Insert: ActivityLogInsert;
        Update: ActivityLogUpdate;
      };
      reminders: {
        Row: ReminderRow;
        Insert: ReminderInsert;
        Update: ReminderUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
