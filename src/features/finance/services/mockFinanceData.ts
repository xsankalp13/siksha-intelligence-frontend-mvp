// ── Mock Finance Data Service ─────────────────────────────────────────────────
// Provides realistic sample data for features that don't have backend APIs yet.
// Wire these to real endpoints when backend is ready.

export interface ScholarshipType {
  id: number;
  name: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  eligibilityCriteria: string;
  maxRecipients?: number;
  activeCount: number;
  totalDiscountIssued: number;
}

export interface ScholarshipAssignment {
  id: number;
  studentId: number;
  studentName: string;
  scholarshipName: string;
  scholarshipId: number;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  effectiveFrom: string;
  effectiveTo?: string;
  reason: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
}

export interface FeeWaiver {
  id: number;
  studentId: number;
  studentName: string;
  invoiceId: number;
  invoiceNumber: string;
  waiverAmount: number;
  reason: string;
  requestedBy: string;
  approvedBy?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  processedAt?: string;
}

export interface InstallmentPlan {
  id: number;
  name: string;
  numberOfInstallments: number;
  intervalDays: number;
  description: string;
  gracePeriodDays: number;
  assignedStudents: number;
}

export interface InstallmentAssignment {
  id: number;
  studentId: number;
  studentName: string;
  planName: string;
  totalAmount: number;
  paidInstallments: number;
  totalInstallments: number;
  nextDueDate: string;
  nextDueAmount: number;
  status: "ON_TRACK" | "OVERDUE" | "COMPLETED";
}

export interface ReminderTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  channel: "EMAIL" | "SMS" | "PUSH";
  trigger: "BEFORE_DUE" | "ON_DUE" | "AFTER_DUE";
  triggerDays: number;
  isActive: boolean;
}

export interface ReminderLog {
  id: number;
  studentId: number;
  studentName: string;
  templateName: string;
  channel: string;
  sentAt: string;
  status: "SENT" | "FAILED" | "QUEUED";
  invoiceNumber: string;
  amountDue: number;
}

export interface RefundRecord {
  id: number;
  studentId: number;
  studentName: string;
  paymentId: number;
  invoiceNumber: string;
  refundAmount: number;
  reason: string;
  refundMethod: "ORIGINAL_METHOD" | "BANK_TRANSFER" | "CREDIT_NOTE";
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "PROCESSED";
  requestedAt: string;
  processedAt?: string;
  remarks?: string;
}

// ── Scholarship Data ──────────────────────────────────────────────────────────

export const MOCK_SCHOLARSHIP_TYPES: ScholarshipType[] = [
  {
    id: 1,
    name: "Merit Scholarship",
    description: "Awarded to students with 90%+ academic performance",
    discountType: "PERCENTAGE",
    discountValue: 50,
    eligibilityCriteria: "Academic score ≥ 90%",
    maxRecipients: 10,
    activeCount: 8,
    totalDiscountIssued: 240000,
  },
  {
    id: 2,
    name: "Staff Child Concession",
    description: "Concession for children of school staff members",
    discountType: "PERCENTAGE",
    discountValue: 25,
    eligibilityCriteria: "Parent/Guardian is a school employee",
    activeCount: 12,
    totalDiscountIssued: 180000,
  },
  {
    id: 3,
    name: "Sports Excellence",
    description: "For students representing school/district in sports",
    discountType: "PERCENTAGE",
    discountValue: 30,
    eligibilityCriteria: "State/National level sports participant",
    activeCount: 5,
    totalDiscountIssued: 75000,
  },
  {
    id: 4,
    name: "Need-Based Subsidy",
    description: "Financial assistance for economically weaker students",
    discountType: "FIXED",
    discountValue: 5000,
    eligibilityCriteria: "Annual family income < ₹2L",
    maxRecipients: 20,
    activeCount: 14,
    totalDiscountIssued: 70000,
  },
  {
    id: 5,
    name: "Sibling Discount",
    description: "Second child onwards fee discount",
    discountType: "PERCENTAGE",
    discountValue: 10,
    eligibilityCriteria: "Two or more siblings enrolled",
    activeCount: 18,
    totalDiscountIssued: 54000,
  },
];

export const MOCK_SCHOLARSHIP_ASSIGNMENTS: ScholarshipAssignment[] = [
  { id: 1, studentId: 1001, studentName: "Arjun Sharma", scholarshipName: "Merit Scholarship", scholarshipId: 1, discountType: "PERCENTAGE", discountValue: 50, effectiveFrom: "2024-04-01", reason: "Scored 92% in board exams", status: "ACTIVE" },
  { id: 2, studentId: 1002, studentName: "Priya Mehta", scholarshipName: "Staff Child Concession", scholarshipId: 2, discountType: "PERCENTAGE", discountValue: 25, effectiveFrom: "2024-04-01", reason: "Father is Chemistry teacher", status: "ACTIVE" },
  { id: 3, studentId: 1003, studentName: "Rahul Singh", scholarshipName: "Sports Excellence", scholarshipId: 3, discountType: "PERCENTAGE", discountValue: 30, effectiveFrom: "2024-04-01", reason: "State cricket player", status: "ACTIVE" },
  { id: 4, studentId: 1004, studentName: "Neha Patel", scholarshipName: "Need-Based Subsidy", scholarshipId: 4, discountType: "FIXED", discountValue: 5000, effectiveFrom: "2024-04-01", reason: "BPL category", status: "ACTIVE" },
  { id: 5, studentId: 1005, studentName: "Vikram Rao", scholarshipName: "Sibling Discount", scholarshipId: 5, discountType: "PERCENTAGE", discountValue: 10, effectiveFrom: "2024-04-01", reason: "Elder sibling Vishal in Grade 11", status: "ACTIVE" },
  { id: 6, studentId: 1006, studentName: "Anjali Das", scholarshipName: "Merit Scholarship", scholarshipId: 1, discountType: "PERCENTAGE", discountValue: 50, effectiveFrom: "2023-04-01", effectiveTo: "2024-03-31", reason: "Previous year topper", status: "EXPIRED" },
];

// ── Fee Waiver Data ───────────────────────────────────────────────────────────

export const MOCK_FEE_WAIVERS: FeeWaiver[] = [
  { id: 1, studentId: 1010, studentName: "Karan Gupta", invoiceId: 201, invoiceNumber: "INV-2024-0201", waiverAmount: 3000, reason: "Medical emergency — hospitalized for 3 weeks", requestedBy: "Class Teacher", approvedBy: "Principal", status: "APPROVED", requestedAt: "2024-09-01", processedAt: "2024-09-03" },
  { id: 2, studentId: 1011, studentName: "Divya Kumar", invoiceId: 205, invoiceNumber: "INV-2024-0205", waiverAmount: 1500, reason: "Transport fee waiver — student uses school bus", requestedBy: "Accounts Dept", status: "PENDING", requestedAt: "2024-10-15" },
  { id: 3, studentId: 1012, studentName: "Arun Nair", invoiceId: 212, invoiceNumber: "INV-2024-0212", waiverAmount: 2000, reason: "Duplicate charge — fee already collected in previous invoice", requestedBy: "Accountant", approvedBy: "Vice Principal", status: "APPROVED", requestedAt: "2024-10-02", processedAt: "2024-10-04" },
  { id: 4, studentId: 1013, studentName: "Sneha Iyer", invoiceId: 220, invoiceNumber: "INV-2024-0220", waiverAmount: 5000, reason: "Scholarship already applied but system error", requestedBy: "Admin", status: "REJECTED", requestedAt: "2024-11-01", processedAt: "2024-11-02" },
];

// ── Installment Plan Data ─────────────────────────────────────────────────────

export const MOCK_INSTALLMENT_PLANS: InstallmentPlan[] = [
  { id: 1, name: "Quarterly (4 EMIs)", numberOfInstallments: 4, intervalDays: 90, description: "Split fees into 4 equal quarterly payments", gracePeriodDays: 7, assignedStudents: 23 },
  { id: 2, name: "Bi-Monthly (6 EMIs)", numberOfInstallments: 6, intervalDays: 60, description: "6 installments every 2 months", gracePeriodDays: 5, assignedStudents: 15 },
  { id: 3, name: "Monthly (10 EMIs)", numberOfInstallments: 10, intervalDays: 30, description: "10 monthly installments across the academic year", gracePeriodDays: 3, assignedStudents: 8 },
  { id: 4, name: "Two-Part (2 EMIs)", numberOfInstallments: 2, intervalDays: 180, description: "Half yearly — start and mid-year", gracePeriodDays: 15, assignedStudents: 41 },
];

export const MOCK_INSTALLMENT_ASSIGNMENTS: InstallmentAssignment[] = [
  { id: 1, studentId: 1020, studentName: "Rohan Verma", planName: "Quarterly (4 EMIs)", totalAmount: 48000, paidInstallments: 2, totalInstallments: 4, nextDueDate: "2024-10-01", nextDueAmount: 12000, status: "ON_TRACK" },
  { id: 2, studentId: 1021, studentName: "Meera Joshi", planName: "Monthly (10 EMIs)", totalAmount: 36000, paidInstallments: 3, totalInstallments: 10, nextDueDate: "2024-09-15", nextDueAmount: 3600, status: "OVERDUE" },
  { id: 3, studentId: 1022, studentName: "Suresh Pillai", planName: "Two-Part (2 EMIs)", totalAmount: 60000, paidInstallments: 2, totalInstallments: 2, nextDueDate: "2024-03-01", nextDueAmount: 0, status: "COMPLETED" },
  { id: 4, studentId: 1023, studentName: "Lakshmi Reddy", planName: "Bi-Monthly (6 EMIs)", totalAmount: 42000, paidInstallments: 1, totalInstallments: 6, nextDueDate: "2024-10-10", nextDueAmount: 7000, status: "ON_TRACK" },
];

// ── Reminder Data ─────────────────────────────────────────────────────────────

export const MOCK_REMINDER_TEMPLATES: ReminderTemplate[] = [
  { id: 1, name: "7-Day Pre-Due Alert", subject: "Fee Due in 7 Days — {{invoiceNumber}}", body: "Dear Parent, this is a reminder that {{studentName}}'s fee of {{amount}} is due on {{dueDate}}. Please ensure timely payment to avoid late charges.", channel: "EMAIL", trigger: "BEFORE_DUE", triggerDays: 7, isActive: true },
  { id: 2, name: "Due Date SMS", subject: "Fee Due Today", body: "Fee of {{amount}} for {{studentName}} is DUE TODAY. Pay now: {{paymentLink}}", channel: "SMS", trigger: "ON_DUE", triggerDays: 0, isActive: true },
  { id: 3, name: "3-Day Overdue Warning", subject: "URGENT: Overdue Fee Notice", body: "Fee for {{studentName}} is 3 days overdue. A late fee may be applied shortly. Please pay {{amount}} immediately.", channel: "EMAIL", trigger: "AFTER_DUE", triggerDays: 3, isActive: true },
  { id: 4, name: "15-Day Final Notice", subject: "Final Notice: Fee Overdue by 15 Days", body: "This is your final notice. {{studentName}}'s fee of {{amount}} is 15 days overdue. Please contact the accounts office.", channel: "EMAIL", trigger: "AFTER_DUE", triggerDays: 15, isActive: false },
];

export const MOCK_REMINDER_LOGS: ReminderLog[] = [
  { id: 1, studentId: 1030, studentName: "Ananya Krishnan", templateName: "7-Day Pre-Due Alert", channel: "EMAIL", sentAt: "2024-10-18T09:00:00", status: "SENT", invoiceNumber: "INV-2024-0301", amountDue: 15000 },
  { id: 2, studentId: 1031, studentName: "Bharat Shetty", templateName: "Due Date SMS", channel: "SMS", sentAt: "2024-10-25T08:30:00", status: "SENT", invoiceNumber: "INV-2024-0302", amountDue: 12000 },
  { id: 3, studentId: 1032, studentName: "Champa Desai", templateName: "3-Day Overdue Warning", channel: "EMAIL", sentAt: "2024-10-28T10:00:00", status: "FAILED", invoiceNumber: "INV-2024-0303", amountDue: 18000 },
  { id: 4, studentId: 1033, studentName: "Dinesh Khanna", templateName: "7-Day Pre-Due Alert", channel: "EMAIL", sentAt: "2024-10-17T09:00:00", status: "SENT", invoiceNumber: "INV-2024-0304", amountDue: 9000 },
  { id: 5, studentId: 1034, studentName: "Esha Malhotra", templateName: "15-Day Final Notice", channel: "EMAIL", sentAt: "2024-10-10T11:00:00", status: "QUEUED", invoiceNumber: "INV-2024-0305", amountDue: 22000 },
];

// ── Refund Data ───────────────────────────────────────────────────────────────

export const MOCK_REFUNDS: RefundRecord[] = [
  { id: 1, studentId: 1040, studentName: "Farhan Ahmad", paymentId: 5001, invoiceNumber: "INV-2024-0401", refundAmount: 8000, reason: "Duplicate payment — paid twice online", refundMethod: "ORIGINAL_METHOD", status: "PROCESSED", requestedAt: "2024-09-15", processedAt: "2024-09-17", remarks: "Refunded to original Razorpay account" },
  { id: 2, studentId: 1041, studentName: "Gauri Tiwari", paymentId: 5002, invoiceNumber: "INV-2024-0402", refundAmount: 3500, reason: "Student transferred mid-term — partial refund", refundMethod: "BANK_TRANSFER", status: "APPROVED", requestedAt: "2024-10-01", processedAt: "2024-10-03" },
  { id: 3, studentId: 1042, studentName: "Harish Nambiar", paymentId: 5003, invoiceNumber: "INV-2024-0403", refundAmount: 1200, reason: "Lab fee overcharged — not applicable for this student", refundMethod: "CREDIT_NOTE", status: "REQUESTED", requestedAt: "2024-10-20" },
  { id: 4, studentId: 1043, studentName: "Ishita Saxena", paymentId: 5004, invoiceNumber: "INV-2024-0404", refundAmount: 15000, reason: "Scholarship applied late — fee collected before concession", refundMethod: "BANK_TRANSFER", status: "REJECTED", requestedAt: "2024-10-05", processedAt: "2024-10-07", remarks: "Policy does not allow retroactive refunds" },
];
