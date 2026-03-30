import * as XLSX from "xlsx";
import type { ParsedSheetData } from "../types";

/** MIME types / extensions we accept */
const ACCEPTED_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv", // .csv
]);

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

/**
 * Validate that the file is a supported spreadsheet format.
 */
function validateFile(file: File): void {
  const hasValidType = ACCEPTED_TYPES.has(file.type);
  const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidType && !hasValidExtension) {
    throw new Error(
      `Unsupported file format "${file.name}". Please upload a .xlsx, .xls, or .csv file.`
    );
  }
}

/**
 * Format a cell value for display in the preview table.
 * Handles Date objects (from cellDates:true) and Excel serial numbers.
 *
 * IMPORTANT: xlsx with cellDates:true parses dates as midnight UTC.
 * Using local-time getters (getFullYear etc.) would shift the date by the
 * timezone offset — e.g. "2010-05-15" becomes "2010-05-14" in IST (+5:30).
 * We always use UTC getters so the date matches what was written in the cell.
 */
function formatCell(cell: unknown): string {
  if (cell == null || cell === "") return "";

  // Date object produced by cellDates: true
  if (cell instanceof Date) {
    const y = cell.getUTCFullYear();
    const m = String(cell.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cell.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const str = String(cell).trim();
  
  // Safe unpacking of scientific notation (e.g., 9.19123E+11) commonly produced by Excel
  if (/^[+-]?\d*(?:\.\d*)?[eE][+-]?\d+$/.test(str)) {
    const num = Number(str);
    if (!isNaN(num) && Number.isSafeInteger(num)) {
      return num.toLocaleString("fullwide", { useGrouping: false });
    }
  }

  return str;
}

/**
 * Read and parse a spreadsheet file on the client side.
 *
 * @param file - A File object from a drag-and-drop or file input.
 * @returns Parsed headers and rows from the first sheet.
 * @throws If the file format is unsupported, the file is empty, or parsing fails.
 */
export async function parseExcelFile(file: File): Promise<ParsedSheetData> {
  validateFile(file);

  try {
    const buffer = await file.arrayBuffer();
    // cellDates: true makes xlsx return JS Date objects for date-formatted cells
    // instead of raw serial numbers (e.g. 45000 → new Date(...))
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("The uploaded file contains no sheets.");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      throw new Error("Could not read the first sheet of the file.");
    }

    // Convert to array-of-arrays (each sub-array is a row)
    const raw: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      // raw: false would format via Excel format string, but cellDates gives us
      // proper Date objects which we format ourselves for full control.
    });

    // Filter out completely empty rows
    const nonEmptyRows = raw.filter((row) =>
      row.some((cell) => cell !== "" && cell != null)
    );

    if (nonEmptyRows.length === 0) {
      throw new Error(
        "The uploaded file appears to be empty — no data rows found."
      );
    }

    const headers = nonEmptyRows[0].map((cell) => String(cell));
    const rows = nonEmptyRows.slice(1).map((row) =>
      row.map((cell) => formatCell(cell))
    );

    if (rows.length === 0) {
      throw new Error(
        "The file contains headers but no data rows. Please add data below the header row."
      );
    }

    return { headers, rows };
  } catch (error) {
    // Re-throw our own errors; wrap unknown parsing errors
    if (error instanceof Error && error.message.startsWith("Unsupported")) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith("The uploaded")) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith("The file contains")) {
      throw error;
    }
    throw new Error(
      `Failed to parse "${file.name}". The file may be corrupted or in an unsupported format.`
    );
  }
}
