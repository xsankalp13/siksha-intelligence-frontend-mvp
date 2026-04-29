import { api } from '@/lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AssetStatus = 'IN_TRANSIT' | 'ACTIVE' | 'UNDER_MAINTENANCE' | 'DISPOSED' | 'WRITTEN_OFF';
export type DepreciationMethod = 'STRAIGHT_LINE' | 'WRITTEN_DOWN_VALUE' | 'UNITS_OF_PRODUCTION';
export type ReconciliationStatus = 'UNRECONCILED' | 'AUTO_MATCHED' | 'MANUALLY_MATCHED' | 'EXCEPTION' | 'IGNORED';
export type BankTransactionType = 'CREDIT' | 'DEBIT';
export type GrantStatus = 'APPLIED' | 'SANCTIONED' | 'ACTIVE' | 'PARTIALLY_UTILISED' | 'FULLY_UTILISED' | 'CLOSED' | 'LAPSED';

export interface AssetResponseDTO {
  id: number; uuid: string; assetCode: string; name: string;
  assetCategory: string | null; location: string | null; description: string | null;
  make: string | null; model: string | null; serialNumber: string | null;
  purchaseDate: string; inUseDate: string | null;
  purchaseCost: number; salvageValue: number; depreciableAmount: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod; depreciationRatePct: number | null;
  accumulatedDepreciation: number; currentBookValue: number;
  lastDepreciationDate: string | null;
  status: AssetStatus;
  vendorId: number | null; vendorName: string | null;
  assetAccountId: number | null; assetAccountCode: string | null; assetAccountName: string | null;
  disposalDate: string | null; disposalReason: string | null; disposalProceeds: number | null;
  notes: string | null;
  createdAt: string; createdBy: string | null;
}

export interface DepreciationEntryResponseDTO {
  id: number; assetId: number; assetCode: string; assetName: string;
  financialYear: string; depreciationDate: string;
  openingBookValue: number; depreciationAmount: number; closingBookValue: number;
  glEntryId: number | null; notes: string | null;
  createdAt: string; createdBy: string | null;
}

export interface BankAccountResponseDTO {
  id: number; uuid: string; accountName: string; accountNumber: string;
  bankName: string; branchName: string | null; ifscCode: string | null; accountType: string | null;
  coaAccountId: number | null; coaAccountCode: string | null; coaAccountName: string | null;
  statementBalance: number; bookBalance: number; difference: number;
  unreconciledCount: number;
  isActive: boolean; notes: string | null; createdAt: string;
}

export interface BankTransactionResponseDTO {
  id: number; bankAccountId: number; bankAccountName: string;
  transactionDate: string; valueDate: string | null;
  description: string; referenceNumber: string | null; instrumentNumber: string | null;
  transactionType: BankTransactionType; amount: number; runningBalance: number | null;
  reconciliationStatus: ReconciliationStatus;
  matchedGlEntryId: number | null; reconciliationNotes: string | null;
  createdAt: string;
}

export interface GrantUtilizationResponseDTO {
  id: number; grantId: number; grantTitle: string;
  utilisationDate: string; description: string; expenseCategory: string | null;
  amount: number; referenceDocument: string | null;
  glEntryId: number | null; approvedBy: string | null; notes: string | null;
  createdAt: string;
}

export interface GrantResponseDTO {
  id: number; uuid: string;
  grantingAgency: string; grantTitle: string; grantReference: string | null;
  principalInvestigator: string | null; department: string | null;
  sanctionedAmount: number; receivedAmount: number;
  utilisedAmount: number; availableBalance: number; utilisationPct: number;
  startDate: string | null; endDate: string | null;
  status: GrantStatus;
  incomeAccountId: number | null; incomeAccountCode: string | null; incomeAccountName: string | null;
  complianceDueDate: string | null; nearingExpiry: boolean; complianceOverdue: boolean;
  objectives: string | null; notes: string | null;
  utilisations: GrantUtilizationResponseDTO[];
  createdAt: string; createdBy: string | null;
}

// ── Services ──────────────────────────────────────────────────────────────────

export const assetService = {
  getAll: () => api.get<AssetResponseDTO[]>('/auth/finance/assets'),
  getById: (id: number) => api.get<AssetResponseDTO>(`/auth/finance/assets/${id}`),
  create: (data: any) => api.post<AssetResponseDTO>('/auth/finance/assets', data),
  update: (id: number, data: any) => api.put<AssetResponseDTO>(`/auth/finance/assets/${id}`, data),
  depreciate: (id: number, financialYear: string) => api.post<DepreciationEntryResponseDTO>(`/auth/finance/assets/${id}/depreciate`, null, { params: { financialYear } }),
  depreciationBatch: (financialYear: string) => api.post<DepreciationEntryResponseDTO[]>('/auth/finance/assets/depreciate-batch', null, { params: { financialYear } }),
  getDepreciationHistory: (id: number) => api.get<DepreciationEntryResponseDTO[]>(`/auth/finance/assets/${id}/depreciation`),
  dispose: (id: number, disposalDate: string, reason: string, proceeds?: number) =>
    api.post<AssetResponseDTO>(`/auth/finance/assets/${id}/dispose`, null, { params: { disposalDate, reason, proceeds } }),
};

export const bankService = {
  getAccounts: () => api.get<BankAccountResponseDTO[]>('/auth/finance/bank/accounts'),
  createAccount: (data: any) => api.post<BankAccountResponseDTO>('/auth/finance/bank/accounts', data),
  getTransactions: (bankAccountId: number, status?: ReconciliationStatus) =>
    api.get<BankTransactionResponseDTO[]>(`/auth/finance/bank/accounts/${bankAccountId}/transactions`, { params: { status } }),
  addTransaction: (data: any) => api.post<BankTransactionResponseDTO>('/auth/finance/bank/transactions', data),
  autoMatch: (bankAccountId: number) => api.post<{ matched: number }>(`/auth/finance/bank/accounts/${bankAccountId}/auto-match`),
  manualMatch: (txId: number, glEntryId: number, notes?: string) =>
    api.post<BankTransactionResponseDTO>(`/auth/finance/bank/transactions/${txId}/manual-match`, null, { params: { glEntryId, notes } }),
  flagException: (txId: number, reason: string) =>
    api.post<BankTransactionResponseDTO>(`/auth/finance/bank/transactions/${txId}/flag-exception`, null, { params: { reason } }),
  ignore: (txId: number) => api.post<BankTransactionResponseDTO>(`/auth/finance/bank/transactions/${txId}/ignore`),
};

export const grantService = {
  getAll: () => api.get<GrantResponseDTO[]>('/auth/finance/grants'),
  getById: (id: number) => api.get<GrantResponseDTO>(`/auth/finance/grants/${id}`),
  getNearingExpiry: () => api.get<GrantResponseDTO[]>('/auth/finance/grants/nearing-expiry'),
  create: (data: any) => api.post<GrantResponseDTO>('/auth/finance/grants', data),
  update: (id: number, data: any) => api.put<GrantResponseDTO>(`/auth/finance/grants/${id}`, data),
  activate: (id: number, receivedAmount?: number) => api.post<GrantResponseDTO>(`/auth/finance/grants/${id}/activate`, null, { params: { receivedAmount } }),
  updateStatus: (id: number, status: GrantStatus) => api.post<GrantResponseDTO>(`/auth/finance/grants/${id}/status`, null, { params: { status } }),
  close: (id: number) => api.post<GrantResponseDTO>(`/auth/finance/grants/${id}/close`),
  lapse: (id: number) => api.post<GrantResponseDTO>(`/auth/finance/grants/${id}/lapse`),
  recordUtilisation: (data: any) => api.post<GrantUtilizationResponseDTO>('/auth/finance/grants/utilisations', data),
  getUtilisations: (id: number) => api.get<GrantUtilizationResponseDTO[]>(`/auth/finance/grants/${id}/utilisations`),
};
