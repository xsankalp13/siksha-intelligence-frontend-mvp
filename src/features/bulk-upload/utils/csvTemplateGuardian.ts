/**
 * Client-side CSV template generators for bulk import flows.
 *
 * Templates are generated inline (as a data blob) so the user can download
 * without hitting the backend. Each template includes a header row and sample rows.
 *
 * Column order here MUST match the corresponding *_HEADERS arrays in csvValidation.ts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapeCsv(val: string): string {
  // Always quote every field so Excel / Sheets treats the value as text,
  // preventing auto-conversion of phone numbers like +919876543210 to
  // scientific notation (9.19877E+11) when the user opens the file.
  return `"${val.replace(/"/g, '""')}"`;
}

function buildCsvBlob(rows: string[][]): Blob {
  const csvText = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  return new Blob([csvText], { type: "text/csv;charset=utf-8;" });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Students Template
// ─────────────────────────────────────────────────────────────────────────────

const STUDENTS_TEMPLATE_ROWS: string[][] = [
  [
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
  ],
  [
    "Aarav",
    "Sharma",
    "",
    "aarav.sharma@school.edu",
    "2010-05-15",
    "1",
    "MALE",
    "EN2024001",
    "2024-04-01",
    "10",
    "A",
  ],
  [
    "Priya",
    "Verma",
    "K",
    "priya.verma@school.edu",
    "2011-08-22",
    "2",
    "FEMALE",
    "EN2024002",
    "2024-04-01",
    "10",
    "A",
  ],
];

/**
 * Generates and triggers download of the students CSV template.
 */
export function downloadStudentsTemplate(): void {
  triggerDownload(buildCsvBlob(STUDENTS_TEMPLATE_ROWS), "students_bulk_import_template.csv");
}

// ─────────────────────────────────────────────────────────────────────────────
// Guardians Template
// ─────────────────────────────────────────────────────────────────────────────

const GUARDIANS_TEMPLATE_ROWS: string[][] = [
  [
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
  ],
  [
    "EN2024001",
    "Ramesh",
    "Sharma",
    "",
    "ramesh.sharma@example.com",
    "+919876543210",
    "FATHER",
    "Engineer",
    "Infosys",
    "true",
    "true",
    "true",
    "true",
  ],
  [
    "EN2024002",
    "Sunita",
    "Verma",
    "",
    "sunita.verma@example.com",
    "+919123456789",
    "MOTHER",
    "Teacher",
    "Govt School",
    "true",
    "false",
    "false",
    "true",
  ],
  // Same guardian linked to a second student (guardian reuse example)
  [
    "EN2024002",
    "Ramesh",
    "Sharma",
    "",
    "ramesh.sharma@example.com",
    "+919876543210",
    "UNCLE",
    "Engineer",
    "Infosys",
    "false",
    "true",
    "false",
    "true",
  ],
];

/**
 * Generates and triggers download of the guardians CSV template.
 */
export function downloadGuardiansTemplate(): void {
  triggerDownload(buildCsvBlob(GUARDIANS_TEMPLATE_ROWS), "guardians_bulk_import_template.csv");
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff Template
// Columns must match STAFF_HEADERS in csvValidation.ts:
// ─────────────────────────────────────────────────────────────────────────────

const STAFF_TEMPLATE_ROWS: string[][] = [
  [
    "firstName",
    "lastName",
    "middleName",
    "email",
    "dateOfBirth",
    "gender",
    "employeeId",
    "joiningDate",
    "jobTitle",
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
  ],
  [
    "Priya",
    "Verma",
    "",
    "priya.verma@school.edu",
    "1985-08-20",
    "FEMALE",
    "EMP001",
    "2020-06-01",
    "Mathematics Teacher",
    "ACADEMICS",
    "TEACHER",
    "TEACHING",
    "B.Ed",
    "Mathematics",
    "5",
    "BACHELORS",
    "LIC12345",
    "",
    "",
    "",
    "",
    "",
    "",
  ],
  [
    "Rajesh",
    "Kumar",
    "S",
    "rajesh.kumar@school.edu",
    "1978-03-12",
    "MALE",
    "EMP002",
    "2018-07-15",
    "Vice Principal",
    "Administration",
    "PRINCIPAL",
    "NON_TEACHING_ADMIN",
    "",
    "",
    "",
    "",
    "",
    "School Admin Cert",
    "HIGH",
    "",
    "",
    "",
    "",
  ],
  [
    "Anita",
    "Singh",
    "",
    "anita.singh@school.edu",
    "1990-11-05",
    "FEMALE",
    "EMP003",
    "2022-01-10",
    "Librarian",
    "Library",
    "LIBRARIAN",
    "NON_TEACHING_SUPPORT",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "ALL_ACCESS",
    "true",
    "",
    "",
  ],
];

/**
 * Generates and triggers download of the staff CSV template.
 */
export function downloadStaffTemplate(): void {
  triggerDownload(buildCsvBlob(STAFF_TEMPLATE_ROWS), "staff_bulk_import_template.csv");
}
