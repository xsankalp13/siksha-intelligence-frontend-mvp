import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/features/super-admin/services/superAdminService";

const DEFAULT_CURRENCY = "INR";
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_DATE_FORMAT = "dd/MM/yyyy";

function safeDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatDateFromPattern(date: Date, pattern: string, timezone: string): string {
  if (Number.isNaN(date.getTime())) return "-";

  const numericParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = numericParts.find((part) => part.type === "year")?.value ?? "0000";
  const month = numericParts.find((part) => part.type === "month")?.value ?? "01";
  const day = numericParts.find((part) => part.type === "day")?.value ?? "01";

  const monthShort = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    month: "short",
  }).format(date);

  return pattern
    .replace("yyyy", year)
    .replace("MMM", monthShort)
    .replace("MM", month)
    .replace("dd", day);
}

export function useHrmsFormatters() {
  const { data } = useQuery({
    queryKey: ["settings", "whitelabel"],
    queryFn: () => settingsService.getWhiteLabel().then((res) => res.data),
  });

  const currency = data?.currency || DEFAULT_CURRENCY;
  const timezone = data?.timezone || DEFAULT_TIMEZONE;
  const datePattern = data?.dateFormat || DEFAULT_DATE_FORMAT;

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }),
    [currency]
  );

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-IN"), []);

  const formatCurrency = (value?: number | null): string => {
    if (value == null || Number.isNaN(value)) return "-";
    return currencyFormatter.format(value);
  };

  const formatNumber = (value?: number | null): string => {
    if (value == null || Number.isNaN(value)) return "-";
    return numberFormatter.format(value);
  };

  const formatDate = (value?: string | Date | null): string => {
    if (!value) return "-";
    return formatDateFromPattern(safeDate(value), datePattern, timezone);
  };

  return {
    formatCurrency,
    formatNumber,
    formatDate,
  };
}
