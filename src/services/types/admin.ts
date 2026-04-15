// ── Admin User Management DTOs ───────────────────────────────────────

import type { Gender } from "./profile";
import type { StaffType, SchoolLevel } from "./profile";

// Base DTO shared across all user creation
export interface CreateUserRequestDTO {
  username: string;
  email: string;
  initialPassword?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bio?: string;
}

// Student
export type Ethnicity =
  | "ASIAN"
  | "BLACK"
  | "HISPANIC_OR_LATINO"
  | "WHITE"
  | "MIDDLE_EASTERN_OR_NORTH_AFRICAN"
  | "NATIVE_AMERICAN_OR_ALASKAN_NATIVE"
  | "NATIVE_HAWAIIAN_OR_OTHER_PACIFIC_ISLANDER"
  | "TWO_OR_MORE_RACES"
  | "OTHER"
  | "PREFER_NOT_TO_SAY";

export interface CreateStudentRequestDTO extends CreateUserRequestDTO {
  enrollmentNumber?: string;
  rollNo: number;
  sectionId: string; // UUID — the sections API only returns UUIDs
  enrollmentDate?: string;
  ethnicity?: Ethnicity;
  nationality?: string;
  languagePrimary?: string;
  languageSecondary?: string;
  homeEnvironmentDetails?: string;
  primaryCarePhysician?: string;
  physicianPhone?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  initialAllergies?: string[];
}

export type StaffCategory = "TEACHING" | "NON_TEACHING_SUPPORT" | "NON_TEACHING_ADMIN";

// Teacher
export interface CreateTeacherRequestDTO extends CreateUserRequestDTO {
  jobTitle: string;
  hireDate: string;
  category: StaffCategory;
  department: Department;
  officeLocation?: string;
  stateLicenseNumber?: string;
  educationLevel?: string;
  yearsOfExperience?: number;
  specializations?: string[];
  certifications?: string[];
  classesToTeach?: string[];
  staffType?: StaffType;
  designationId?: number;
  category?: string;
}

// Principal
export interface CreatePrincipalRequestDTO extends CreateUserRequestDTO {
  jobTitle: string;
  hireDate: string;
  category: StaffCategory;
  department: Department;
  officeLocation?: string;
  administrativeCertifications?: string[];
  schoolLevelManaged?: SchoolLevel;
  staffType?: StaffType;
  designationId?: number;
  category?: string;
}

// Librarian
export interface CreateLibrarianRequestDTO extends CreateUserRequestDTO {
  jobTitle: string;
  hireDate: string;
  category: StaffCategory;
  department: Department;
  officeLocation?: string;
  librarySystemPermissions?: string[];
  hasMlisDegree?: boolean;
  staffType?: StaffType;
  designationId?: number;
  category?: string;
}

// Security Guard
export interface CreateSecurityGuardRequestDTO extends CreateUserRequestDTO {
  jobTitle: string;
  hireDate: string;
  officeLocation?: string;
  designationId?: number;
  category?: string;
  staffType?: StaffType;
}

// ── Edit DTOs (dedicated update endpoints) ───────────────────────────────

export type Department =
  | "FINANCE"
  | "ADMISSION"
  | "IT"
  | "FACILITIES"
  | "HUMAN_RESOURCE"
  | "ADMINISTRATION"
  | "ACADEMICS"
  | "LIBRARY";

/** PUT /auth/admin/users/student/{studentId} (path param = student UUID) */
export interface UpdateStudentRequestDTO {
  email?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bio?: string;
  enrollmentNumber?: string;
  rollNo?: number;
  sectionId?: string; // UUID
  enrollmentDate?: string;
}

/** PUT /auth/admin/users/staff/{staffId} (path param = staff UUID) */
export interface UpdateStaffRequestDTO {
  email?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bio?: string;
  employeeId?: string;
  jobTitle?: string;
  hireDate?: string;
  officeLocation?: string;
  department?: Department;
  staffType?: StaffType;
  designationId?: number;
  category?: string;
  teachableSubjectIds?: string[];
}

// ── Guardian DTOs ───────────────────────────────────────────────────

export interface CreateGuardianRequestDTO {
  username: string;
  email: string;
  initialPassword?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bio?: string;
  phoneNumber?: string;
  occupation?: string;
  employer?: string;
  relationshipType: string;
  primaryContact?: boolean;
  canPickup?: boolean;
  financialContact?: boolean;
  canViewGrades?: boolean;
}

export interface UpdateGuardianRequestDTO {
  email?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bio?: string;
  phoneNumber?: string;
  occupation?: string;
  employer?: string;
  relationshipType?: string;
  primaryContact?: boolean;
  canPickup?: boolean;
  financialContact?: boolean;
  canViewGrades?: boolean;
}

export interface LinkGuardianRequestDTO {
  guardianId: string;
  relationshipType: string;
  primaryContact?: boolean;
  canPickup?: boolean;
  financialContact?: boolean;
  canViewGrades?: boolean;
}

// ── Teacher/Subject Mapping DTOs ─────────────────────────────────────

export interface BulkAssignSubjectsRequestDTO {
  subjectId: string;
  teacherIds: number[];
}

