import { api } from '@/lib/axios';
import type { ChildSummary, ParentDashboardData } from "./types/parent";

// ── Parent / Guardian Portal — Service ──────────────────────────

export const parentService = {
  /** GET /parent/children */
  async getMyChildren() {
    const response = await api.get('/guardian/dashboard/overview');
    const overviews = response.data;
    const children: ChildSummary[] = overviews.map((o: any) => {
      const parts = o.profile.courseOrClass ? o.profile.courseOrClass.split(' - Section ') : [];
      const className = parts[0] || '';
      const section = parts[1] || '';
      
      const nameParts = o.profile.fullName ? o.profile.fullName.split(' ') : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        childId: String(o.profile.studentId),
        firstName,
        lastName,
        fullName: o.profile.fullName,
        className,
        section,
        rollNumber: o.profile.enrollmentNumber || '',
        profileUrl: o.profile.profileUrl
      };
    });
    
    return { data: children };
  },

  /** GET /parent/dashboard?childId= */
  async getDashboardSummary(childId: string) {
    const [overviewRes, intelligenceRes] = await Promise.all([
      api.get('/guardian/dashboard/overview'),
      api.get('/guardian/dashboard/intelligence')
    ]);

    const overviews = overviewRes.data;
    const intelligences = intelligenceRes.data;

    const overview = overviews.find((o: any) => String(o.profile.studentId) === childId);
    const intelligence = intelligences.find((i: any) => String(i.profile.studentId) === childId);

    if (!overview || !intelligence) {
      throw new Error("Child dashboard not found");
    }

    const parts = overview.profile.courseOrClass ? overview.profile.courseOrClass.split(' - Section ') : [];
    const className = parts[0] || '';
    const section = parts[1] || '';
    
    const nameParts = overview.profile.fullName ? overview.profile.fullName.split(' ') : [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const child: ChildSummary = {
      childId: String(overview.profile.studentId),
      firstName,
      lastName,
      fullName: overview.profile.fullName,
      className,
      section,
      rollNumber: overview.profile.enrollmentNumber || '',
      profileUrl: overview.profile.profileUrl
    };

    const dashboardData: ParentDashboardData = {
      child,
      attendance: {
        totalDays: intelligence.academicPulse.predictiveAttendance.totalClasses,
        presentDays: intelligence.academicPulse.predictiveAttendance.attendedClasses,
        absentDays: intelligence.academicPulse.predictiveAttendance.totalClasses - intelligence.academicPulse.predictiveAttendance.attendedClasses,
        lateDays: 0,
        attendancePercentage: intelligence.academicPulse.predictiveAttendance.percentage,
        todayStatus: "NOT_MARKED", // Needs dedicated today attendance logic if applicable
        monthlyBreakdown: []
      },
      performance: {
        currentGpa: overview.kpis.currentCgpa,
        maxGpa: 10,
        classAverage: 0, // Fallback
        rank: 0,
        totalStudents: 0,
        trend: overview.performanceTrend.map((t: any) => ({
          exam: t.term,
          gpa: t.score,
          classAvg: 0
        })),
        subjects: []
      },
      feesDue: {
        totalDue: intelligence.financeHealth.totalDue || 0,
        currency: "INR",
        nextDueDate: intelligence.financeHealth.earliestDueDate || new Date().toISOString(),
        feeBreakdown: [],
        recentPayments: []
      },
      homeworkPending: {
        totalPending: overview.kpis.pendingAssignmentsCount,
        totalSubmitted: 0,
        totalOverdue: 0,
        assignments: overview.pendingAssignments.map((a: any) => ({
          assignmentId: String(a.id),
          subject: a.subject,
          title: a.title,
          description: "",
          dueDate: a.dueDate,
          status: "PENDING",
          teacherName: "",
          seenByParent: false
        }))
      },
      recentNotifications: overview.recentAnnouncements.map((a: any) => ({
        notificationId: String(a.id),
        title: a.title,
        message: "",
        category: a.type,
        timestamp: a.date,
        isRead: false
      }))
    };

    return { data: dashboardData };
  },

  /** GET /parent/academics?childId= */
  async getAcademics(childId: string) {
    const res = await this.getDashboardSummary(childId);
    return { data: res.data.performance };
  },

  /** GET /parent/attendance?childId= */
  async getAttendance(childId: string) {
    const res = await this.getDashboardSummary(childId);
    return { data: res.data.attendance };
  },

  /** GET /parent/homework?childId= */
  async getHomework(childId: string) {
    const res = await this.getDashboardSummary(childId);
    return { data: res.data.homeworkPending };
  },

  /** GET /parent/fees?childId= */
  async getFees(childId: string) {
    const res = await this.getDashboardSummary(childId);
    return { data: res.data.feesDue };
  }
};
