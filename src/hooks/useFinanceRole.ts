import { useAppSelector } from "@/store/hooks";

/** Normalises "ROLE_FOO" → "FOO" */
const normalize = (r: string) => {
  const u = r.toUpperCase().trim();
  return u.startsWith("ROLE_") ? u.slice(5) : u;
};

export type FinanceRole = "FINANCE_ADMIN" | "AUDITOR" | "ADMIN" | "SCHOOL_ADMIN" | "SUPER_ADMIN" | "OTHER";

/**
 * Returns the most-privileged finance-relevant role the current user holds.
 *
 * Priority: SUPER_ADMIN > SCHOOL_ADMIN > ADMIN > FINANCE_ADMIN > AUDITOR > OTHER
 *
 * Usage:
 *   const { financeRole, isAdmin, isFinanceAdmin, isAuditor } = useFinanceRole();
 */
export function useFinanceRole() {
  const rawRoles = useAppSelector((s) => s.auth.user?.roles ?? []);
  const roles = rawRoles.map(normalize);

  const isSuperAdmin   = roles.includes("SUPER_ADMIN");
  const isSchoolAdmin  = roles.includes("SCHOOL_ADMIN");
  const isAdmin        = roles.includes("ADMIN");
  const isFinanceAdmin = roles.includes("FINANCE_ADMIN");
  const isAuditor      = roles.includes("AUDITOR");

  // "Full access" means they can see and act on everything in the finance module
  const hasFullAccess  = isSuperAdmin || isSchoolAdmin || isAdmin;

  let financeRole: FinanceRole = "OTHER";
  if (isSuperAdmin)       financeRole = "SUPER_ADMIN";
  else if (isSchoolAdmin) financeRole = "SCHOOL_ADMIN";
  else if (isAdmin)       financeRole = "ADMIN";
  else if (isFinanceAdmin) financeRole = "FINANCE_ADMIN";
  else if (isAuditor)     financeRole = "AUDITOR";

  return {
    financeRole,
    hasFullAccess,
    isAuditor:      !hasFullAccess && isAuditor,
    isFinanceAdmin: !hasFullAccess && isFinanceAdmin,
    /** Can perform write/approve operations (not AUDITOR) */
    canWrite: hasFullAccess || isFinanceAdmin,
  };
}
