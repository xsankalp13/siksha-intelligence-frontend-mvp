import { api } from "@/lib/axios";
import type { PageResponse } from "./types/common";

// ── Types ────────────────────────────────────────────────────────────────────

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
export type JournalEntryStatus = "DRAFT" | "POSTED" | "REVERSED";
export type JournalReferenceType =
  | "PAYMENT" | "REFUND" | "PAYROLL_RUN" | "EXPENSE_CLAIM"
  | "VENDOR_BILL" | "GRANT_UTILIZATION" | "DEPRECIATION" | "MANUAL";

export interface AccountResponseDTO {
  id: number;
  uuid: string;
  code: string;
  name: string;
  accountType: AccountType;
  parentAccountId: number | null;
  parentAccountName: string | null;
  description: string | null;
  balance: number;
  postingAccount: boolean;
  active: boolean;
  children: AccountResponseDTO[];
}

export interface AccountRequestDTO {
  code: string;
  name: string;
  accountType: AccountType;
  parentAccountId: number | null;
  description?: string;
  postingAccount: boolean;
  active: boolean;
}

export interface JournalLineResponseDTO {
  lineId: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  narration: string | null;
  lineNumber: number | null;
}

export interface JournalEntryResponseDTO {
  id: number;
  uuid: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  referenceType: JournalReferenceType;
  referenceId: number | null;
  status: JournalEntryStatus;
  postedBy: string | null;
  reversalOfEntryId: number | null;
  totalDebits: number;
  totalCredits: number;
  lines: JournalLineResponseDTO[];
  createdAt: string;
  createdBy: string | null;
}

export interface JournalLineRequestDTO {
  accountId: number;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
}

export interface JournalEntryRequestDTO {
  entryDate: string;
  description: string;
  referenceType?: JournalReferenceType;
  referenceId?: number;
  lines: JournalLineRequestDTO[];
}

export interface TrialBalanceRowDTO {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
  isDebitBalance: boolean;
}

// ── COA Service ──────────────────────────────────────────────────────────────

export const coaService = {
  /** GET /auth/finance/accounts/tree — full nested COA tree */
  getTree() {
    return api.get<AccountResponseDTO[]>("/auth/finance/accounts/tree");
  },

  /** GET /auth/finance/accounts — flat list of all accounts */
  getAll() {
    return api.get<AccountResponseDTO[]>("/auth/finance/accounts");
  },

  /** GET /auth/finance/accounts/posting — active posting accounts for dropdowns */
  getPostingAccounts() {
    return api.get<AccountResponseDTO[]>("/auth/finance/accounts/posting");
  },

  /** POST /auth/finance/accounts */
  create(data: AccountRequestDTO) {
    return api.post<AccountResponseDTO>("/auth/finance/accounts", data);
  },

  /** PUT /auth/finance/accounts/:id */
  update(id: number, data: AccountRequestDTO) {
    return api.put<AccountResponseDTO>(`/auth/finance/accounts/${id}`, data);
  },

  /** DELETE /auth/finance/accounts/:id */
  deactivate(id: number) {
    return api.delete(`/auth/finance/accounts/${id}`);
  },

  /** POST /auth/finance/accounts/seed — seed the default COA */
  seedDefault() {
    return api.post<string>("/auth/finance/accounts/seed");
  },
};

// ── General Ledger Service ────────────────────────────────────────────────────

export const glService = {
  /** POST /auth/finance/gl/journal-entries */
  createManualEntry(data: JournalEntryRequestDTO) {
    return api.post<JournalEntryResponseDTO>("/auth/finance/gl/journal-entries", data);
  },

  /** GET /auth/finance/gl/journal-entries (paginated + filtered) */
  getJournalEntries(params: {
    status?: JournalEntryStatus;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }) {
    return api.get<PageResponse<JournalEntryResponseDTO>>("/auth/finance/gl/journal-entries", { params });
  },

  /** GET /auth/finance/gl/journal-entries/:id */
  getById(id: number) {
    return api.get<JournalEntryResponseDTO>(`/auth/finance/gl/journal-entries/${id}`);
  },

  /** POST /auth/finance/gl/journal-entries/:id/reverse */
  reverseEntry(id: number, reason?: string) {
    return api.post<JournalEntryResponseDTO>(
      `/auth/finance/gl/journal-entries/${id}/reverse`,
      null,
      { params: { reason } }
    );
  },

  /** GET /auth/finance/gl/trial-balance */
  getTrialBalance() {
    return api.get<TrialBalanceRowDTO[]>("/auth/finance/gl/trial-balance");
  },

  /** GET /auth/finance/gl/ledger/:accountId */
  getAccountLedger(accountId: number, params: { from?: string; to?: string }) {
    return api.get<JournalEntryResponseDTO[]>(`/auth/finance/gl/ledger/${accountId}`, { params });
  },
};
