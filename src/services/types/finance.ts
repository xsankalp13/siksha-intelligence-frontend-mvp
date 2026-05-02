// ── Finance DTOs ─────────────────────────────────────────────────────

// Fee Types
export interface FeeTypeCreateUpdateDTO {
  typeName: string;
  description?: string;
}

export interface FeeTypeResponseDTO {
  feeTypeId: number;
  typeName: string;
  description?: string;
}

// Fee Structures & Particulars
export type FeeFrequency = "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "ANNUAL";

export interface FeeParticularCreateDTO {
  feeTypeId: number;
  name: string;
  amount: number;
  frequency: FeeFrequency;
}

export interface FeeParticularResponseDTO {
  particularId: number;
  feeTypeId: number;
  name: string;
  amount: number;
  frequency: FeeFrequency;
}

export interface FeeStructureCreateDTO {
  name: string;
  academicYear: string;
  description?: string;
  particulars?: FeeParticularCreateDTO[];
  active?: boolean;
}

export interface FeeStructureUpdateDTO {
  name: string;
  academicYear: string;
  description?: string;
  active?: boolean;
}

export interface FeeStructureResponseDTO {
  structureId: number;
  name: string;
  academicYear: string;
  description?: string;
  particulars: FeeParticularResponseDTO[];
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

// Student-Fee Maps
export interface StudentFeeMapCreateDTO {
  studentId: number;
  structureId: number;
  effectiveDate: string;
  notes?: string;
}

export interface StudentFeeMapUpdateDTO {
  studentId: number;
  structureId: number;
  effectiveDate: string;
  notes?: string;
}

export interface StudentFeeMapResponseDTO {
  mapId: number;
  studentId: number;
  studentName?: string;
  structureId: number;
  effectiveDate: string;
  notes?: string;
}

// Invoices
export type InvoiceStatus = "DRAFT" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

export interface InvoiceLineItemResponseDTO {
  lineItemId: number;
  description: string;
  amount: number;
}

export interface InvoiceResponseDTO {
  invoiceId: number;
  studentId: number;
  studentName?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  lateFeeAmount?: number;
  paidAmount?: number;
  status: InvoiceStatus;
  lineItems: InvoiceLineItemResponseDTO[];
  createdAt: string;
}

// Payments
export type PaymentMethod = "ONLINE" | "CASH" | "CHECK" | "BANK_TRANSFER";
export type PaymentStatus = "SUCCESS" | "PENDING" | "FAILED";

export interface PaymentUpdateDTO {
  transactionId?: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  notes?: string;
}

export interface PaymentResponseDTO {
  paymentId: number;
  invoiceId: number;
  studentId: number;
  studentName?: string;
  transactionId?: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  notes?: string;
}

export interface RecordOfflinePaymentDTO {
  invoiceId: number;
  studentId: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  paymentDate?: string;
  notes?: string;
}

// Late Fee Rules
export type FineType = "FIXED" | "PERCENTAGE";

export interface LateFeeRuleCreateDTO {
  ruleName: string;
  daysAfterDue: number;
  fineType: FineType;
  fineValue: number;
  structureId?: number;
  active?: boolean;
}

export interface LateFeeRuleResponseDTO {
  ruleId: number;
  ruleName: string;
  daysAfterDue: number;
  fineType: FineType;
  fineValue: number;
  structureId?: number;
  active: boolean;
}

// Parent Portal
export interface InitiatePaymentRequestDTO {
  invoiceId: number;
  amount: number;
}

export interface InitiatePaymentResponseDTO {
  clientSecret?: string;
  paymentGatewayUrl?: string;
  orderId?: string;
}

export interface VerifyPaymentRequestDTO {
  gatewayTransactionId: string;
  orderId: string;
  signature: string;
}

// Dashboard Summaries
export interface AdminDashboardSummaryDTO {
  totalCollected: number;
  totalOutstanding: number;
  totalOverdue: number;
  pendingInvoicesCount: number;
}

export interface ParentDashboardSummaryDTO {
  totalDue: number;
  nextDueDate?: string;
}
