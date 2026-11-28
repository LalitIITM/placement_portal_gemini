// Shared domain types for IITM BS Placement & Training Platform

export type Role = "STUDENT" | "RECRUITER" | "EXAMINER" | "TRAINING_COORDINATOR" | "ADMIN";

export type AuthMode = "SIGN_IN" | "SIGN_UP";

export type RegistrationApprovalStatus = "PENDING" | "APPROVED" | "REJECTED"
  | "WITHDRAWN";

export type StudentOnboardingStep = "AUTH" | "STUDENT_FORM" | "PAYMENT";

export interface StudentOnboardingDetails {
  personalEmail: string;
  mobileNumber: string;
  cgpa: string;
  activeBacklogs: number;
  programLevel: ProgramLevelOption;
  degreeType: DegreeTypeOption;
  applyingTrack: StudentTrackOption;
  targetDomain: QuizDomainOption;
  hasDiplomaDataScience: boolean;
  hasDiplomaProgramming: boolean;
  gender: string;
  stateName: string;
  category: CategoryOption;
  isWorkingProf: boolean;
  yearsExp?: string;
  workDomain?: WorkDomainOption;
  presentCompany?: string;
  workLocation?: string;
  currentCtc?: string;
}

export interface StudentOnboardingDraft {
  fullName: string;
  email: string;
  password: string;
  personalEmail: string;
  mobileNumber: string;
  cgpa: string;
  activeBacklogs: number;
  programLevel: ProgramLevelOption;
  hasDiplomaDataScience: boolean;
  hasDiplomaProgramming: boolean;
  applyingTrack: StudentTrackOption;
  targetDomain: QuizDomainOption;
  gender: string;
  stateName: string;
  category: CategoryOption;
  degreeType: DegreeTypeOption;
  isWorkingProf: boolean;
  yearsExp: string;
  workDomain: WorkDomainOption;
  presentCompany: string;
  workLocation: string;
  currentCtc: string;
}

export interface ExaminerOnboardingDetails {
  mobileNumber: string;
  category: "IITM_FACULTY" | "IITM_RESEARCH_TA" | "INDUSTRY_MENTOR" | "IITM_ALUMNI";
  organization: string;
  designation: string;
  yearsExperience: string;
  linkedinUrl: string;
  portfolioOrScholarUrl?: string;
  evaluationDomain: "DATA_SCIENCE" | "SOFTWARE_DEVELOPMENT" | "BOTH";
  specializations: string;
  weeklyVivaCapacity: number;
  preferredTimeWindow: string;
  cvDriveUrl?: string;
  coiAccepted: boolean;
}

export interface RecruiterOnboardingDetails {
  mobileNumber: string;
  companyName: string;
  companyType: "PRODUCT" | "MNC_ENTERPRISE" | "STARTUP" | "CONSULTING_ANALYTICS" | "RESEARCH_PSU";
  companySize: string;
  foundedYear?: string;
  companyWebsite: string;
  companyLinkedinUrl?: string;
  cinOrGstNumber?: string;
  headquartersLocation: string;
  hiringLocations: string;
  workMode: "HYBRID" | "ONSITE" | "REMOTE" | "FLEXIBLE";
  companyOverview: string;
  designation: string;
  linkedinUrl: string;
  hiringMode: "INTERNSHIP" | "FULL_TIME" | "BOTH";
  targetRoles: string;
  expectedHeadcount: string;
  compensationRange: string;
  policyAccepted: boolean;
}

export interface RegistrationRequestRecord {
  id: string;
  fullName: string;
  email: string;
  role: Exclude<Role, "ADMIN">;
  orgOrDept: string;
  password: string;
  status: RegistrationApprovalStatus;
  submittedAt: string;
  reviewedBy?: string;
  paymentStatus?: "PAID" | "NOT_REQUIRED";
  studentProfileDetails?: StudentOnboardingDetails;
  examinerProfileDetails?: ExaminerOnboardingDetails;
  recruiterProfileDetails?: RecruiterOnboardingDetails;
}

export type ActiveTab = "IDENTITY" | "TRAINING" | "RECRUITMENT" | "PLACEMENT" | "GOVERNANCE" | "RECRUITER_COMPANY" | "RECRUITER_DRIVES";

export type CategoryOption = "GENERAL" | "GENERAL_EWS" | "OBC" | "OBC_NCL" | "SC_ST";

export type DegreeTypeOption = "STANDALONE" | "DUAL_DEGREE";

export type WorkDomainOption = "DATA_SCIENCE" | "SOFTWARE_DEVELOPMENT" | "OTHERS";

export type QuizDomainOption = "DATA_SCIENCE" | "SOFTWARE_DEVELOPMENT";

export type QuizTrackOption = "INTERNSHIP" | "SOFTWARE_DEVELOPMENT";

export type StudentTrackOption = "INTERNSHIP" | "FULL_TIME" | "BOTH";

export type JobRoleTypeOption = "INTERNSHIP" | "FULL_TIME";

export type ProgramLevelOption = "FOUNDATION" | "DIPLOMA" | "BSC" | "BS";

export interface TrainingStageScore {
  id: string;
  level: 1 | 2 | 3;
  stageNum: number;
  title: string;
  description: string;
  evaluationType: "MARKS" | "AI_MOCK" | "ONE_ON_ONE";
  maxMarks: number;
  minRequired: number;
  obtainedMarks: number;
  attemptsUsed: number;
  maxAttempts: number;
  statusText: string; // e.g. "Hire" / "Pending" or "Yes" / "No"
}

export interface ActivityCatalogItem {
  id: string;
  table: "TABLE_1" | "TABLE_2" | "TABLE_3";
  domain: "COMMON" | "SOFTWARE_DEVELOPMENT" | "DATA_SCIENCE";
  topic: string;
  title: string;
  description: string;
  points: number;
  platformHint: string;
}

export interface ActivitySubmission {
  id: string;
  studentName: string;
  studentEmail: string;
  activityId: string;
  evidenceFileName: string;
  evidenceFileType: string;
  evidenceFileSize: string;
  proofUrl?: string;
  completedDate: string;
  reviewStatus: "PENDING_COORDINATOR" | "APPROVED" | "REJECTED";
  reviewerNote?: string;
}

export type AppStatusOption =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "OFFERED"
  | "OFFER_ACCEPTED"
  | "REJECTED" | "WITHDRAWN";

export interface ResumeItem {
  id: string;
  title: string;
  targetRole: string;
  driveUrl: string;
  fileSize: string;
  updatedAt: string;
  isPrimary: boolean;
}

export interface MarksheetRecord {
  fileName: string;
  driveUrl: string;
  fileSize: string;
  cgpa: string;
  uploadedAt: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: Role;
  action: string;
  resource: string;
  status: "SUCCESS" | "BLOCKED";
}

export interface BankQuestionItem {
  id: string;
  domain: QuizDomainOption;
  track: QuizTrackOption;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface CourseModuleItem {
  id: string;
  title: string;
  durationMinutes: number;
  summary: string;
  completed: boolean;
}

export interface SkillBadgeItem {
  code: string;
  courseCode: string;
  skillName: string;
  scorePct: number;
  issuedAt: string;
}

export interface TrainingTrack {
  id: string;
  code: string;
  title: string;
  domain: QuizDomainOption;
  track: QuizTrackOption;
  skillTag: string;
  passThresholdPct: number;
  attemptsUsed: number;
  maxAttempts: number;
  bestScorePct: number | null;
  modules: CourseModuleItem[];
}

export interface OneOnOneSlotRecord {
  id: string;
  studentEmail: string;
  studentName: string;
  date: string;
  slotTime: string;
  instructor: string;
  status: "SCHEDULED" | "COMPLETED";
  instructorFeedback?: string;
  isPlacementReady?: boolean;
  programmingRating?: number;
  dataScienceRating?: number;
  communicationRating?: number;
  remedialTasks?: string[];
  completedAt?: string;
}

export interface ExaminerEvaluationRecord {
  id: string;
  studentRoll: string;
  examinerEmail: string;
  skillsets: string[];
  programmingRating: number;
  dataScienceRating: number;
  communicationRating: number;
  isPlacementReady: boolean;
  performingExceptionallyGood: boolean;
  remedialTasks: string[];
  notes: string;
  evaluatedAt: string;
}

export interface JobDriveItem {
  id: string;
  jobCode: string;
  companyName: string;
  title: string;
  roleType: JobRoleTypeOption;
  domain: QuizDomainOption;
  location: string;
  workMode?: "HYBRID" | "ONSITE" | "REMOTE";
  compensation: string;
  openingsCount?: number;
  applicationDeadline?: string;
  selectionRounds?: string;
  description: string;
  jdText?: string;
  jdPdfName?: string;
  jdPdfDataUrl?: string;
  postedByEmail?: string;
  postedAt?: string;
  minCgpa: number;
  maxBacklogs: number;
  allowedLevels: ProgramLevelOption[];
  requireExaminerReady: boolean;
  requiredSkillTags: string[];
}

export interface JobApplicationRecord {
  id: string;
  jobId: string;
  jobCode: string;
  companyName: string;
  jobTitle: string;
  roleType: JobRoleTypeOption;
  studentRoll: string;
  studentName: string;
  studentCgpa: string;
  resumeTitle: string;
  status: AppStatusOption;
  appliedAt: string;
}

export type InterviewRoundOption = "TECHNICAL_1" | "TECHNICAL_2" | "MANAGERIAL" | "HR_FINAL";

export type InterviewStatusOption = "SCHEDULED" | "CONFIRMED" | "PASSED" | "FAILED";

export type OfferStatusOption = "ISSUED" | "ACCEPTED" | "DECLINED";

export interface InterviewScheduleRecord {
  id: string;
  applicationId: string;
  studentRoll: string;
  studentName: string;
  companyName: string;
  jobTitle: string;
  roundNumber: number;
  roundType: InterviewRoundOption;
  mode: "ONLINE_MEET" | "IN_PERSON";
  scheduledAt: string;
  meetingLink: string;
  panelistName: string;
  status: InterviewStatusOption;
  notes?: string;
}

export interface OfferLetterRecord {
  id: string;
  offerCode: string;
  applicationId: string;
  studentRoll: string;
  studentName: string;
  companyName: string;
  roleTitle: string;
  roleType: JobRoleTypeOption;
  ctcLpa: number;
  joiningDate: string;
  expiresAt: string;
  status: OfferStatusOption;
  remarks?: string;
}

export interface HelpdeskTicketRecord {
  id: string;
  ticketNumber: string;
  raisedByEmail: string;
  raisedByName: string;
  raisedByRole: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  subject: string;
  description: string;
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "ESCALATED" | "RESOLVED" | "CLOSED";
  assignedTo?: string | null;
  escalationCount: number;
  comments: Array<{ author: string; role: string; text: string; createdAt: string }>;
  createdAt?: string | null;
}

export interface StudentProfileSyncDTO {
  studentRoll: string;
  fullName: string;
  iitmEmail: string;
  personalEmail: string;
  mobileNumber: string;
  cgpa: string;
  activeBacklogs: number;
  programLevel: ProgramLevelOption;
  degreeType: DegreeTypeOption;
  applyingTrack: StudentTrackOption;
  targetDomain: QuizDomainOption;
  headline: string;
  githubUrl: string;
  linkedinUrl: string;
  kaggleUrl: string;
  portfolioUrl: string;
  skills: string[];
  projects: Array<Record<string, unknown>>;
  experiences: Array<Record<string, unknown>>;
  isSuspended: boolean;
  noShowCount: number;
}
