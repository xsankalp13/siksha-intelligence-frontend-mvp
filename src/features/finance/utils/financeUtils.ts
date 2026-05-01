// ── Finance Utilities ─────────────────────────────────────────────────────────

export const formatINR = (n: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export const formatINRCompact = (n: number): string => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};

export const computeCollectionRate = (collected: number, billed: number): number => {
  if (billed <= 0) return 0;
  return Math.min(100, Math.round((collected / billed) * 100));
};

export interface InstallmentScheduleItem {
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: "PAID" | "UPCOMING" | "OVERDUE";
}

export const computeInstallmentSchedule = (
  totalAmount: number,
  numberOfInstallments: number,
  startDate: Date,
  intervalDays: number = 30
): InstallmentScheduleItem[] => {
  const amountPerEmi = Math.round(totalAmount / numberOfInstallments);
  const remainder = totalAmount - amountPerEmi * (numberOfInstallments - 1);
  const today = new Date();

  return Array.from({ length: numberOfInstallments }, (_, i) => {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + i * intervalDays);
    const amount = i === numberOfInstallments - 1 ? remainder : amountPerEmi;

    let status: "PAID" | "UPCOMING" | "OVERDUE" = "UPCOMING";
    if (dueDate < today) status = "OVERDUE";

    return {
      installmentNo: i + 1,
      dueDate: dueDate.toISOString().split("T")[0],
      amount,
      status,
    };
  });
};

export const groupByMonth = <T extends { issueDate?: string; paymentDate?: string }>(
  items: T[],
  dateField: keyof T,
  months: number = 6
): Record<string, T[]> => {
  const result: Record<string, T[]> = {};
  const today = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    result[key] = [];
  }

  items.forEach((item) => {
    const dateStr = item[dateField] as string;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    if (result[key] !== undefined) {
      result[key].push(item);
    }
  });

  return result;
};
