// ── Profile DTOs ─────────────────────────────────────────────────────

export type Gender = "MALE" | "FEMALE" | "NON_BINARY" | "OTHER" | "PREFER_NOT_TO_SAY";

export interface UserProfileUpdateDTO {
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  dateOfBirth?: string;
  contactPhone?: string;
  bio?: string;
  gender?: string;
}

export interface UserProfileDTO {
  profileId: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  bio?: string;
  gender?: Gender;
  email: string;
  profileUrl?: string;
}

export interface UserProfileResponseDTO {
  id: number;
  uuid: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  bio?: string;
  username: string;
  email: string;
  profileUrl?: string;
  gender?: Gender;
  primaryLanguage?: string;
  bloodGroup?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddressDTO {
  id?: number;
  addressType?: "HOME" | "MAILING" | "WORK" | "OTHER";
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// ── Student-specific ─────────────────────────────────────────────────

export interface StudentMedicalAllergyDTO {
  allergy: string;
  severity?: string;
  notes?: string;
}

export interface StudentMedicalMedicationDTO {
  medicationName: string;
  dosage?: string;
  frequency?: string;
}

export interface StudentMedicalRecordDTO {
  id: number;
  physicianName?: string;
  physicianPhone?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: StudentMedicalAllergyDTO[];
  medications?: StudentMedicalMedicationDTO[];
}

export interface StudentProfileDTO {
  studentId: number;
  enrollmentNo?: string;
  enrollmentStatus?: string;
  admissionDate?: string;
  expectedGraduationYear?: number;
  counselorName?: string;
  medicalRecord?: StudentMedicalRecordDTO;
  profileUrl?: string;
}

// ── KPI Metrics ───────────────────────────────────────────────────────

export interface StudentKpiMetricsDTO {
  studentId: number;
  academicStanding: "EXCELLENT" | "GOOD" | "AVERAGE" | "AT_RISK";
  gpa: number;
  currentGrade: string;
  currentSection: string;
  attendanceRatePercentage: number;
  openDisciplinaryIncidents: number;
}

export interface StaffKpiMetricsDTO {
  staffId: number;
  performanceRating: number;
  totalClassesAssigned: number;
  weeklyHoursAssigned: number;
  attendanceRatePercentage: number;
}

// ── Staff-specific ───────────────────────────────────────────────────

export type StaffType =
  | "TEACHER"
  | "LIBRARIAN"
  | "PRINCIPAL"
  | "SECURITY_GUARD"
  | "ADMINISTRATIVE_STAFF"
  | "SCHOOL_ADMIN"
  | "SUPER_ADMIN"
  | "OTHER";

export interface TeacherSubjectDTO {
  uuid: string;
  name: string;
  subjectCode: string;
  color?: string;
}

export interface TeacherDetailsDTO {
  certifications?: string;
  specializations?: string;
  yearsOfExperience?: number;
  educationLevel?: string;
  stateLicenseNumber?: string;
  teachableSubjects?: TeacherSubjectDTO[];
}

export type SchoolLevel = "PRIMARY" | "MIDDLE" | "HIGH" | "ALL";

export interface PrincipalDetailsDTO {
  administrativeCertifications?: string;
  schoolLevelManaged?: SchoolLevel;
  budgetApprovalLimit?: number;
}

export interface StaffProfileDTO {
  staffId: number;
  staffSystemId?: string;
  jobTitle?: string;
  department?: string;
  staffType?: StaffType;
  hireDate?: string;
  terminationDate?: string;
  officeLocation?: string;
  managerId?: number;
  managerName?: string;
  teacherDetails?: TeacherDetailsDTO;
  principalDetails?: PrincipalDetailsDTO;
  active: boolean;
  profileUrl?: string;
}

// ── Guardian-specific ────────────────────────────────────────────────

export interface LinkedStudentDTO {
  studentId: number;
  studentName: string;
  enrollmentNo?: string;
  relationshipType?: string;
}

export interface GuardianProfileDTO {
  guardianId: number; // For the database ID
  uuid?: string; // The system UUID used for linking
  // Identity fields that should come back from GET /guardians
  name?: string;
  relation?: string;
  username?: string;
  email?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bio?: string;
  phoneNumber?: string;
  // Guardian specific
  occupation?: string;
  employer?: string;
  // Relationship specific (from LinkGuardianRequestDTO)
  relationshipType?: string;
  primaryContact?: boolean;
  canPickup?: boolean;
  financialContact?: boolean;
  canViewGrades?: boolean;
  linkedStudents?: LinkedStudentDTO[];
}

export interface StudentGuardianDTO {
  guardianUuid: string;
  name: string;
  relation: string;
  phoneNumber?: string;
  occupation?: string;
  employer?: string;
  primaryContact: boolean;
  canPickup: boolean;
  financialContact: boolean;
  canViewGrades: boolean;
  active: boolean;
  profileUrl?: string;
}

// ── Comprehensive Profile ────────────────────────────────────────────

export interface ComprehensiveUserProfileResponseDTO {
  basicProfile: UserProfileResponseDTO;
  addresses?: AddressDTO[];
  studentDetails?: StudentProfileDTO;
  staffDetails?: StaffProfileDTO;
  guardianDetails?: GuardianProfileDTO;
}
