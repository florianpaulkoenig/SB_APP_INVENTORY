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
  | 'on_consignment'
  | 'paid'
  | 'pending_sale'
  | 'archived'
  | 'destroyed'
  | 'donated';

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
  | 'skull'
  | 'sphere'
  | 'half_sphere'
  | 'other';

export type ArtworkColor =
  | 'green'
  | 'red'
  | 'white'
  | 'silver'
  | 'dark_grey'
  | 'other';

export type SizeCategory = 'small' | 'medium' | 'large' | 'monumental';

export type DimensionUnit = 'cm' | 'inches';

export type Currency = 'EUR' | 'USD' | 'CHF' | 'GBP';

export type DeliveryStatus = 'draft' | 'shipped' | 'delivered';

export type ForwardingStatus =
  | 'draft'
  | 'prepared'
  | 'shipped'
  | 'in_transit'
  | 'received';

export type ProductionStatus =
  | 'draft'
  | 'ordered'
  | 'in_production'
  | 'quality_check'
  | 'completed'
  | 'shipped'
  | 'consignment'    // ordered for consignment — exhibited & offered for sale
  | 'pre_sold'       // pre-sold order — collector already purchased, revenue confirmed
  | 'requested'      // production request — enquiry not yet confirmed
  | 'rejected';      // production request — declined

export type ProductionRecordType = 'order' | 'request';

export type ImageType = 'raw' | 'retouched' | 'detail';

export type EditionType = 'unique' | 'numbered' | 'AP' | 'HC' | 'EA';

export type ContactType = 'collector' | 'prospect' | 'institution';

export type InteractionType = 'email' | 'call' | 'meeting' | 'note';

export type DealStage = 'lead' | 'contacted' | 'quoted' | 'negotiating' | 'sold' | 'lost';

export type GalleryType = 'representative' | 'project' | 'agent';

export type GalleryStatusColor = 'green' | 'yellow' | 'red';

export type InstitutionType = 'museum' | 'foundation' | 'corporate' | 'university' | 'government' | 'other';

// ---- Table row / insert / update types -------------------------------------

// -- artists -----------------------------------------------------------------

export type ArtistRow = {
  id: string;
  user_id: string;
  portfolio: string;
  name: string;
  nationality: string | null;
  birth_year: number | null;
  biography: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ArtistInsert = {
  id?: string;
  user_id?: string;
  portfolio?: string;
  name: string;
  nationality?: string | null;
  birth_year?: number | null;
  biography?: string | null;
  website?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ArtistUpdate = Partial<ArtistInsert>;

// -- galleries ---------------------------------------------------------------

export type GalleryRow = {
  id: string;
  user_id: string;
  name: string;
  type: GalleryType;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  commission_rate: number | null;
  commission_gallery: number | null;
  commission_noa: number | null;
  commission_artist: number | null;
  status_color: GalleryStatusColor | null;
  sell_through_override: number | null;
  notes: string | null;
  agreement_storage_path: string | null;
  agreement_signed: boolean;
  created_at: string;
  updated_at: string;
}

export type GalleryInsert = {
  id?: string;
  user_id?: string;
  name: string;
  type?: GalleryType;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  commission_rate?: number | null;
  commission_gallery?: number | null;
  commission_noa?: number | null;
  commission_artist?: number | null;
  status_color?: GalleryStatusColor | null;
  sell_through_override?: number | null;
  notes?: string | null;
  agreement_storage_path?: string | null;
  agreement_signed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type GalleryUpdate = Partial<GalleryInsert>;

// -- artworks ----------------------------------------------------------------

export type ArtworkRow = {
  id: string;
  user_id: string;
  inventory_number: string;
  reference_code: string;
  title: string;
  title_secondary: string | null;
  medium: string | null;
  year: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  is_circular: boolean;
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
  color: ArtworkColor | null;
  notes: string | null;
  artist_name: string | null;
  artist_id: string | null;
  consigned_since: string | null;
  available_for_partners: boolean;
  is_window: boolean;
  lamination_needed: boolean;
  lamination_cost: number | null;
  released_at: string | null;
  size_category: SizeCategory | null;
  created_at: string;
  updated_at: string;
  portfolio: string;
  purchase_price: number | null;
  purchase_currency: string | null;
  purchase_date: string | null;
  estimated_value: number | null;
  estimated_value_date: string | null;
}

export type ArtworkInsert = {
  id?: string;
  user_id?: string;
  inventory_number: string;
  reference_code: string;
  title: string;
  title_secondary?: string | null;
  medium?: string | null;
  year?: number | null;
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  is_circular?: boolean;
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
  color?: ArtworkColor | null;
  notes?: string | null;
  artist_name?: string | null;
  artist_id?: string | null;
  consigned_since?: string | null;
  available_for_partners?: boolean;
  is_window?: boolean;
  lamination_needed?: boolean;
  lamination_cost?: number | null;
  released_at?: string | null;
  size_category?: SizeCategory | null;
  created_at?: string;
  updated_at?: string;
  portfolio?: string;
  purchase_price?: number | null;
  purchase_currency?: string | null;
  purchase_date?: string | null;
  estimated_value?: number | null;
  estimated_value_date?: string | null;
}

export type ArtworkUpdate = Partial<ArtworkInsert>;

// -- artwork_images ----------------------------------------------------------

export type ArtworkImageRow = {
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

export type ArtworkImageInsert = {
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

export type ArtworkMovementRow = {
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

export type ArtworkMovementInsert = {
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

export type SaleType = 'art_fair' | 'exhibition' | 'direct';
export type ReportingStatus = 'draft' | 'reserved' | 'sold_pending_details' | 'sold_reported' | 'verified';
export type SaleLocationT = 'gallery' | 'fair' | 'exhibition' | 'private' | 'online';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type CollectorAnonymityMode = 'named' | 'anonymous' | 'private';

export type SaleRow = {
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
  sale_city: string | null;
  sale_country: string | null;
  sale_type: string | null;
  source_exhibition_id: string | null;
  notes: string | null;
  reporting_status: ReportingStatus;
  reporting_due_date: string | null;
  reported_at: string | null;
  sale_location_type: SaleLocationT | null;
  discount_percent: number | null;
  final_invoiced_amount: number | null;
  negotiation_notes: string | null;
  payment_status: PaymentStatus;
  payment_expected_date: string | null;
  sales_channel: string | null;
  collector_anonymity_mode: CollectorAnonymityMode;
  created_at: string;
  updated_at: string;
}

export type SaleInsert = {
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
  sale_city?: string | null;
  sale_country?: string | null;
  sale_type?: string | null;
  source_exhibition_id?: string | null;
  notes?: string | null;
  reporting_status?: ReportingStatus;
  reporting_due_date?: string | null;
  reported_at?: string | null;
  sale_location_type?: SaleLocationT | null;
  discount_percent?: number | null;
  final_invoiced_amount?: number | null;
  negotiation_notes?: string | null;
  payment_status?: PaymentStatus;
  payment_expected_date?: string | null;
  sales_channel?: string | null;
  collector_anonymity_mode?: CollectorAnonymityMode;
  created_at?: string;
  updated_at?: string;
}

export type SaleUpdate = Partial<SaleInsert>;

// -- deliveries --------------------------------------------------------------

export type DeliveryRow = {
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
  portfolio: string;
}

export type DeliveryInsert = {
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
  portfolio?: string;
}

export type DeliveryUpdate = Partial<DeliveryInsert>;

// -- delivery_items ----------------------------------------------------------

export type DeliveryItemRow = {
  id: string;
  user_id: string;
  delivery_id: string;
  artwork_id: string;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export type DeliveryItemInsert = {
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

export type PackingListRow = {
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

export type PackingListInsert = {
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

// -- packing_list_crates -----------------------------------------------------

export type PackingListCrateRow = {
  id: string;
  user_id: string;
  packing_list_id: string;
  crate_name: string;
  width: number | null;
  height: number | null;
  depth: number | null;
  dimension_unit: string;
  weight: number | null;
  packaging_type: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type PackingListCrateInsert = {
  id?: string;
  user_id?: string;
  packing_list_id: string;
  crate_name: string;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  dimension_unit?: string;
  weight?: number | null;
  packaging_type?: string | null;
  notes?: string | null;
  sort_order?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export type PackingListCrateUpdate = Partial<PackingListCrateInsert>;

// -- packing_list_items ------------------------------------------------------

export type PackingListItemRow = {
  id: string;
  user_id: string;
  packing_list_id: string;
  artwork_id: string;
  crate_id: string | null;
  crate_number: string | null;
  packaging_type: string | null;
  special_handling: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export type PackingListItemInsert = {
  id?: string;
  user_id?: string;
  packing_list_id: string;
  artwork_id: string;
  crate_id?: string | null;
  crate_number?: string | null;
  packaging_type?: string | null;
  special_handling?: string | null;
  sort_order?: number;
  notes?: string | null;
  created_at?: string;
}

export type PackingListItemUpdate = Partial<PackingListItemInsert>;

// -- production_orders -------------------------------------------------------

export type ProductionOrderRow = {
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
  planned_release_date: string | null;
  notes: string | null;
  show_price: boolean;
  created_at: string;
  updated_at: string;
  payment_expected_date: string | null;
  record_type: ProductionRecordType;
  request_number: string | null;
  converted_from_request_at: string | null;
  rejected_at: string | null;
}

export type ProductionOrderInsert = {
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
  planned_release_date?: string | null;
  notes?: string | null;
  show_price?: boolean;
  created_at?: string;
  updated_at?: string;
  payment_expected_date?: string | null;
  record_type?: ProductionRecordType;
  request_number?: string | null;
  converted_from_request_at?: string | null;
  rejected_at?: string | null;
}

export type ProductionOrderUpdate = Partial<ProductionOrderInsert>;

// -- production_order_items --------------------------------------------------

export type ProductionOrderItemRow = {
  id: string;
  user_id: string;
  production_order_id: string;
  description: string;
  medium: string | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  is_circular: boolean;
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
  color: ArtworkColor | null;
  quantity: number;
  notes: string | null;
  reference_code: string | null;
  reference_image_path: string | null;
  artwork_id: string | null;
  sort_order: number;
  created_at: string;
  is_window: boolean;
  lamination_needed: boolean;
  lamination_cost: number | null;
}

export type ProductionOrderItemInsert = {
  id?: string;
  user_id?: string;
  production_order_id: string;
  description: string;
  medium?: string | null;
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  is_circular?: boolean;
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
  color?: ArtworkColor | null;
  quantity?: number;
  notes?: string | null;
  reference_code?: string | null;
  reference_image_path?: string | null;
  artwork_id?: string | null;
  sort_order?: number;
  created_at?: string;
  is_window?: boolean;
  lamination_needed?: boolean;
  lamination_cost?: number | null;
}

export type ProductionOrderItemUpdate = Partial<ProductionOrderItemInsert>;

// -- gallery_forwarding_orders -----------------------------------------------

export type GalleryForwardingOrderRow = {
  id: string;
  user_id: string;
  forwarding_number: string;
  title: string;
  description: string | null;
  status: ForwardingStatus;
  from_gallery_id: string | null;
  to_gallery_id: string | null;
  contact_id: string | null;
  shipping_date: string | null;
  estimated_arrival: string | null;
  tracking_number: string | null;
  shipping_method: string | null;
  insurance_value: number | null;
  currency: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type GalleryForwardingOrderInsert = {
  id?: string;
  user_id?: string;
  forwarding_number: string;
  title: string;
  description?: string | null;
  status?: ForwardingStatus;
  from_gallery_id?: string | null;
  to_gallery_id?: string | null;
  contact_id?: string | null;
  shipping_date?: string | null;
  estimated_arrival?: string | null;
  tracking_number?: string | null;
  shipping_method?: string | null;
  insurance_value?: number | null;
  currency?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type GalleryForwardingOrderUpdate = Partial<GalleryForwardingOrderInsert>;

// -- gallery_forwarding_items ------------------------------------------------

export type GalleryForwardingItemRow = {
  id: string;
  user_id: string;
  forwarding_order_id: string;
  artwork_id: string;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export type GalleryForwardingItemInsert = {
  id?: string;
  user_id?: string;
  forwarding_order_id: string;
  artwork_id: string;
  sort_order?: number;
  notes?: string | null;
  created_at?: string;
}

export type GalleryForwardingItemUpdate = Partial<GalleryForwardingItemInsert>;

// -- certificates ------------------------------------------------------------

export type CertificateRow = {
  id: string;
  user_id: string;
  artwork_id: string;
  certificate_number: string;
  issue_date: string;
  qr_code_url: string | null;
  pdf_path: string | null;
  notes: string | null;
  created_at: string;
}

export type CertificateInsert = {
  id?: string;
  user_id?: string;
  artwork_id: string;
  certificate_number: string;
  issue_date: string;
  qr_code_url?: string | null;
  pdf_path?: string | null;
  notes?: string | null;
  created_at?: string;
}

export type CertificateUpdate = Partial<CertificateInsert>;

// -- document_sequences ------------------------------------------------------

export type DocumentSequenceRow = {
  id: string;
  user_id: string;
  prefix: string;
  year: number;
  last_number: number;
}

export type DocumentSequenceInsert = {
  id?: string;
  user_id?: string;
  prefix: string;
  year: number;
  last_number?: number;
}

export type DocumentSequenceUpdate = Partial<DocumentSequenceInsert>;

// -- contacts ----------------------------------------------------------------

export type ContactRow = {
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

export type ContactInsert = {
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

export type InteractionRow = {
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

export type InteractionInsert = {
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

export type DealRow = {
  id: string;
  user_id: string;
  contact_id: string;
  artwork_id: string | null;
  stage: DealStage;
  value: number | null;
  currency: Currency | null;
  notes: string | null;
  stage_changed_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type DealInsert = {
  id?: string;
  user_id?: string;
  contact_id: string;
  artwork_id?: string | null;
  stage?: DealStage;
  value?: number | null;
  currency?: Currency | null;
  notes?: string | null;
  stage_changed_at?: string | null;
  lost_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type DealUpdate = Partial<DealInsert>;

// -- tasks -------------------------------------------------------------------

export type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  contact_id: string | null;
  artwork_id: string | null;
  deal_id: string | null;
  gallery_id: string | null;
  exhibition_id: string | null;
  invoice_id: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export type TaskInsert = {
  id?: string;
  user_id?: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  contact_id?: string | null;
  artwork_id?: string | null;
  deal_id?: string | null;
  gallery_id?: string | null;
  exhibition_id?: string | null;
  invoice_id?: string | null;
  completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type TaskUpdate = Partial<TaskInsert>;

// -- wish_list_items ---------------------------------------------------------

export type WishListItemRow = {
  id: string;
  user_id: string;
  contact_id: string;
  artwork_id: string;
  added_date: string;
  notes: string | null;
  created_at: string;
}

export type WishListItemInsert = {
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

export type ConditionReportRow = {
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

export type ConditionReportInsert = {
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

export type InsuranceRecordRow = {
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

export type InsuranceRecordInsert = {
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

export type ValuationRow = {
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

export type ValuationInsert = {
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

export type ExhibitionType = 'exhibition' | 'art_fair' | 'solo_show' | 'group_show';

export type ExhibitionRow = {
  id: string;
  user_id: string;
  title: string;
  type: ExhibitionType;
  venue: string | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  catalogue_reference: string | null;
  gallery_id: string | null;
  contact_id: string | null;
  budget: number | null;
  budget_currency: Currency | null;
  notes: string | null;
  description_text: string | null;
  created_at: string;
  updated_at: string;
  portfolio: string;
  pdf_settings: unknown | null;
}

export type ExhibitionInsert = {
  id?: string;
  user_id?: string;
  title: string;
  type?: ExhibitionType;
  venue?: string | null;
  city?: string | null;
  country?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  catalogue_reference?: string | null;
  gallery_id?: string | null;
  contact_id?: string | null;
  budget?: number | null;
  budget_currency?: Currency | null;
  notes?: string | null;
  description_text?: string | null;
  created_at?: string;
  updated_at?: string;
  portfolio?: string;
  pdf_settings?: unknown | null;
}

export type ExhibitionUpdate = Partial<ExhibitionInsert>;

// -- exhibition_floor_plans ---------------------------------------------------

export type ExhibitionFloorPlanRow = {
  id: string;
  user_id: string;
  exhibition_id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
  description: string | null;
  created_at: string;
}

export type ExhibitionFloorPlanInsert = {
  id?: string;
  user_id?: string;
  exhibition_id: string;
  storage_path: string;
  file_name: string;
  sort_order?: number;
  description?: string | null;
  created_at?: string;
}

// -- exhibition_artworks -----------------------------------------------------

export type ExhibitionArtworkRow = {
  id: string;
  user_id: string;
  exhibition_id: string;
  artwork_id: string;
  created_at: string;
}

export type ExhibitionArtworkInsert = {
  id?: string;
  user_id?: string;
  exhibition_id: string;
  artwork_id: string;
  created_at?: string;
}

export type ExhibitionArtworkUpdate = Partial<ExhibitionArtworkInsert>;

// -- projects ----------------------------------------------------------------

export type ProjectStatus = 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

export type ProjectRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  color: string | null;
  gallery_id: string | null;
  contact_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectInsert = {
  id?: string;
  user_id?: string;
  title: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: ProjectStatus;
  color?: string | null;
  gallery_id?: string | null;
  contact_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ProjectUpdate = Partial<ProjectInsert>;

// -- exhibition_production_orders ---------------------------------------------

export type ExhibitionProductionOrderRow = {
  id: string;
  user_id: string;
  exhibition_id: string;
  production_order_id: string;
  created_at: string;
}

export type ExhibitionProductionOrderInsert = {
  id?: string;
  user_id?: string;
  exhibition_id: string;
  production_order_id: string;
  created_at?: string;
}

// -- project_artworks ---------------------------------------------------------

export type ProjectArtworkRow = {
  id: string;
  user_id: string;
  project_id: string;
  artwork_id: string;
  created_at: string;
}

export type ProjectArtworkInsert = {
  id?: string;
  user_id?: string;
  project_id: string;
  artwork_id: string;
  created_at?: string;
}

// -- project_production_orders ------------------------------------------------

export type ProjectProductionOrderRow = {
  id: string;
  user_id: string;
  project_id: string;
  production_order_id: string;
  created_at: string;
}

export type ProjectProductionOrderInsert = {
  id?: string;
  user_id?: string;
  project_id: string;
  production_order_id: string;
  created_at?: string;
}

// -- production_order_documents ----------------------------------------------

export type ProductionOrderDocumentRow = {
  id: string;
  user_id: string;
  production_order_id: string;
  file_name: string;
  storage_path: string;
  created_at: string;
}

export type ProductionOrderDocumentInsert = {
  id?: string;
  user_id?: string;
  production_order_id: string;
  file_name: string;
  storage_path: string;
  created_at?: string | null;
}

// -- loans -------------------------------------------------------------------

export type LoanStatus = 'pending' | 'active' | 'returned';

export type LoanRow = {
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

export type LoanInsert = {
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

export type ExpenseRow = {
  id: string;
  user_id: string;
  artwork_id: string | null;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  expense_date: string;
  vendor: string | null;
  receipt_path: string | null;
  exhibition_id: string | null;
  notes: string | null;
  created_at: string;
}

export type ExpenseInsert = {
  id?: string;
  user_id?: string;
  artwork_id?: string | null;
  category: ExpenseCategory;
  amount: number;
  currency?: Currency;
  expense_date?: string;
  vendor?: string | null;
  receipt_path?: string | null;
  exhibition_id?: string | null;
  notes?: string | null;
  created_at?: string;
}

export type ExpenseUpdate = Partial<ExpenseInsert>;

// -- price_history -----------------------------------------------------------

export type PriceHistoryRow = {
  id: string;
  user_id: string;
  artwork_id: string;
  price: number;
  currency: Currency;
  effective_date: string;
  notes: string | null;
  created_at: string;
}

export type PriceHistoryInsert = {
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

export type InvoiceRow = {
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

export type InvoiceInsert = {
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

export type InvoiceItemRow = {
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

export type InvoiceItemInsert = {
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

export type EmailLogRow = {
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

export type EmailLogInsert = {
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

export type ShareLinkRow = {
  id: string;
  user_id: string;
  token: string;
  artwork_ids: string[];
  image_types: string[];
  expiry: string | null;
  download_count: number;
  created_at: string;
  portfolio: string;
}

export type ShareLinkInsert = {
  id?: string;
  user_id?: string;
  token: string;
  artwork_ids: string[];
  image_types?: string[];
  expiry?: string | null;
  download_count?: number;
  created_at?: string;
  portfolio?: string;
}

export type ShareLinkUpdate = Partial<ShareLinkInsert>;

// -- viewing_rooms ------------------------------------------------------------

export type ViewingRoomVisibility = 'public' | 'link_only' | 'password';
export type ViewingRoomTemplate = 'grid' | 'carousel' | 'editorial';

export type ViewingRoomRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  slug: string;
  artwork_ids: string[];
  visibility: ViewingRoomVisibility;
  template: ViewingRoomTemplate;
  password_hash: string | null;
  contact_id: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  branding: unknown | null;
  portfolio: string;
}

export type ViewingRoomInsert = {
  id?: string;
  user_id?: string;
  title: string;
  description?: string | null;
  slug: string;
  artwork_ids?: string[];
  visibility?: ViewingRoomVisibility;
  template?: ViewingRoomTemplate;
  password_hash?: string | null;
  contact_id?: string | null;
  published?: boolean;
  created_at?: string;
  updated_at?: string;
  branding?: unknown | null;
  portfolio?: string;
}

export type ViewingRoomUpdate = Partial<ViewingRoomInsert>;

// -- viewing_room_views -------------------------------------------------------

export type ViewingRoomViewRow = {
  id: string;
  viewing_room_id: string;
  viewed_at: string;
  viewer_ip: string | null;
}

// -- user_profiles ------------------------------------------------------------

export type UserRole = 'admin' | 'gallery' | 'collector';

export type UserProfileRow = {
  id: string;
  user_id: string;
  role: UserRole;
  gallery_id: string | null;
  contact_id: string | null;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export type UserProfileInsert = {
  id?: string;
  user_id: string;
  role: UserRole;
  gallery_id?: string | null;
  contact_id?: string | null;
  display_name: string;
  created_at?: string;
  updated_at?: string;
}

export type UserProfileUpdate = Partial<UserProfileInsert>;

// -- activity_log -------------------------------------------------------------

export type ActivityLogRow = {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export type ActivityLogInsert = {
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

export type ReminderRow = {
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

export type ReminderInsert = {
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

// -- gallery_team_members -----------------------------------------------------

export type GalleryTeamMemberRow = {
  id: string;
  user_id: string;
  gallery_id: string;
  name: string;
  role_title: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type GalleryTeamMemberInsert = {
  id?: string;
  user_id?: string;
  gallery_id: string;
  name: string;
  role_title?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export type GalleryTeamMemberUpdate = Partial<GalleryTeamMemberInsert>;

// ---- Artwork Templates (predefined artworks) --------------------------------

export type ArtworkTemplateRow = {
  id: string;
  user_id: string;
  name: string;
  medium: string | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  dimension_unit: DimensionUnit;
  framed_height: number | null;
  framed_width: number | null;
  framed_depth: number | null;
  weight: number | null;
  edition_type: EditionType;
  price: number | null;
  currency: Currency;
  category: ArtworkCategory | null;
  motif: ArtworkMotif | null;
  series: ArtworkSeries | null;
  color: ArtworkColor | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export type ArtworkTemplateInsert = {
  id?: string;
  user_id?: string;
  name: string;
  medium?: string | null;
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  dimension_unit?: DimensionUnit;
  framed_height?: number | null;
  framed_width?: number | null;
  framed_depth?: number | null;
  weight?: number | null;
  edition_type?: EditionType;
  price?: number | null;
  currency?: Currency;
  category?: ArtworkCategory | null;
  motif?: ArtworkMotif | null;
  series?: ArtworkSeries | null;
  color?: ArtworkColor | null;
  notes?: string | null;
  sort_order?: number;
  created_at?: string;
}

export type ArtworkTemplateUpdate = Partial<ArtworkTemplateInsert>;

// -- public_collections -------------------------------------------------------

export type PublicCollectionRow = {
  id: string;
  user_id: string;
  name: string;
  city: string | null;
  country: string | null;
  institution_type: InstitutionType | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicCollectionInsert = {
  id?: string;
  user_id?: string;
  name: string;
  city?: string | null;
  country?: string | null;
  institution_type?: InstitutionType | null;
  website?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PublicCollectionUpdate = Partial<PublicCollectionInsert>;

// -- artwork_collections ------------------------------------------------------

export type ArtworkCollectionRow = {
  id: string;
  user_id: string;
  artwork_id: string;
  collection_id: string;
  acquisition_year: number | null;
  notes: string | null;
  created_at: string;
}

export type ArtworkCollectionInsert = {
  id?: string;
  user_id?: string;
  artwork_id: string;
  collection_id: string;
  acquisition_year?: number | null;
  notes?: string | null;
  created_at?: string;
}

export type ArtworkCollectionUpdate = Partial<ArtworkCollectionInsert>;

// -- enquiries ---------------------------------------------------------------

export type EnquirySource = 'email' | 'instagram' | 'website' | 'art_fair' | 'phone' | 'referral' | 'other';
export type EnquiryStatus = 'new' | 'reviewing' | 'converted' | 'archived';
export type EnquiryPriority = 'low' | 'normal' | 'high' | 'urgent';

export type EnquiryRow = {
  id: string;
  user_id: string;
  source: EnquirySource;
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  subject: string | null;
  body: string | null;
  interest_description: string | null;
  interested_artwork_ids: string[];
  location_city: string | null;
  location_country: string | null;
  estimated_value: number | null;
  currency: Currency;
  priority: EnquiryPriority;
  status: EnquiryStatus;
  converted_deal_id: string | null;
  converted_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export type EnquiryInsert = {
  id?: string;
  user_id?: string;
  source?: EnquirySource;
  sender_name?: string | null;
  sender_email?: string | null;
  sender_phone?: string | null;
  subject?: string | null;
  body?: string | null;
  interest_description?: string | null;
  interested_artwork_ids?: string[];
  location_city?: string | null;
  location_country?: string | null;
  estimated_value?: number | null;
  currency?: Currency;
  priority?: EnquiryPriority;
  status?: EnquiryStatus;
  converted_deal_id?: string | null;
  converted_contact_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type EnquiryUpdate = Partial<EnquiryInsert>;

// -- exhibition_galleries ----------------------------------------------------

export type ExhibitionGalleryRow = {
  id: string;
  user_id: string;
  exhibition_id: string;
  gallery_id: string;
  booth_number: string | null;
  notes: string | null;
  created_at: string;
}

export type ExhibitionGalleryInsert = {
  id?: string;
  user_id?: string;
  exhibition_id: string;
  gallery_id: string;
  booth_number?: string | null;
  notes?: string | null;
  created_at?: string;
}

export type ExhibitionGalleryUpdate = Partial<ExhibitionGalleryInsert>;

// -- auction_alerts ----------------------------------------------------------

export type AuctionResult = 'upcoming' | 'sold' | 'bought_in' | 'withdrawn' | 'pending';

export type AuctionAlertRow = {
  id: string;
  user_id: string;
  auction_house: string;
  sale_title: string | null;
  sale_date: string | null;
  lot_number: string | null;
  artwork_title: string;
  artwork_description: string | null;
  estimate_low: number | null;
  estimate_high: number | null;
  currency: Currency;
  hammer_price: number | null;
  result: AuctionResult;
  matched_artwork_id: string | null;
  matched_gallery_id: string | null;
  source_url: string | null;
  ai_detected: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AuctionAlertInsert = {
  id?: string;
  user_id?: string;
  auction_house: string;
  sale_title?: string | null;
  sale_date?: string | null;
  lot_number?: string | null;
  artwork_title: string;
  artwork_description?: string | null;
  estimate_low?: number | null;
  estimate_high?: number | null;
  currency?: Currency;
  hammer_price?: number | null;
  result?: AuctionResult;
  matched_artwork_id?: string | null;
  matched_gallery_id?: string | null;
  source_url?: string | null;
  ai_detected?: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type AuctionAlertUpdate = Partial<AuctionAlertInsert>;

// -- price_intelligence_reports ----------------------------------------------

export type PriceReportType = 'market_analysis' | 'price_recommendation' | 'auction_review';

export type PriceIntelligenceReportRow = {
  id: string;
  user_id: string;
  report_type: PriceReportType;
  title: string;
  summary: string | null;
  report_data: Record<string, unknown>;
  ai_model: string | null;
  created_at: string;
}

// -- anonymous_collectors ----------------------------------------------------

export type CollectorSegment = 'new' | 'returning' | 'vip' | 'institutional';

export type AnonymousCollectorRow = {
  id: string;
  user_id: string;
  anonymous_id: string;
  city: string | null;
  country: string | null;
  collector_type: string | null;
  segment: CollectorSegment | null;
  acquisition_pattern: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AnonymousCollectorInsert = {
  id?: string;
  user_id?: string;
  anonymous_id: string;
  city?: string | null;
  country?: string | null;
  collector_type?: string | null;
  segment?: CollectorSegment | null;
  acquisition_pattern?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type AnonymousCollectorUpdate = Partial<AnonymousCollectorInsert>;

// -- partner_score_snapshots -------------------------------------------------

export type PartnerScoreSnapshotRow = {
  id: string;
  user_id: string;
  gallery_id: string;
  score: number;
  factors_json: Record<string, unknown> | null;
  calculated_at: string;
}

export type PartnerScoreSnapshotInsert = {
  id?: string;
  user_id?: string;
  gallery_id: string;
  score: number;
  factors_json?: Record<string, unknown> | null;
  calculated_at?: string;
}

export type PartnerScoreSnapshotUpdate = Partial<PartnerScoreSnapshotInsert>;

// -- reporting_reminders -----------------------------------------------------

export type ReportingReminderType = 'upcoming' | 'due' | 'overdue';
export type ReminderStatus = 'pending' | 'sent' | 'dismissed';

export type ReportingReminderRow = {
  id: string;
  user_id: string;
  sale_id: string;
  reminder_type: ReportingReminderType;
  due_date: string;
  sent_at: string | null;
  status: ReminderStatus;
  created_at: string;
}

export type ReportingReminderInsert = {
  id?: string;
  user_id?: string;
  sale_id: string;
  reminder_type: ReportingReminderType;
  due_date: string;
  sent_at?: string | null;
  status?: ReminderStatus;
  created_at?: string;
}

export type ReportingReminderUpdate = Partial<ReportingReminderInsert>;

// -- gallery_access_tiers ----------------------------------------------------

export type AccessTier = 'standard' | 'priority' | 'premium';

export type GalleryAccessTierRow = {
  id: string;
  user_id: string;
  gallery_id: string;
  tier: AccessTier;
  unlocked_features: string[] | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export type GalleryAccessTierInsert = {
  id?: string;
  user_id?: string;
  gallery_id: string;
  tier?: AccessTier;
  unlocked_features?: string[] | null;
  valid_until?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type GalleryAccessTierUpdate = Partial<GalleryAccessTierInsert>;

// -- career_milestones -------------------------------------------------------

export type MilestoneType = 'exhibition' | 'museum_show' | 'publication' | 'award' | 'institutional' | 'collection' | 'fair';

export type CareerMilestoneRow = {
  id: string;
  user_id: string;
  year: number;
  milestone_type: MilestoneType;
  title: string;
  description: string | null;
  institution: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export type CareerMilestoneInsert = {
  id?: string;
  user_id?: string;
  year: number;
  milestone_type: MilestoneType;
  title: string;
  description?: string | null;
  institution?: string | null;
  city?: string | null;
  country?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CareerMilestoneUpdate = Partial<CareerMilestoneInsert>;

// -- ai_insights -------------------------------------------------------------

export type AiInsightCategory =
  | 'pricing'
  | 'inventory'
  | 'sales'
  | 'collector'
  | 'gallery'
  | 'exhibition'
  | 'production'
  | 'market'
  | 'strategic';

export type AiInsightPriority = 'critical' | 'high' | 'medium' | 'low';

export type AiInsightStatus = 'new' | 'read' | 'acted' | 'dismissed' | 'expired';

export type AiInsightTrigger = 'scheduled' | 'on_demand' | 'threshold';

export type AiInsightRow = {
  id: string;
  user_id: string;
  category: AiInsightCategory;
  priority: AiInsightPriority;
  title: string;
  summary: string;
  analysis: string;
  recommendations: string[] | null;
  data_snapshot: Record<string, unknown> | null;
  status: AiInsightStatus;
  expires_at: string | null;
  acted_at: string | null;
  trigger: AiInsightTrigger;
  ai_model: string | null;
  created_at: string;
}

export type AiInsightInsert = {
  id?: string;
  user_id?: string;
  category: AiInsightCategory;
  priority?: AiInsightPriority;
  title: string;
  summary: string;
  analysis: string;
  recommendations?: string[] | null;
  data_snapshot?: Record<string, unknown> | null;
  status?: AiInsightStatus;
  expires_at?: string | null;
  acted_at?: string | null;
  trigger: AiInsightTrigger;
  ai_model?: string | null;
  created_at?: string;
}

export type AiInsightUpdate = Partial<AiInsightInsert>;

// -- ai_conversations --------------------------------------------------------

export type AiConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type AiConversationRow = {
  id: string;
  user_id: string;
  title: string | null;
  messages: AiConversationMessage[];
  context_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type AiConversationInsert = {
  id?: string;
  user_id?: string;
  title?: string | null;
  messages?: AiConversationMessage[];
  context_snapshot?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export type AiConversationUpdate = Partial<AiConversationInsert>;

// -- ai_rate_limits ----------------------------------------------------------

export type AiRateLimitRow = {
  user_id: string;
  mode: string;
  window_date: string;
  call_count: number;
}

export type AiRateLimitInsert = {
  user_id?: string;
  mode: string;
  window_date?: string;
  call_count?: number;
}

export type AiRateLimitUpdate = Partial<AiRateLimitInsert>;

// -- ai_insight_feedback -----------------------------------------------------

export type AiFeedbackRating = 'positive' | 'negative';

export type AiInsightFeedbackRow = {
  id: string;
  user_id: string;
  insight_id: string;
  rating: AiFeedbackRating;
  comment: string | null;
  insight_category: string;
  insight_priority: string;
  created_at: string;
}

export type AiInsightFeedbackInsert = {
  id?: string;
  user_id?: string;
  insight_id: string;
  rating: AiFeedbackRating;
  comment?: string | null;
  insight_category: string;
  insight_priority: string;
  created_at?: string;
}

export type AiInsightFeedbackUpdate = Partial<AiInsightFeedbackInsert>;

// ============================================================================
// NOA Liquidity types
// ============================================================================

export type NOALiquiditySettingsRow = {
  id: string;
  user_id: string;
  starting_balance: number;
  starting_balance_date: string;
  starting_balance_at: string | null;
  currency: string;
  effective_balance: number | null;
  effective_balance_date: string | null;
  updated_at: string;
}

export type NOALiquiditySettingsInsert = {
  id?: string;
  user_id?: string;
  starting_balance: number;
  starting_balance_date: string;
  starting_balance_at?: string | null;
  currency?: string;
  effective_balance?: number | null;
  effective_balance_date?: string | null;
  updated_at?: string;
}

export type NOALiquiditySettingsUpdate = Partial<NOALiquiditySettingsInsert>;

export type NOALiquidityActualBalanceRow = {
  id: string;
  user_id: string;
  year: number;
  month: number;   // 1-indexed
  balance: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NOALiquidityActualBalanceInsert = {
  id?: string;
  user_id?: string;
  year: number;
  month: number;
  balance: number;
  currency?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type NOALiquidityActualBalanceUpdate = Partial<NOALiquidityActualBalanceInsert>;

export type LiquidityExpenseType =
  | 'one_time'
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual';

export type NOALiquidityExpenseRow = {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  currency: string;
  type: LiquidityExpenseType;
  active: boolean;
  due_date: string | null;
  invoice_number: string | null;
  provisional: boolean;
  created_at: string;
  updated_at: string;
}

export type NOALiquidityExpenseInsert = {
  id?: string;
  user_id?: string;
  description: string;
  amount: number;
  currency?: string;
  type: LiquidityExpenseType;
  active?: boolean;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type NOALiquidityExpenseUpdate = Partial<NOALiquidityExpenseInsert>;

export type NOALiquidityIncomeRow = {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  currency: string;
  expected_date: string;
  notes: string | null;
  invoice_number: string | null;
  paid_at: string | null;   // null = unpaid, ISO string = paid timestamp
  provisional: boolean;
  created_at: string;
  updated_at: string;
}

export type NOALiquidityIncomeInsert = {
  id?: string;
  user_id?: string;
  description: string;
  amount: number;
  currency?: string;
  expected_date: string;
  notes?: string | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type NOALiquidityIncomeUpdate = Partial<NOALiquidityIncomeInsert>;

export type NOALiquidityBalanceCorrectionRow = {
  id: string;
  user_id: string;
  correction_date: string; // YYYY-MM-DD
  balance: number;
  currency: string;
  created_at: string;
}

export type NOALiquidityBalanceCorrectionInsert = {
  id?: string;
  user_id?: string;
  correction_date: string;
  balance: number;
  currency?: string;
  created_at?: string;
}

export type NOALiquidityExpensePaymentRow = {
  id: string;
  user_id: string;
  expense_id: string;
  year: number;
  month: number;   // 1-indexed
  paid_at: string; // ISO timestamp
  created_at: string;
}

// ---- Artwork Appraisals ----------------------------------------------------

export type AppraisalPurpose = 'insurance' | 'resale' | 'estate' | 'donation' | 'other';

export type ArtworkAppraisalRow = {
  id: string;
  user_id: string;
  artwork_id: string;
  appraisal_number: string;
  appraised_value: number;
  currency: string;
  appraisal_date: string;
  purpose: AppraisalPurpose;
  appraiser_name: string;
  appraiser_credentials: string | null;
  condition: string | null;
  provenance: string | null;
  sale_date: string | null;
  sale_price: number | null;
  sale_currency: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ArtworkAppraisalInsert = {
  id?: string;
  user_id?: string;
  artwork_id: string;
  appraisal_number: string;
  appraised_value: number;
  currency?: string;
  appraisal_date: string;
  purpose: AppraisalPurpose;
  appraiser_name?: string;
  appraiser_credentials?: string | null;
  condition?: string | null;
  provenance?: string | null;
  sale_date?: string | null;
  sale_price?: number | null;
  sale_currency?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ArtworkAppraisalUpdate = Partial<ArtworkAppraisalInsert>;

// ---- Supabase Database type (standard pattern) -----------------------------

export type Database = {
  public: {
    Tables: {
      galleries: {
        Row: GalleryRow;
        Insert: GalleryInsert;
        Update: GalleryUpdate;
        Relationships: [];
      };
      artworks: {
        Row: ArtworkRow;
        Insert: ArtworkInsert;
        Update: ArtworkUpdate;
        Relationships: [
          {
            foreignKeyName: 'artworks_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artworks_artist_id_fkey';
            columns: ['artist_id'];
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
        ];
      };
      artwork_images: {
        Row: ArtworkImageRow;
        Insert: ArtworkImageInsert;
        Update: ArtworkImageUpdate;
        Relationships: [
          {
            foreignKeyName: 'artwork_images_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      artwork_movements: {
        Row: ArtworkMovementRow;
        Insert: ArtworkMovementInsert;
        Update: ArtworkMovementUpdate;
        Relationships: [
          {
            foreignKeyName: 'artwork_movements_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artwork_movements_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
        ];
      };
      sales: {
        Row: SaleRow;
        Insert: SaleInsert;
        Update: SaleUpdate;
        Relationships: [
          {
            foreignKeyName: 'sales_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_source_exhibition_id_fkey';
            columns: ['source_exhibition_id'];
            referencedRelation: 'exhibitions';
            referencedColumns: ['id'];
          },
        ];
      };
      deliveries: {
        Row: DeliveryRow;
        Insert: DeliveryInsert;
        Update: DeliveryUpdate;
        Relationships: [
          {
            foreignKeyName: 'deliveries_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
        ];
      };
      delivery_items: {
        Row: DeliveryItemRow;
        Insert: DeliveryItemInsert;
        Update: DeliveryItemUpdate;
        Relationships: [
          {
            foreignKeyName: 'delivery_items_delivery_id_fkey';
            columns: ['delivery_id'];
            referencedRelation: 'deliveries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'delivery_items_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      packing_lists: {
        Row: PackingListRow;
        Insert: PackingListInsert;
        Update: PackingListUpdate;
        Relationships: [
          {
            foreignKeyName: 'packing_lists_delivery_id_fkey';
            columns: ['delivery_id'];
            referencedRelation: 'deliveries';
            referencedColumns: ['id'];
          },
        ];
      };
      packing_list_items: {
        Row: PackingListItemRow;
        Insert: PackingListItemInsert;
        Update: PackingListItemUpdate;
        Relationships: [
          {
            foreignKeyName: 'packing_list_items_packing_list_id_fkey';
            columns: ['packing_list_id'];
            referencedRelation: 'packing_lists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'packing_list_items_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'packing_list_items_crate_id_fkey';
            columns: ['crate_id'];
            referencedRelation: 'packing_list_crates';
            referencedColumns: ['id'];
          },
        ];
      };
      production_orders: {
        Row: ProductionOrderRow;
        Insert: ProductionOrderInsert;
        Update: ProductionOrderUpdate;
        Relationships: [
          {
            foreignKeyName: 'production_orders_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'production_orders_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
        ];
      };
      production_order_items: {
        Row: ProductionOrderItemRow;
        Insert: ProductionOrderItemInsert;
        Update: ProductionOrderItemUpdate;
        Relationships: [
          {
            foreignKeyName: 'production_order_items_production_order_id_fkey';
            columns: ['production_order_id'];
            referencedRelation: 'production_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'production_order_items_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      gallery_forwarding_orders: {
        Row: GalleryForwardingOrderRow;
        Insert: GalleryForwardingOrderInsert;
        Update: GalleryForwardingOrderUpdate;
        Relationships: [
          {
            foreignKeyName: 'gallery_forwarding_orders_from_gallery_id_fkey';
            columns: ['from_gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gallery_forwarding_orders_to_gallery_id_fkey';
            columns: ['to_gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gallery_forwarding_orders_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
        ];
      };
      gallery_forwarding_items: {
        Row: GalleryForwardingItemRow;
        Insert: GalleryForwardingItemInsert;
        Update: GalleryForwardingItemUpdate;
        Relationships: [
          {
            foreignKeyName: 'gallery_forwarding_items_forwarding_order_id_fkey';
            columns: ['forwarding_order_id'];
            referencedRelation: 'gallery_forwarding_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gallery_forwarding_items_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      certificates: {
        Row: CertificateRow;
        Insert: CertificateInsert;
        Update: CertificateUpdate;
        Relationships: [
          {
            foreignKeyName: 'certificates_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      document_sequences: {
        Row: DocumentSequenceRow;
        Insert: DocumentSequenceInsert;
        Update: DocumentSequenceUpdate;
        Relationships: [];
      };
      invoices: {
        Row: InvoiceRow;
        Insert: InvoiceInsert;
        Update: InvoiceUpdate;
        Relationships: [
          {
            foreignKeyName: 'invoices_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
        ];
      };
      invoice_items: {
        Row: InvoiceItemRow;
        Insert: InvoiceItemInsert;
        Update: InvoiceItemUpdate;
        Relationships: [
          {
            foreignKeyName: 'invoice_items_invoice_id_fkey';
            columns: ['invoice_id'];
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoice_items_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      email_log: {
        Row: EmailLogRow;
        Insert: EmailLogInsert;
        Update: EmailLogUpdate;
        Relationships: [
          {
            foreignKeyName: 'email_log_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
        ];
      };
      share_links: {
        Row: ShareLinkRow;
        Insert: ShareLinkInsert;
        Update: ShareLinkUpdate;
        Relationships: [];
      };
      contacts: {
        Row: ContactRow;
        Insert: ContactInsert;
        Update: ContactUpdate;
        Relationships: [];
      };
      interactions: {
        Row: InteractionRow;
        Insert: InteractionInsert;
        Update: InteractionUpdate;
        Relationships: [
          {
            foreignKeyName: 'interactions_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
        ];
      };
      deals: {
        Row: DealRow;
        Insert: DealInsert;
        Update: DealUpdate;
        Relationships: [
          {
            foreignKeyName: 'deals_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deals_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: TaskRow;
        Insert: TaskInsert;
        Update: TaskUpdate;
        Relationships: [
          {
            foreignKeyName: 'tasks_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_deal_id_fkey';
            columns: ['deal_id'];
            referencedRelation: 'deals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_exhibition_id_fkey';
            columns: ['exhibition_id'];
            referencedRelation: 'exhibitions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_invoice_id_fkey';
            columns: ['invoice_id'];
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          },
        ];
      };
      wish_list_items: {
        Row: WishListItemRow;
        Insert: WishListItemInsert;
        Update: WishListItemUpdate;
        Relationships: [
          {
            foreignKeyName: 'wish_list_items_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wish_list_items_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      condition_reports: {
        Row: ConditionReportRow;
        Insert: ConditionReportInsert;
        Update: ConditionReportUpdate;
        Relationships: [
          {
            foreignKeyName: 'condition_reports_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'condition_reports_movement_id_fkey';
            columns: ['movement_id'];
            referencedRelation: 'artwork_movements';
            referencedColumns: ['id'];
          },
        ];
      };
      insurance_records: {
        Row: InsuranceRecordRow;
        Insert: InsuranceRecordInsert;
        Update: InsuranceRecordUpdate;
        Relationships: [
          {
            foreignKeyName: 'insurance_records_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      valuations: {
        Row: ValuationRow;
        Insert: ValuationInsert;
        Update: ValuationUpdate;
        Relationships: [
          {
            foreignKeyName: 'valuations_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      exhibitions: {
        Row: ExhibitionRow;
        Insert: ExhibitionInsert;
        Update: ExhibitionUpdate;
        Relationships: [
          {
            foreignKeyName: 'exhibitions_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exhibitions_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
        ];
      };
      exhibition_artworks: {
        Row: ExhibitionArtworkRow;
        Insert: ExhibitionArtworkInsert;
        Update: ExhibitionArtworkUpdate;
        Relationships: [
          {
            foreignKeyName: 'exhibition_artworks_exhibition_id_fkey';
            columns: ['exhibition_id'];
            referencedRelation: 'exhibitions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exhibition_artworks_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      loans: {
        Row: LoanRow;
        Insert: LoanInsert;
        Update: LoanUpdate;
        Relationships: [
          {
            foreignKeyName: 'loans_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      expenses: {
        Row: ExpenseRow;
        Insert: ExpenseInsert;
        Update: ExpenseUpdate;
        Relationships: [
          {
            foreignKeyName: 'expenses_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_exhibition_id_fkey';
            columns: ['exhibition_id'];
            referencedRelation: 'exhibitions';
            referencedColumns: ['id'];
          },
        ];
      };
      price_history: {
        Row: PriceHistoryRow;
        Insert: PriceHistoryInsert;
        Update: PriceHistoryUpdate;
        Relationships: [
          {
            foreignKeyName: 'price_history_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      viewing_rooms: {
        Row: ViewingRoomRow;
        Insert: ViewingRoomInsert;
        Update: ViewingRoomUpdate;
        Relationships: [
          {
            foreignKeyName: 'viewing_rooms_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
        ];
      };
      user_profiles: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
        Relationships: [];
      };
      activity_log: {
        Row: ActivityLogRow;
        Insert: ActivityLogInsert;
        Update: ActivityLogUpdate;
        Relationships: [];
      };
      reminders: {
        Row: ReminderRow;
        Insert: ReminderInsert;
        Update: ReminderUpdate;
        Relationships: [];
      };
      artwork_templates: {
        Row: ArtworkTemplateRow;
        Insert: ArtworkTemplateInsert;
        Update: ArtworkTemplateUpdate;
        Relationships: [];
      };
      gallery_team_members: {
        Row: GalleryTeamMemberRow;
        Insert: GalleryTeamMemberInsert;
        Update: GalleryTeamMemberUpdate;
        Relationships: [
          {
            foreignKeyName: 'gallery_team_members_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
        ];
      };
      public_collections: {
        Row: PublicCollectionRow;
        Insert: PublicCollectionInsert;
        Update: PublicCollectionUpdate;
        Relationships: [];
      };
      artwork_collections: {
        Row: ArtworkCollectionRow;
        Insert: ArtworkCollectionInsert;
        Update: ArtworkCollectionUpdate;
        Relationships: [
          {
            foreignKeyName: 'artwork_collections_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artwork_collections_collection_id_fkey';
            columns: ['collection_id'];
            referencedRelation: 'public_collections';
            referencedColumns: ['id'];
          },
        ];
      };
      enquiries: {
        Row: EnquiryRow;
        Insert: EnquiryInsert;
        Update: EnquiryUpdate;
        Relationships: [
          {
            foreignKeyName: 'enquiries_converted_deal_id_fkey';
            columns: ['converted_deal_id'];
            referencedRelation: 'deals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enquiries_converted_contact_id_fkey';
            columns: ['converted_contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
        ];
      };
      exhibition_galleries: {
        Row: ExhibitionGalleryRow;
        Insert: ExhibitionGalleryInsert;
        Update: ExhibitionGalleryUpdate;
        Relationships: [
          {
            foreignKeyName: 'exhibition_galleries_exhibition_id_fkey';
            columns: ['exhibition_id'];
            referencedRelation: 'exhibitions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exhibition_galleries_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
        ];
      };
      auction_alerts: {
        Row: AuctionAlertRow;
        Insert: AuctionAlertInsert;
        Update: AuctionAlertUpdate;
        Relationships: [
          {
            foreignKeyName: 'auction_alerts_matched_artwork_id_fkey';
            columns: ['matched_artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'auction_alerts_matched_gallery_id_fkey';
            columns: ['matched_gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
        Relationships: [
          {
            foreignKeyName: 'projects_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
        ];
      };
      anonymous_collectors: {
        Row: AnonymousCollectorRow;
        Insert: AnonymousCollectorInsert;
        Update: AnonymousCollectorUpdate;
        Relationships: [];
      };
      partner_score_snapshots: {
        Row: PartnerScoreSnapshotRow;
        Insert: PartnerScoreSnapshotInsert;
        Update: PartnerScoreSnapshotUpdate;
        Relationships: [
          {
            foreignKeyName: 'partner_score_snapshots_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
        ];
      };
      reporting_reminders: {
        Row: ReportingReminderRow;
        Insert: ReportingReminderInsert;
        Update: ReportingReminderUpdate;
        Relationships: [
          {
            foreignKeyName: 'reporting_reminders_sale_id_fkey';
            columns: ['sale_id'];
            referencedRelation: 'sales';
            referencedColumns: ['id'];
          },
        ];
      };
      gallery_access_tiers: {
        Row: GalleryAccessTierRow;
        Insert: GalleryAccessTierInsert;
        Update: GalleryAccessTierUpdate;
        Relationships: [
          {
            foreignKeyName: 'gallery_access_tiers_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
        ];
      };
      career_milestones: {
        Row: CareerMilestoneRow;
        Insert: CareerMilestoneInsert;
        Update: CareerMilestoneUpdate;
        Relationships: [];
      };
      ai_insights: {
        Row: AiInsightRow;
        Insert: AiInsightInsert;
        Update: AiInsightUpdate;
        Relationships: [];
      };
      ai_conversations: {
        Row: AiConversationRow;
        Insert: AiConversationInsert;
        Update: AiConversationUpdate;
        Relationships: [];
      };
      ai_rate_limits: {
        Row: AiRateLimitRow;
        Insert: AiRateLimitInsert;
        Update: AiRateLimitUpdate;
        Relationships: [];
      };
      ai_insight_feedback: {
        Row: AiInsightFeedbackRow;
        Insert: AiInsightFeedbackInsert;
        Update: AiInsightFeedbackUpdate;
        Relationships: [
          {
            foreignKeyName: 'ai_insight_feedback_insight_id_fkey';
            columns: ['insight_id'];
            referencedRelation: 'ai_insights';
            referencedColumns: ['id'];
          },
        ];
      };
      publication_budgets: {
        Row: PublicationBudgetRow;
        Insert: PublicationBudgetInsert;
        Update: PublicationBudgetUpdate;
        Relationships: [];
      };
      publication_budget_items: {
        Row: PublicationBudgetItemRow;
        Insert: PublicationBudgetItemInsert;
        Update: PublicationBudgetItemUpdate;
        Relationships: [
          {
            foreignKeyName: 'publication_budget_items_budget_id_fkey';
            columns: ['budget_id'];
            referencedRelation: 'publication_budgets';
            referencedColumns: ['id'];
          },
        ];
      };
      artists: {
        Row: ArtistRow;
        Insert: ArtistInsert;
        Update: ArtistUpdate;
        Relationships: [];
      };
      artwork_provenance: {
        Row: ArtworkProvenanceRow;
        Insert: ArtworkProvenanceInsert;
        Update: ArtworkProvenanceUpdate;
        Relationships: [
          {
            foreignKeyName: 'artwork_provenance_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      catalogues: {
        Row: CatalogueRow;
        Insert: CatalogueInsert;
        Update: CatalogueUpdate;
        Relationships: [
          {
            foreignKeyName: 'catalogues_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'catalogues_contact_id_fkey';
            columns: ['contact_id'];
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'catalogues_exhibition_id_fkey';
            columns: ['exhibition_id'];
            referencedRelation: 'exhibitions';
            referencedColumns: ['id'];
          },
        ];
      };
      cv_entries: {
        Row: CvEntryRow;
        Insert: CvEntryInsert;
        Update: CvEntryUpdate;
        Relationships: [];
      };
      exhibition_floor_plans: {
        Row: ExhibitionFloorPlanRow;
        Insert: ExhibitionFloorPlanInsert;
        Update: ExhibitionFloorPlanUpdate;
        Relationships: [
          {
            foreignKeyName: 'exhibition_floor_plans_exhibition_id_fkey';
            columns: ['exhibition_id'];
            referencedRelation: 'exhibitions';
            referencedColumns: ['id'];
          },
        ];
      };
      exhibition_images: {
        Row: ExhibitionImageRow;
        Insert: ExhibitionImageInsert;
        Update: ExhibitionImageUpdate;
        Relationships: [
          {
            foreignKeyName: 'exhibition_images_exhibition_id_fkey';
            columns: ['exhibition_id'];
            referencedRelation: 'exhibitions';
            referencedColumns: ['id'];
          },
        ];
      };
      exhibition_production_orders: {
        Row: ExhibitionProductionOrderRow;
        Insert: ExhibitionProductionOrderInsert;
        Update: ExhibitionProductionOrderUpdate;
        Relationships: [
          {
            foreignKeyName: 'exhibition_production_orders_exhibition_id_fkey';
            columns: ['exhibition_id'];
            referencedRelation: 'exhibitions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exhibition_production_orders_production_order_id_fkey';
            columns: ['production_order_id'];
            referencedRelation: 'production_orders';
            referencedColumns: ['id'];
          },
        ];
      };
      media_files: {
        Row: MediaFileRow;
        Insert: MediaFileInsert;
        Update: MediaFileUpdate;
        Relationships: [
          {
            foreignKeyName: 'media_files_submitted_by_gallery_fkey';
            columns: ['submitted_by_gallery'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
        ];
      };
      news_posts: {
        Row: NewsPostRow;
        Insert: NewsPostInsert;
        Update: NewsPostUpdate;
        Relationships: [];
      };
      news_read_status: {
        Row: NewsReadStatusRow;
        Insert: NewsReadStatusInsert;
        Update: NewsReadStatusUpdate;
        Relationships: [
          {
            foreignKeyName: 'news_read_status_news_id_fkey';
            columns: ['news_id'];
            referencedRelation: 'news_posts';
            referencedColumns: ['id'];
          },
        ];
      };
      packing_list_crates: {
        Row: PackingListCrateRow;
        Insert: PackingListCrateInsert;
        Update: PackingListCrateUpdate;
        Relationships: [
          {
            foreignKeyName: 'packing_list_crates_packing_list_id_fkey';
            columns: ['packing_list_id'];
            referencedRelation: 'packing_lists';
            referencedColumns: ['id'];
          },
        ];
      };
      price_intelligence_reports: {
        Row: PriceIntelligenceReportRow;
        Insert: PriceIntelligenceReportInsert;
        Update: PriceIntelligenceReportUpdate;
        Relationships: [];
      };
      production_order_documents: {
        Row: ProductionOrderDocumentRow;
        Insert: ProductionOrderDocumentInsert;
        Update: ProductionOrderDocumentUpdate;
        Relationships: [
          {
            foreignKeyName: 'production_order_documents_production_order_id_fkey';
            columns: ['production_order_id'];
            referencedRelation: 'production_orders';
            referencedColumns: ['id'];
          },
        ];
      };
      production_order_image_notes: {
        Row: ProductionOrderImageNoteRow;
        Insert: ProductionOrderImageNoteInsert;
        Update: ProductionOrderImageNoteUpdate;
        Relationships: [
          {
            foreignKeyName: 'production_order_image_notes_production_order_id_fkey';
            columns: ['production_order_id'];
            referencedRelation: 'production_orders';
            referencedColumns: ['id'];
          },
        ];
      };
      project_artworks: {
        Row: ProjectArtworkRow;
        Insert: ProjectArtworkInsert;
        Update: ProjectArtworkUpdate;
        Relationships: [
          {
            foreignKeyName: 'project_artworks_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_artworks_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      project_production_orders: {
        Row: ProjectProductionOrderRow;
        Insert: ProjectProductionOrderInsert;
        Update: ProjectProductionOrderUpdate;
        Relationships: [
          {
            foreignKeyName: 'project_production_orders_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_production_orders_production_order_id_fkey';
            columns: ['production_order_id'];
            referencedRelation: 'production_orders';
            referencedColumns: ['id'];
          },
        ];
      };
      sale_requests: {
        Row: SaleRequestRow;
        Insert: SaleRequestInsert;
        Update: SaleRequestUpdate;
        Relationships: [
          {
            foreignKeyName: 'sale_requests_artwork_id_fkey';
            columns: ['artwork_id'];
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_requests_gallery_id_fkey';
            columns: ['gallery_id'];
            referencedRelation: 'galleries';
            referencedColumns: ['id'];
          },
        ];
      };
      viewing_room_views: {
        Row: ViewingRoomViewRow;
        Insert: ViewingRoomViewInsert;
        Update: ViewingRoomViewUpdate;
        Relationships: [
          {
            foreignKeyName: 'viewing_room_views_viewing_room_id_fkey';
            columns: ['viewing_room_id'];
            referencedRelation: 'viewing_rooms';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    // `[_ in never]` (not Record<string, never>): its `keyof` must stay `never`,
    // otherwise postgrest-js treats every column as a computed field and
    // star-selects collapse to {}
    Views: { [_ in never]: never };
    Functions: {
      generate_document_number: {
        Args: { p_user_id: string; p_prefix: string };
        Returns: string;
      };
      record_viewing_room_view: {
        Args: { p_viewing_room_id: string; p_viewer_ip: string | null };
        Returns: undefined;
      };
      get_share_link_by_token: {
        Args: { p_token: string };
        Returns: ShareLinkRow[];
      };
      increment_share_link_download: {
        Args: { p_token: string };
        Returns: undefined;
      };
      get_viewing_room_by_slug: {
        Args: { p_slug: string };
        Returns: ViewingRoomRow[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
// ---------------------------------------------------------------------------
// Publication Budget types
// ---------------------------------------------------------------------------

export type PublicationBudgetStatus = 'draft' | 'active' | 'closed';
export type PublicationBudgetItemType = 'revenue' | 'cost';
export type PublicationBudgetItemStatus = 'estimated' | 'confirmed' | 'invoiced' | 'paid';

export type PublicationBudgetRow = {
  id: string;
  name: string;
  description: string | null;
  status: PublicationBudgetStatus;
  created_at: string;
  updated_at: string;
}

export type PublicationBudgetInsert = {
  id?: string;
  name: string;
  description?: string | null;
  status?: PublicationBudgetStatus;
  created_at?: string;
  updated_at?: string;
}

export type PublicationBudgetUpdate = Partial<PublicationBudgetInsert>;

export type PublicationBudgetItemRow = {
  id: string;
  budget_id: string;
  type: PublicationBudgetItemType;
  category: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  currency: string;
  status: PublicationBudgetItemStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicationBudgetItemInsert = {
  id?: string;
  budget_id: string;
  type: PublicationBudgetItemType;
  category: string;
  description: string;
  quantity?: number;
  unit_price?: number;
  amount: number;
  currency?: string;
  status?: PublicationBudgetItemStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PublicationBudgetItemUpdate = Partial<PublicationBudgetItemInsert>;
// ---------------------------------------------------------------------------
// Generated from the live PostgREST OpenAPI schema (2026-07-03) for tables
// that were missing from the Tables map below.
// ---------------------------------------------------------------------------

export type ArtworkProvenanceRow = {
  id: string;
  user_id: string;
  artwork_id: string;
  owner_name: string;
  owner_type: string;
  acquisition_date: string | null;
  acquisition_method: string | null;
  notes: string | null;
  sort_order: number;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export type ArtworkProvenanceInsert = {
  id?: string;
  user_id: string;
  artwork_id: string;
  owner_name: string;
  owner_type?: string;
  acquisition_date?: string | null;
  acquisition_method?: string | null;
  notes?: string | null;
  sort_order?: number;
  confirmed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ArtworkProvenanceUpdate = Partial<ArtworkProvenanceInsert>;

export type CatalogueRow = {
  id: string;
  user_id: string;
  name: string;
  config: unknown;
  created_at: string;
  updated_at: string;
  portfolio: string;
  gallery_id: string | null;
  contact_id: string | null;
  exhibition_id: string | null;
}

export type CatalogueInsert = {
  id?: string;
  user_id: string;
  name: string;
  config: unknown;
  created_at?: string;
  updated_at?: string;
  portfolio?: string;
  gallery_id?: string | null;
  contact_id?: string | null;
  exhibition_id?: string | null;
}

export type CatalogueUpdate = Partial<CatalogueInsert>;

export type CvEntryRow = {
  id: string;
  year: number | null;
  category: string;
  title: string;
  location: string | null;
  description: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export type CvEntryInsert = {
  id?: string;
  year?: number | null;
  category: string;
  title: string;
  location?: string | null;
  description?: string | null;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type CvEntryUpdate = Partial<CvEntryInsert>;

export type ExhibitionImageRow = {
  id: string;
  user_id: string;
  exhibition_id: string;
  storage_path: string;
  file_name: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
  photo_type: string;
}

export type ExhibitionImageInsert = {
  id?: string;
  user_id: string;
  exhibition_id: string;
  storage_path: string;
  file_name: string;
  caption?: string | null;
  sort_order?: number;
  created_at?: string;
  photo_type?: string;
}

export type ExhibitionImageUpdate = Partial<ExhibitionImageInsert>;

export type MediaFileRow = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  status: string;
  submitted_by_gallery: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  content_type: string | null;
  text_content: string | null;
  credit: string | null;
  source_url: string | null;
}

export type MediaFileInsert = {
  id?: string;
  category: string;
  title: string;
  description?: string | null;
  file_name: string;
  storage_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_by: string;
  status?: string;
  submitted_by_gallery?: string | null;
  review_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  content_type?: string | null;
  text_content?: string | null;
  credit?: string | null;
  source_url?: string | null;
}

export type MediaFileUpdate = Partial<MediaFileInsert>;

export type NewsPostRow = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  external_link: string | null;
  published: boolean;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type NewsPostInsert = {
  id?: string;
  title: string;
  body: string;
  image_url?: string | null;
  external_link?: string | null;
  published?: boolean;
  published_at?: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export type NewsPostUpdate = Partial<NewsPostInsert>;

export type NewsReadStatusRow = {
  id: string;
  news_id: string;
  user_id: string;
  read_at: string;
}

export type NewsReadStatusInsert = {
  id?: string;
  news_id: string;
  user_id: string;
  read_at?: string;
}

export type NewsReadStatusUpdate = Partial<NewsReadStatusInsert>;

export type ProductionOrderImageNoteRow = {
  id: string;
  production_order_id: string;
  storage_path: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export type ProductionOrderImageNoteInsert = {
  id?: string;
  production_order_id: string;
  storage_path: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export type ProductionOrderImageNoteUpdate = Partial<ProductionOrderImageNoteInsert>;

export type SaleRequestRow = {
  id: string;
  artwork_id: string;
  gallery_id: string;
  requested_by: string;
  realized_price: number;
  currency: string;
  buyer_name: string | null;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SaleRequestInsert = {
  id?: string;
  artwork_id: string;
  gallery_id: string;
  requested_by: string;
  realized_price: number;
  currency?: string;
  buyer_name?: string | null;
  notes?: string | null;
  status?: string;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type SaleRequestUpdate = Partial<SaleRequestInsert>;

// Insert/Update aliases for row types that existed but were never wired into
// the Tables map (kept permissive — call sites historically cast `as never`).
export type PriceIntelligenceReportInsert = Partial<PriceIntelligenceReportRow>;
export type PriceIntelligenceReportUpdate = Partial<PriceIntelligenceReportInsert>;
export type ViewingRoomViewInsert = Partial<ViewingRoomViewRow>;
export type ViewingRoomViewUpdate = Partial<ViewingRoomViewInsert>;
export type ExhibitionFloorPlanUpdate = Partial<ExhibitionFloorPlanInsert>;
export type ExhibitionProductionOrderUpdate = Partial<ExhibitionProductionOrderInsert>;
export type ProductionOrderDocumentUpdate = Partial<ProductionOrderDocumentInsert>;
export type ProjectArtworkUpdate = Partial<ProjectArtworkInsert>;
export type ProjectProductionOrderUpdate = Partial<ProjectProductionOrderInsert>;
