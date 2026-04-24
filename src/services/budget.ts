import api from "@/lib/axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BudgetStatus =
  | "DRAFT" | "SUBMITTED" | "APPROVED" | "REVISION_REQUESTED" | "REJECTED" | "CLOSED";

export type VarianceStatus = "UNDER" | "ON_TRACK" | "OVER";

export interface BudgetLineItemResponseDTO {
  lineItemId: number;
  category: string;
  linkedAccountId: number | null;
  linkedAccountCode: string | null;
  linkedAccountName: string | null;
  allocatedAmount: number;
  actualAmount: number;
  variance: number;
  utilisationPct: number;
  varianceStatus: VarianceStatus;
  notes: string | null;
  lineNumber: number | null;
}

export interface BudgetResponseDTO {
  id: number;
  uuid: string;
  departmentName: string;
  academicYear: string;
  title: string | null;
  totalAllocated: number;
  totalSpent: number;
  totalVariance: number;
  utilisationPct: number;
  status: BudgetStatus;
  approvedBy: string | null;
  reviewerNotes: string | null;
  submitterNotes: string | null;
  lineItems: BudgetLineItemResponseDTO[];
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
}

export interface BudgetSummaryDTO {
  id: number;
  departmentName: string;
  academicYear: string;
  title: string | null;
  totalAllocated: number;
  totalSpent: number;
  totalVariance: number;
  utilisationPct: number;
  status: BudgetStatus;
  createdBy: string | null;
}

export interface BudgetLineItemCreateDTO {
  category: string;
  linkedAccountId?: number | null;
  allocatedAmount: number;
  notes?: string;
}

export interface BudgetCreateDTO {
  departmentName: string;
  academicYear: string;
  title?: string;
  submitterNotes?: string;
  lineItems: BudgetLineItemCreateDTO[];
}

export interface BudgetApprovalDTO {
  approved: boolean;
  reviewerNotes?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const budgetService = {
  /** GET /auth/finance/budgets — all budgets, optionally filtered */
  getAll(params?: { academicYear?: string; status?: BudgetStatus }) {
    return api.get<BudgetSummaryDTO[]>("/auth/finance/budgets", { params });
  },

  /** GET /auth/finance/budgets/:id — full detail with line items */
  getById(id: number) {
    return api.get<BudgetResponseDTO>(`/auth/finance/budgets/${id}`);
  },

  /** GET /auth/finance/budgets/meta/years */
  getAcademicYears() {
    return api.get<string[]>("/auth/finance/budgets/meta/years");
  },

  /** GET /auth/finance/budgets/meta/departments */
  getDepartments() {
    return api.get<string[]>("/auth/finance/budgets/meta/departments");
  },

  /** POST /auth/finance/budgets */
  create(data: BudgetCreateDTO) {
    return api.post<BudgetResponseDTO>("/auth/finance/budgets", data);
  },

  /** PUT /auth/finance/budgets/:id */
  update(id: number, data: BudgetCreateDTO) {
    return api.put<BudgetResponseDTO>(`/auth/finance/budgets/${id}`, data);
  },

  /** DELETE /auth/finance/budgets/:id */
  delete(id: number) {
    return api.delete(`/auth/finance/budgets/${id}`);
  },

  /** POST /auth/finance/budgets/:id/submit */
  submit(id: number) {
    return api.post<BudgetResponseDTO>(`/auth/finance/budgets/${id}/submit`);
  },

  /** POST /auth/finance/budgets/:id/review */
  review(id: number, data: BudgetApprovalDTO) {
    return api.post<BudgetResponseDTO>(`/auth/finance/budgets/${id}/review`, data);
  },

  /** POST /auth/finance/budgets/:id/request-revision */
  requestRevision(id: number, notes?: string) {
    return api.post<BudgetResponseDTO>(`/auth/finance/budgets/${id}/request-revision`, null, { params: { notes } });
  },

  /** POST /auth/finance/budgets/:id/close */
  close(id: number) {
    return api.post<BudgetResponseDTO>(`/auth/finance/budgets/${id}/close`);
  },
};
