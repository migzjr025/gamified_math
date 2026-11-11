export interface GradeRow {
  id: number;
  studentId: number;
  assessmentId: number;
  score: number;
  pointsEarned: number;
  feedback?: string | null;
  studentName?: string;
  studentNumber?: string;
  assessmentTitle?: string;
  assessmentType?: string;
  unitTitle?: string;
  quarter?: string | number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface StudentMeta {
  id: number;
  studentId: string;
  fullName: string;
  gradeLevel?: string;
  section?: string;
  gender?: string;
  avatarColor?: string;
}

export interface AssessmentMeta {
  id: number;
  title: string;
  type?: string;
  unitId?: number;
  quarter?: string | number | null;
}

export interface StudentGroup {
  studentId: number;
  studentName: string;
  studentNumber: string;
  gradeLevel: string;
  section: string;
  avatarColor: string;
  grades: GradeRow[];
  averageScore: number;
  completionCount: number;
  completionPercent: number;
  lastRecordedDate?: string | null;
}

export interface ToastMessage {
  id: number;
  text: string;
  type: "success" | "error" | "info";
}

export interface ScoreRating {
  label: string;
  badgeClass: string;
  ratingText: string;
  toneColor: string;
}
