import { api } from "@/lib/axios";
import type { PageResponse, Pageable } from "./types/common";
import type {
  FeeTypeCreateUpdateDTO,
  FeeTypeResponseDTO,
  FeeStructureCreateDTO,
  FeeStructureUpdateDTO,
  FeeStructureResponseDTO,
  StudentFeeMapCreateDTO,
  StudentFeeMapUpdateDTO,
  StudentFeeMapResponseDTO,
  InvoiceResponseDTO,
  PaymentResponseDTO,
  PaymentUpdateDTO,
  RecordOfflinePaymentDTO,
  LateFeeRuleCreateDTO,
  LateFeeRuleResponseDTO,
  InitiatePaymentRequestDTO,
  InitiatePaymentResponseDTO,
  VerifyPaymentRequestDTO,
  AdminDashboardSummaryDTO,
  ParentDashboardSummaryDTO,
} from "./types/finance";

// ── Finance Service ──────────────────────────────────────────────────

export const financeService = {
  // ── Fee Types ────────────────────────────────────────────────────
  /** GET /auth/finance/fee-types */
  getAllFeeTypes() {
    return api.get<FeeTypeResponseDTO[]>("/auth/finance/fee-types");
  },

  /** POST /auth/finance/fee-types */
  createFeeType(data: FeeTypeCreateUpdateDTO) {
    return api.post<FeeTypeResponseDTO>("/auth/finance/fee-types", data);
  },

  /** GET /auth/finance/fee-types/:id */
  getFeeTypeById(id: number) {
    return api.get<FeeTypeResponseDTO>(`/auth/finance/fee-types/${id}`);
  },

  /** PUT /auth/finance/fee-types/:id */
  updateFeeType(id: number, data: FeeTypeCreateUpdateDTO) {
    return api.put<FeeTypeResponseDTO>(`/auth/finance/fee-types/${id}`, data);
  },

  /** DELETE /auth/finance/fee-types/:id */
  deleteFeeType(id: number) {
    return api.delete(`/auth/finance/fee-types/${id}`);
  },

  // ── Fee Structures ───────────────────────────────────────────────
  /** GET /auth/finance/structures */
  getAllFeeStructures() {
    return api.get<FeeStructureResponseDTO[]>("/auth/finance/structures");
  },

  /** POST /auth/finance/structures */
  createFeeStructure(data: FeeStructureCreateDTO) {
    return api.post<FeeStructureResponseDTO>("/auth/finance/structures", data);
  },

  /** GET /auth/finance/:structureId */
  getFeeStructureById(structureId: number) {
    return api.get<FeeStructureResponseDTO>(`/auth/finance/${structureId}`);
  },

  /** PUT /auth/finance/:structureId */
  updateFeeStructure(structureId: number, data: FeeStructureUpdateDTO) {
    return api.put<FeeStructureResponseDTO>(`/auth/finance/${structureId}`, data);
  },

  /** DELETE /auth/finance/:structureId */
  deleteFeeStructure(structureId: number) {
    return api.delete(`/auth/finance/${structureId}`);
  },

  // ── Student-Fee Maps ─────────────────────────────────────────────
  /** GET /auth/finance/student-maps */
  getAllStudentFeeMaps() {
    return api.get<StudentFeeMapResponseDTO[]>("/auth/finance/student-maps");
  },

  /** POST /auth/finance/student-maps */
  createStudentFeeMap(data: StudentFeeMapCreateDTO) {
    return api.post<StudentFeeMapResponseDTO>("/auth/finance/student-maps", data);
  },

  /** POST /auth/finance/student-maps/bulk */
  createBulkStudentFeeMaps(data: StudentFeeMapCreateDTO[]) {
    return api.post<StudentFeeMapResponseDTO[]>("/auth/finance/student-maps/bulk", data);
  },

  /** GET /auth/finance/student-maps/:mapId */
  getStudentFeeMapById(mapId: number) {
    return api.get<StudentFeeMapResponseDTO>(`/auth/finance/student-maps/${mapId}`);
  },

  /** PUT /auth/finance/student-maps/:mapId */
  updateStudentFeeMap(mapId: number, data: StudentFeeMapUpdateDTO) {
    return api.put<StudentFeeMapResponseDTO>(`/auth/finance/student-maps/${mapId}`, data);
  },

  /** DELETE /auth/finance/student-maps/:mapId */
  deleteStudentFeeMap(mapId: number) {
    return api.delete(`/auth/finance/student-maps/${mapId}`);
  },

  /** DELETE /auth/finance/student-maps/bulk */
  deleteBulkStudentFeeMaps(mapIds: number[]) {
    return api.delete("/auth/finance/student-maps/bulk", { data: mapIds });
  },

  // ── Invoices ─────────────────────────────────────────────────────
  /** GET /auth/finance/invoices (paginated) */
  getAllInvoices(params?: Pageable) {
    return api.get<PageResponse<InvoiceResponseDTO>>("/auth/finance/invoices", {
      params,
    });
  },

  /** GET /auth/finance/invoices/:invoiceId */
  getInvoiceById(invoiceId: number) {
    return api.get<InvoiceResponseDTO>(`/auth/finance/invoices/${invoiceId}`);
  },

  /** POST /auth/finance/invoices/:invoiceId/cancel */
  cancelInvoice(invoiceId: number) {
    return api.post<InvoiceResponseDTO>(`/auth/finance/invoices/${invoiceId}/cancel`);
  },

  /** POST /auth/finance/invoices/:invoiceId/apply-late-fee */
  applyLateFee(invoiceId: number) {
    return api.post<InvoiceResponseDTO>(
      `/auth/finance/invoices/${invoiceId}/apply-late-fee`
    );
  },

  /** POST /auth/finance/invoices/generate-single/:studentId */
  generateSingleInvoice(studentId: number) {
    return api.post<InvoiceResponseDTO>(
      `/auth/finance/invoices/generate-single/${studentId}`
    );
  },

  /** GET /auth/finance/invoices/:invoiceId/receipt */
  getInvoiceReceipt(invoiceId: number) {
    return api.get<Blob>(`/auth/finance/invoices/${invoiceId}/receipt`, {
      responseType: "blob",
    });
  },

  // ── Payments ─────────────────────────────────────────────────────
  /** GET /auth/finance/payments (paginated) */
  getAllPayments(params?: Pageable) {
    return api.get<PageResponse<PaymentResponseDTO>>("/auth/finance/payments", {
      params,
    });
  },

  /** GET /auth/finance/payments/:paymentId */
  getPaymentById(paymentId: number) {
    return api.get<PaymentResponseDTO>(`/auth/finance/payments/${paymentId}`);
  },

  /** PUT /auth/finance/payments/:paymentId */
  updatePayment(paymentId: number, data: PaymentUpdateDTO) {
    return api.put<PaymentResponseDTO>(`/auth/finance/payments/${paymentId}`, data);
  },

  /** POST /auth/finance/payments/record-offline */
  recordOfflinePayment(data: RecordOfflinePaymentDTO) {
    return api.post<PaymentResponseDTO>("/auth/finance/payments/record-offline", data);
  },

  getPaymentsByInvoiceId(invoiceId: number) {
    return api.get<PaymentResponseDTO[]>(`/auth/finance/payments/invoice/${invoiceId}`);
  },

  getPaymentReceipt(paymentId: number) {
    return api.get<Blob>(`/auth/finance/payments/${paymentId}/receipt`, {
      responseType: "blob",
    });
  },

  // ── Late Fee Rules ───────────────────────────────────────────────
  /** GET /auth/finance/late-fee-rules */
  getAllLateFeeRules() {
    return api.get<LateFeeRuleResponseDTO[]>("/auth/finance/late-fee-rules");
  },

  /** POST /auth/finance/late-fee-rules */
  createLateFeeRule(data: LateFeeRuleCreateDTO) {
    return api.post<LateFeeRuleResponseDTO>("/auth/finance/late-fee-rules", data);
  },

  /** PUT /auth/finance/late-fee-rules/:ruleId */
  updateLateFeeRule(ruleId: number, data: LateFeeRuleCreateDTO) {
    return api.put<LateFeeRuleResponseDTO>(`/auth/finance/late-fee-rules/${ruleId}`, data);
  },

  // ── Parent Portal ────────────────────────────────────────────────
  /** POST /auth/finance/parent/payments/initiate */
  initiatePayment(data: InitiatePaymentRequestDTO) {
    return api.post<InitiatePaymentResponseDTO>(
      "/auth/finance/parent/payments/initiate",
      data
    );
  },

  /** POST /auth/finance/parent/payments/verify */
  verifyPayment(data: VerifyPaymentRequestDTO) {
    return api.post<PaymentResponseDTO>("/auth/finance/parent/payments/verify", data);
  },

  /** GET /auth/finance/parent/invoices/:invoiceId */
  getInvoiceForParent(invoiceId: number) {
    return api.get<InvoiceResponseDTO>(`/auth/finance/parent/invoices/${invoiceId}`);
  },

  /** GET /auth/finance/parent/invoices/for-student/:studentId */
  getInvoicesForStudent(studentId: number) {
    return api.get<InvoiceResponseDTO[]>(
      `/auth/finance/parent/invoices/for-student/${studentId}`
    );
  },

  // ── Dashboard ────────────────────────────────────────────────────
  /** GET /auth/finance/dashboard/summary */
  getAdminDashboardSummary() {
    return api.get<AdminDashboardSummaryDTO>("/auth/finance/dashboard/summary");
  },

  /** GET /auth/finance/dashboard/invoices/:invoiceId */
  getDashboardInvoiceById(invoiceId: number) {
    return api.get<InvoiceResponseDTO>(`/auth/finance/dashboard/invoices/${invoiceId}`);
  },

  /** GET /auth/finance/dashboard/invoices/for-student/:studentId */
  getDashboardInvoicesForStudent(studentId: number) {
    return api.get<InvoiceResponseDTO[]>(
      `/auth/finance/dashboard/invoices/for-student/${studentId}`
    );
  },

  /** GET /auth/finance/dashboard/dashboard/summary/for-student/:studentId */
  getParentDashboardSummary(studentId: number) {
    return api.get<ParentDashboardSummaryDTO>(
      `/auth/finance/dashboard/dashboard/summary/for-student/${studentId}`
    );
  },

  // ── Scholarships ─────────────────────────────────────────────────
  getScholarshipTypes() {
    return api.get("/auth/finance/scholarships/types");
  },
  createScholarshipType(data: any) {
    return api.post("/auth/finance/scholarships/types", data);
  },
  getScholarshipAssignments() {
    return api.get("/auth/finance/scholarships/assignments");
  },
  assignScholarship(data: any) {
    return api.post("/auth/finance/scholarships/assignments", data);
  },
  revokeScholarshipAssignment(id: number) {
    return api.put(`/auth/finance/scholarships/assignments/${id}/revoke`);
  },
  activateScholarshipAssignment(id: number) {
    return api.put(`/auth/finance/scholarships/assignments/${id}/activate`);
  },
  deleteScholarshipAssignment(id: number) {
    return api.delete(`/auth/finance/scholarships/assignments/${id}`);
  },
  deleteBulkScholarshipAssignments(ids: number[]) {
    return api.delete("/auth/finance/scholarships/assignments/bulk", { data: ids });
  },

  // ── Installment Plans ────────────────────────────────────────────
  getInstallmentPlans() {
    return api.get("/auth/finance/installments/plans");
  },
  createInstallmentPlan(data: any) {
    return api.post("/auth/finance/installments/plans", data);
  },
  getInstallmentAssignments() {
    return api.get("/auth/finance/installments/assignments");
  },
  assignInstallmentPlan(data: any) {
    return api.post("/auth/finance/installments/assignments", data);
  },

  // ── Refunds ──────────────────────────────────────────────────────
  getRefunds() {
    return api.get("/auth/finance/refunds");
  },
  requestRefund(data: any) {
    return api.post("/auth/finance/refunds", data);
  },
  updateRefundStatus(id: number, status: string) {
    return api.put(`/auth/finance/refunds/${id}/status`, null, { params: { status } });
  },

  // ── Reminders ────────────────────────────────────────────────────
  getReminderTemplates() {
    return api.get("/auth/finance/reminders/templates");
  },
  createReminderTemplate(data: any) {
    return api.post("/auth/finance/reminders/templates", data);
  },
  toggleReminderTemplate(id: number) {
    return api.put(`/auth/finance/reminders/templates/${id}/toggle`);
  },
  getReminderLogs() {
    return api.get("/auth/finance/reminders/logs");
  },
  triggerBulkReminders() {
    return api.post("/auth/finance/reminders/trigger-bulk");
  },

  // ── Financial Statements (Phase 5) ───────────────────────────────
  getTrialBalance(asOfDate: string) {
    return api.get("/auth/finance/statements/trial-balance", { params: { asOfDate } });
  },
  getProfitAndLoss(startDate: string, endDate: string) {
    return api.get("/auth/finance/statements/profit-and-loss", { params: { startDate, endDate } });
  },
  getBalanceSheet(asOfDate: string) {
    return api.get("/auth/finance/statements/balance-sheet", { params: { asOfDate } });
  },

  // ── Miscellaneous Receipts (Phase 5) ──────────────────────────────
  getMiscReceipts() {
    return api.get("/auth/finance/misc-receipts");
  },
  createMiscReceipt(data: any) {
    return api.post("/auth/finance/misc-receipts", data);
  },

  // ── Finance Audit Logs (Phase 5) ──────────────────────────────────
  getFinanceAuditLogs() {
    return api.get("/auth/finance/audit-logs");
  },
};
