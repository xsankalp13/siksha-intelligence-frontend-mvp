import { api } from '@/lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export type VendorStatus = "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "BLACKLISTED";
export type POStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED" | "CANCELLED" | "CLOSED";
export type GRNStatus = "PENDING_INSPECTION" | "ACCEPTED" | "REJECTED" | "PARTIALLY_ACCEPTED";
export type VendorBillStatus = "PENDING" | "THREE_WAY_MATCHED" | "MISMATCH" | "APPROVED_FOR_PAYMENT" | "PAID" | "CANCELLED";

export interface VendorResponseDTO {
  id: number; uuid: string; vendorCode: string; name: string; legalType: string | null;
  gstin: string | null; pan: string | null; contactPerson: string | null;
  email: string | null; phone: string | null; address: string | null;
  city: string | null; state: string | null; pincode: string | null;
  bankAccountNumber: string | null; bankName: string | null; ifscCode: string | null;
  category: string | null; paymentTermsDays: number; status: VendorStatus;
  notes: string | null; createdAt: string; createdBy: string | null;
}

export interface POItemResponseDTO {
  itemId: number; description: string; unitOfMeasure: string | null;
  quantity: number; unitPrice: number; lineTotal: number;
  quantityReceived: number; outstandingQuantity: number;
  fullyReceived: boolean; lineNumber: number | null;
}

export interface PurchaseOrderResponseDTO {
  id: number; uuid: string; poNumber: string;
  vendorId: number; vendorName: string; vendorCode: string;
  department: string | null;
  referenceBudgetId: number | null; referenceBudgetName: string | null;
  orderDate: string; expectedDeliveryDate: string | null;
  description: string | null;
  totalBeforeTax: number; taxAmount: number; totalAmount: number;
  status: POStatus;
  approvedBy: string | null; notes: string | null;
  items: POItemResponseDTO[];
  grnCount: number; createdAt: string; createdBy: string | null;
}

export interface GRNItemResponseDTO {
  grnItemId: number; poItemId: number; description: string | null;
  receivedQuantity: number; acceptedQuantity: number; rejectedQuantity: number;
  rejectionReason: string | null; lineNumber: number | null;
}

export interface GRNResponseDTO {
  id: number; uuid: string; grnNumber: string;
  purchaseOrderId: number; poNumber: string;
  vendorId: number; vendorName: string;
  receiptDate: string; receivedBy: string | null; vendorChallanNumber: string | null;
  status: GRNStatus; notes: string | null;
  items: GRNItemResponseDTO[];
  createdAt: string; createdBy: string | null;
}

export interface VendorBillResponseDTO {
  id: number; uuid: string; billNumber: string; vendorInvoiceNumber: string;
  vendorId: number; vendorName: string; vendorCode: string;
  purchaseOrderId: number | null; poNumber: string | null;
  grnId: number | null; grnNumber: string | null;
  billDate: string; dueDate: string | null;
  billAmount: number; taxAmount: number; totalPayable: number;
  status: VendorBillStatus;
  matchResultNotes: string | null; matchedBy: string | null;
  paymentDate: string | null; paymentReference: string | null;
  glEntryId: number | null; notes: string | null;
  overdue: boolean; createdAt: string; createdBy: string | null;
}

// ── Services ──────────────────────────────────────────────────────────────────

export const vendorService = {
  getAll: (activeOnly = false) => api.get<VendorResponseDTO[]>("/auth/finance/vendors", { params: { activeOnly } }),
  getById: (id: number) => api.get<VendorResponseDTO>(`/auth/finance/vendors/${id}`),
  create: (data: any) => api.post<VendorResponseDTO>("/auth/finance/vendors", data),
  update: (id: number, data: any) => api.put<VendorResponseDTO>(`/auth/finance/vendors/${id}`, data),
  deactivate: (id: number) => api.delete(`/auth/finance/vendors/${id}`),
};

export const poService = {
  getAll: () => api.get<PurchaseOrderResponseDTO[]>("/auth/finance/purchase-orders"),
  getById: (id: number) => api.get<PurchaseOrderResponseDTO>(`/auth/finance/purchase-orders/${id}`),
  create: (data: any) => api.post<PurchaseOrderResponseDTO>("/auth/finance/purchase-orders", data),
  submit: (id: number) => api.post<PurchaseOrderResponseDTO>(`/auth/finance/purchase-orders/${id}/submit`),
  approve: (id: number) => api.post<PurchaseOrderResponseDTO>(`/auth/finance/purchase-orders/${id}/approve`),
  reject: (id: number, reason?: string) => api.post<PurchaseOrderResponseDTO>(`/auth/finance/purchase-orders/${id}/reject`, null, { params: { reason } }),
  cancel: (id: number) => api.post<PurchaseOrderResponseDTO>(`/auth/finance/purchase-orders/${id}/cancel`),
  getGRNs: (id: number) => api.get<GRNResponseDTO[]>(`/auth/finance/purchase-orders/${id}/grns`),
  createGRN: (data: any) => api.post<GRNResponseDTO>("/auth/finance/purchase-orders/grns", data),
  getAllGRNs: () => api.get<GRNResponseDTO[]>("/auth/finance/purchase-orders/grns"),
};

export const apService = {
  getAll: (status?: VendorBillStatus) => api.get<VendorBillResponseDTO[]>("/auth/finance/vendor-bills", { params: { status } }),
  getById: (id: number) => api.get<VendorBillResponseDTO>(`/auth/finance/vendor-bills/${id}`),
  getOverdue: () => api.get<VendorBillResponseDTO[]>("/auth/finance/vendor-bills/overdue"),
  getOutstanding: () => api.get<number>("/auth/finance/vendor-bills/outstanding-payables"),
  create: (data: any) => api.post<VendorBillResponseDTO>("/auth/finance/vendor-bills", data),
  approvePayment: (id: number) => api.post<VendorBillResponseDTO>(`/auth/finance/vendor-bills/${id}/approve-payment`),
  recordPayment: (id: number, ref?: string) => api.post<VendorBillResponseDTO>(`/auth/finance/vendor-bills/${id}/record-payment`, null, { params: { paymentReference: ref } }),
  overrideMismatch: (id: number, reason: string) => api.post<VendorBillResponseDTO>(`/auth/finance/vendor-bills/${id}/override-mismatch`, null, { params: { reason } }),
  cancel: (id: number) => api.post<VendorBillResponseDTO>(`/auth/finance/vendor-bills/${id}/cancel`),
};
