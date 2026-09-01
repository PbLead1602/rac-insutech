export type EnquiryStatus = "new" | "contacted" | "qualified" | "quoted" | "won" | "lost" | "spam" | "requirement_received" | "quotation_required" | "quotation_sent" | "follow_up" | "converted" | "not_relevant" | "closed";
export type UserRole = "admin";

export type RfqInput = {
  /** Browser-generated idempotency key; never shown in operational records. */
  submissionId?: string;
  name: string;
  company?: string;
  mobile: string;
  email?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  projectLocation?: string;
  projectName?: string;
  product?: string;
  brand?: string;
  quantity?: string;
  thickness?: string;
  application?: string;
  customerType?: "end_user" | "contractor" | "consultant" | "dealer" | "other";
  deliveryPreference?: string;
  message?: string;
};

export type EnquiryRecord = RfqInput & {
  id: string;
  enquiryNumber: string;
  status: EnquiryStatus;
  source: "website";
  createdAt: string;
  customerId?: string;
  accountId?: string;
  projectId?: string;
  followUpAt?: string;
  followUpNote?: string;
  internalNotes?: string;
  lostReason?: string;
  attachment?: { name: string; url?: string; size: number; type: string };
};

export type EnquiryNote = {
  id: string;
  enquiryId: string;
  note: string;
  createdAt: string;
};

export type AdminProfile = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isPrimaryAdmin: boolean;
};

/**
 * A customer account is deliberately separate from the sole RAC Admin profile.
 * An account can exist while it is being verified; a Customer record exists
 * only once RAC has approved the account.
 */
export type CustomerAccountStatus = "pending_email_verification" | "pending_admin_approval" | "active" | "rejected" | "suspended" | "archived";
export type CustomerAccount = {
  id: string;
  authUserId: string;
  email: string;
  mobile: string;
  fullName: string;
  companyName?: string;
  gstin?: string;
  customerType: "end_user" | "contractor" | "consultant" | "dealer" | "other";
  status: CustomerAccountStatus;
  emailVerified: boolean;
  customerId?: string;
  pendingEnquiryId?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  suspendedAt?: string;
  suspendedReason?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerStatus = "active" | "inactive" | "archived";
export type CustomerType = "hvac_contractor" | "consultant" | "peb_contractor" | "architect" | "dealer" | "end_user" | "industrial_customer" | "other";

export type CustomerRecord = {
  id: string;
  accountId?: string;
  fullName: string;
  company?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  customerType: CustomerType;
  notes?: string;
  status: CustomerStatus;
  createdAt: string;
};

export type CustomerNote = {
  id: string;
  customerId: string;
  note: string;
  createdAt: string;
};

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";

export type ProjectRecord = {
  id: string;
  title: string;
  slug: string;
  customerId?: string;
  clientName?: string;
  location?: string;
  requirement?: string;
  solution?: string;
  scope?: string;
  internalNotes?: string;
  projectStatus: ProjectStatus;
  startDate?: string;
  expectedDeliveryDate?: string;
  createdAt: string;
};

export type QuotationRateCardRecord = {
  id: string;
  productSlug: string;
  productName?: string;
  materialClass: string;
  thickness: string;
  sizeLabel: string;
  lamination: string;
  orderUnit: "roll" | "square_metre" | "box" | "running_metre" | "carton" | "unit" | "drum";
  rate: number;
  rateUnit: string;
  rollAreaM2?: number;
  packRunningMetres?: number;
  packingLabel?: string;
  moq?: number;
  gstRate: number;
  active: boolean;
  validFrom?: string;
  validTo?: string;
  reason?: string;
  publishedAt?: string;
  archivedAt?: string;
  createdAt: string;
};

export type RateCardHistoryRecord = {
  id: string;
  rateCardId: string;
  oldRate?: number;
  newRate: number;
  validFrom?: string;
  validTo?: string;
  reason: string;
  changedAt: string;
};

export type ProductPublicationStatus = "draft" | "published" | "archived";
export type ProductMasterRecord = {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  overview?: string;
  material?: string;
  category?: string;
  family?: string;
  formFactor?: string;
  imageUrl?: string;
  quotationEnabled: boolean;
  featured: boolean;
  active: boolean;
  status: ProductPublicationStatus;
  createdAt: string;
};

export type ProductVariantRecord = {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  thickness?: string;
  dimensions?: string;
  density?: string;
  materialClass?: string;
  lamination?: string;
  widthM?: number;
  lengthM?: number;
  rollAreaM2?: number;
  tubeLengthMm?: number;
  tubesPerCarton?: number;
  packRunningMetres?: number;
  active: boolean;
  createdAt: string;
};

export type DocumentType = "datasheet" | "brochure" | "test_certificate" | "installation_guide" | "other";
export type DocumentVisibility = "public" | "customer" | "internal";
export type DocumentStatus = "current" | "archived";
export type DocumentRecord = {
  id: string;
  title: string;
  documentType: DocumentType;
  productId?: string;
  materialFamily?: string;
  version?: string;
  documentDate?: string;
  fileUrl: string;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  replacedById?: string;
  createdAt: string;
};

export type ContentStatus = "draft" | "published" | "archived";
export type SiteContentRecord = {
  id: string;
  contentKey: string;
  title?: string;
  body: Record<string, unknown>;
  status: ContentStatus;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityRecord = { id: string; action: string; entityType: string; entityId?: string; summary: string; createdAt: string };

export type CatalogueCategoryRecord = {
  id: string;
  parentId?: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  status: ContentStatus;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
};

export type BrandRecord = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  authorizationNote?: string;
  status: ContentStatus;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
};

export type EditorialKind = "application" | "industry" | "service" | "resource";
export type EditorialRecord = {
  id: string;
  kind: EditorialKind;
  name: string;
  slug: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
  icon?: string;
  status: ContentStatus;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
};

export type MediaAssetRecord = {
  id: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  altText?: string;
  visibility: "public" | "internal";
  createdAt: string;
  archivedAt?: string;
};

export type QuotationCustomer = {
  fullName: string;
  company: string;
  mobile: string;
  email: string;
  gstin?: string;
  projectName?: string;
  projectLocation?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  customerType?: "end_user" | "contractor" | "consultant" | "dealer" | "other";
  deliveryPreference?: string;
  billingAddress?: string;
  shippingAddress?: string;
  notes?: string;
};

export type QuotationLineRecord = {
  variantId: string;
  productName: string;
  configuration: string;
  requestedQuantity: number;
  requestedUnit: string;
  suppliedQuantity: number;
  suppliedUnit: string;
  cartons?: number;
  technicalQuantity: string;
  rate: number;
  rateUnit: string;
  amount: number;
  provisional: true;
};

export type QuotationStatus =
  | "draft"
  | "generated"
  | "sent"
  | "viewed"
  | "follow_up"
  | "revision_requested"
  | "revised"
  | "accepted"
  | "po_received"
  | "won"
  | "lost"
  | "expired"
  | "cancelled";

export type QuotationSource = "website_auto_quote" | "admin_created" | "enquiry_converted";

export type QuotationNote = {
  id: string;
  quotationId: string;
  note: string;
  createdAt: string;
};

export type QuotationRecord = {
  id: string;
  quoteNumber: string;
  accessToken: string;
  customer: QuotationCustomer;
  items: QuotationLineRecord[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  transport: "At Actual";
  paymentTerms: string;
  validityDays: number;
  status: QuotationStatus;
  isProvisional: true;
  createdAt: string;
  customerId?: string;
  accountId?: string;
  projectId?: string;
  enquiryId?: string;
  source?: QuotationSource;
  revisionNumber?: number;
  parentQuotationId?: string;
  validUntil?: string;
  followUpAt?: string;
  followUpNote?: string;
  internalNotes?: string;
  lostReason?: string;
  lastSentAt?: string;
  lastViewedAt?: string;
};

/** A customer-visible request for the RAC team to prepare a new quote revision. */
export type CustomerRevisionRequest = {
  id: string;
  quotationId: string;
  accountId: string;
  customerId: string;
  reason: string;
  requiredChange?: string;
  quantityChange?: string;
  productChange?: string;
  deliveryChange?: string;
  additionalNotes?: string;
  status: "open" | "reviewed" | "closed";
  createdAt: string;
};
