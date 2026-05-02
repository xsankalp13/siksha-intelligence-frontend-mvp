import type { ParsedSheetData } from "../types";

export const STUDENT_HEADERS: string[] = [
  "firstName",
  "lastName",
  "middleName",
  "email",
  "dateOfBirth",
  "rollNo",
  "gender",
  "enrollmentNumber",
  "enrollmentDate",
  "className",
  "sectionName",
];

export const STAFF_HEADERS: string[] = [
  "firstName",
  "lastName",
  "middleName",
  "email",
  "dateOfBirth",
  "gender",
  "employeeId",
  "joiningDate",
  "designationCode", // col 8 — OPTIONAL. Leave blank; admin can bulk-assign via Designations page later
  "department",
  "staffType",
  "staffCategory",
  "certifications",
  "specializations",
  "yearsOfExperience",
  "educationLevel",
  "stateLicenseNumber",
  "administrativeCertifications",
  "schoolLevelManaged",
  "librarySystemPermissions",
  "mlisDegree",
  "assignedGate",
  "shiftTiming",
];

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validateString(val: string | undefined | null): boolean {
  return val != null && String(val).trim() !== "";
}

function validateEmail(val: string | undefined | null): boolean {
  if (!validateString(val)) return false;
  return EMAIL_PATTERN.test(String(val).trim());
}

function validateDate(val: string | undefined | null): boolean {
  if (!validateString(val)) return false;
  const trimmed = String(val).trim();
  if (!DATE_PATTERN.test(trimmed)) return false;
  const date = new Date(trimmed);
  return !isNaN(date.getTime());
}

function validateInt(val: string | undefined | null): boolean {
  if (!validateString(val)) return false;
  const num = Number(val);
  return !isNaN(num) && Number.isInteger(num);
}

// Case insensitive enum matcher
function validateEnum(val: string | undefined | null, allowedValues: string[]): boolean {
  if (!validateString(val)) return false;
  const lowerVal = String(val).trim().toLowerCase();
  return allowedValues.map((v) => v.toLowerCase()).includes(lowerVal);
}

/**
 * Validates the uploaded CSV/Excel headers and raw row data
 * based on the backend CsvValidationHelper.java rules.
 *
 * @returns An error message string if invalid, or null if fully valid.
 */
export function validateCsvData(
  userType: "students" | "staff",
  data: ParsedSheetData
): string | null {
  const expectedHeaders = userType === "students" ? STUDENT_HEADERS : STAFF_HEADERS;

  // 1. Validate Headers
  const uploadedHeaders = data.headers.map((h) => h.trim());
  const missingHeaders = expectedHeaders.filter((h) => !uploadedHeaders.includes(h));

  if (missingHeaders.length > 0) {
    return `Invalid CSV header. Expected: [${expectedHeaders.join(", ")}]. Missing: [${missingHeaders.join(", ")}]. You might have uploaded the wrong template!`;
  }

  // 2. Validate Data Types per row
  const headerIndices: Record<string, number> = {};
  uploadedHeaders.forEach((h, i) => {
    headerIndices[h] = i;
  });

  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i];
    // Row 1 is headers, so i=0 is Row 2 in Excel
    const rowNum = i + 2;

    const firstName = row[headerIndices["firstName"]];
    if (!validateString(firstName)) return `Row ${rowNum}: firstName cannot be empty.`;

    const lastName = row[headerIndices["lastName"]];
    if (!validateString(lastName)) return `Row ${rowNum}: lastName cannot be empty.`;

    const email = row[headerIndices["email"]];
    if (!validateEmail(email)) return `Row ${rowNum}: Invalid email format '${email || ""}'.`;

    const dob = row[headerIndices["dateOfBirth"]];
    if (!validateDate(dob)) {
      return `Row ${rowNum}: Invalid or missing dateOfBirth '${dob || ""}'. Expected format: yyyy-MM-dd (e.g. 1990-05-15).`;
    }

    const gender = row[headerIndices["gender"]];
    if (validateString(gender) && !validateEnum(gender, ["MALE", "FEMALE", "OTHER"])) {
      return `Row ${rowNum}: Invalid gender '${gender}'. Expected MALE, FEMALE, or OTHER.`;
    }

    if (userType === "students") {
      const rollNo = row[headerIndices["rollNo"]];
      if (validateString(rollNo) && !validateInt(rollNo)) {
        return `Row ${rowNum}: rollNo is not a valid number: '${rollNo}'.`;
      }

      const enrollmentNumber = row[headerIndices["enrollmentNumber"]];
      if (!validateString(enrollmentNumber)) {
        return `Row ${rowNum}: enrollmentNumber cannot be empty.`;
      }

      const enrollmentDate = row[headerIndices["enrollmentDate"]];
      if (!validateDate(enrollmentDate)) {
        return `Row ${rowNum}: Invalid or missing enrollmentDate '${enrollmentDate || ""}'. Expected format: yyyy-MM-dd (e.g. 2023-06-15).`;
      }

      const className = row[headerIndices["className"]];
      if (!validateString(className)) return `Row ${rowNum}: className cannot be empty.`;

      const sectionName = row[headerIndices["sectionName"]];
      if (!validateString(sectionName)) return `Row ${rowNum}: sectionName cannot be empty.`;
    } else {
      // staff validation
      const employeeId = row[headerIndices["employeeId"]];
      if (!validateString(employeeId)) return `Row ${rowNum}: employeeId cannot be empty.`;

      const joiningDate = row[headerIndices["joiningDate"]];
      if (!validateDate(joiningDate)) {
        return `Row ${rowNum}: Invalid or missing joiningDate '${joiningDate || ""}'. Expected format: yyyy-MM-dd (e.g. 2023-01-01).`;
      }

      const staffType = row[headerIndices["staffType"]];
      if (!validateString(staffType)) {
        return `Row ${rowNum}: staffType cannot be empty.`;
      }

      const staffCategory = row[headerIndices["staffCategory"]];
      if (!validateString(staffCategory)) {
        return `Row ${rowNum}: staffCategory cannot be empty.`;
      }
    }
  }

  return null;
}

// ── Guardian CSV validation ───────────────────────────────────────────────────

export const GUARDIAN_HEADERS: string[] = [
  "studentEnrollmentNumber",
  "firstName",
  "lastName",
  "middleName",
  "email",
  "phoneNumber",
  "relationshipType",
  "occupation",
  "employer",
  "primaryContact",
  "canPickup",
  "financialContact",
  "canViewGrades",
];

const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;
const BOOL_VALUES = ["true", "false", "1", "0", "yes", "no"];

function validateBool(val: string | undefined | null): boolean {
  if (!validateString(val)) return false;
  return BOOL_VALUES.includes(String(val).trim().toLowerCase());
}

function validatePhone(val: string | undefined | null): boolean {
  if (!validateString(val)) return false;
  
  const str = String(val).trim();
  // Safe unpacking of scientific notation (e.g., 9.19123E+11)
  let cleanPhone = str;
  if (/^[+-]?\d*(?:\.\d*)?[eE][+-]?\d+$/.test(str)) {
    const num = Number(str);
    if (!isNaN(num) && Number.isSafeInteger(num)) {
      cleanPhone = num.toLocaleString("fullwide", { useGrouping: false });
    }
  }

  // Allow optional leading +, remove spaces/dashes/parentheses
  cleanPhone = cleanPhone.replace(/[\s\-.()]+/g, "");
  return PHONE_PATTERN.test(cleanPhone);
}

/**
 * Validates the optional guardians CSV.
 * Returns an error string if invalid, or null if fully valid.
 *
 * Rules:
 *  - Headers must match GUARDIAN_HEADERS exactly (order-insensitive)
 *  - studentEnrollmentNumber, phoneNumber, email are mandatory per row
 *  - boolean columns accept true/false/1/0/yes/no (case-insensitive)
 */
export function validateGuardianCsvData(data: ParsedSheetData): string | null {
  // Empty file (header-only) is valid — backend will skip guardians
  if (data.rows.length === 0) return null;

  const uploadedHeaders = data.headers.map((h) => h.trim());
  const missingHeaders = GUARDIAN_HEADERS.filter((h) => !uploadedHeaders.includes(h));

  if (missingHeaders.length > 0) {
    return `Invalid guardian CSV header. Missing columns: [${missingHeaders.join(", ")}]. Download the guardian template and try again.`;
  }

  const idx: Record<string, number> = {};
  uploadedHeaders.forEach((h, i) => { idx[h] = i; });

  const boolCols = ["primaryContact", "canPickup", "financialContact", "canViewGrades"];

  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i];
    const rowNum = i + 2; // 1-indexed, row 1 is header

    const enrollmentNum = row[idx["studentEnrollmentNumber"]];
    if (!validateString(enrollmentNum)) {
      return `Guardian row ${rowNum}: studentEnrollmentNumber cannot be empty.`;
    }

    const phone = row[idx["phoneNumber"]];
    if (!validateString(phone)) {
      return `Guardian row ${rowNum}: phoneNumber is required (used as guardian username).`;
    }
    if (!validatePhone(phone)) {
      return `Guardian row ${rowNum}: phoneNumber '${phone}' is not a valid phone number.`;
    }

    const email = row[idx["email"]];
    if (!validateString(email)) {
      return `Guardian row ${rowNum}: email is required.`;
    }
    if (!validateEmail(email)) {
      return `Guardian row ${rowNum}: Invalid email format '${email}'.`;
    }

    const firstName = row[idx["firstName"]];
    if (!validateString(firstName)) {
      return `Guardian row ${rowNum}: firstName cannot be empty.`;
    }

    const lastName = row[idx["lastName"]];
    if (!validateString(lastName)) {
      return `Guardian row ${rowNum}: lastName cannot be empty.`;
    }

    // Validate boolean columns (if provided)
    for (const col of boolCols) {
      const val = row[idx[col]];
      if (validateString(val) && !validateBool(val)) {
        return `Guardian row ${rowNum}: '${col}' must be true/false/1/0 (got '${val}').`;
      }
    }
  }

  return null;
}
