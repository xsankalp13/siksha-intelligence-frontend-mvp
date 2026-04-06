export interface ClassTeacherMappingRow {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  classTeacherUuid?: string;
  classTeacherName?: string;
}

export interface ClassTeacherOverviewStats {
  totalSections: number;
  assignedSections: number;
  unassignedSections: number;
  assignmentRate: number;
}
