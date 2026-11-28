import * as XLSX from "xlsx";
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  FileText,
  Trash2,
  Plus,
  Lock,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Award,
  Upload,
  BookOpen,
  Clock,
  GraduationCap,
  Briefcase,
  Building2,
  Send,
  XCircle,
  Calendar,
  BadgeCheck,
  BarChart3,
  Video,
} from "lucide-react";
import type { HelpdeskTicketRecord } from "./types/portal";

type Role = "STUDENT" | "RECRUITER" | "EXAMINER" | "TRAINING_COORDINATOR" | "ADMIN";
type AuthMode = "SIGN_IN" | "SIGN_UP";
type RegistrationApprovalStatus = "PENDING" | "APPROVED" | "REJECTED"
  | "WITHDRAWN";
type StudentOnboardingStep = "AUTH" | "STUDENT_FORM" | "PAYMENT";

interface StudentOnboardingDetails {
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

interface StudentOnboardingDraft {
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

interface ExaminerOnboardingDetails {
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

interface RecruiterOnboardingDetails {
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

interface RegistrationRequestRecord {
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
type ActiveTab = "IDENTITY" | "TRAINING" | "RECRUITMENT" | "PLACEMENT" | "GOVERNANCE" | "RECRUITER_COMPANY" | "RECRUITER_DRIVES" | "HELPDESK";
type CategoryOption = "GENERAL" | "GENERAL_EWS" | "OBC" | "OBC_NCL" | "SC_ST";
type DegreeTypeOption = "STANDALONE" | "DUAL_DEGREE";
type WorkDomainOption = "DATA_SCIENCE" | "SOFTWARE_DEVELOPMENT" | "OTHERS";
type QuizDomainOption = "DATA_SCIENCE" | "SOFTWARE_DEVELOPMENT";
type QuizTrackOption = "INTERNSHIP" | "SOFTWARE_DEVELOPMENT";
type StudentTrackOption = "INTERNSHIP" | "FULL_TIME" | "BOTH";
type JobRoleTypeOption = "INTERNSHIP" | "FULL_TIME";
type ProgramLevelOption = "FOUNDATION" | "DIPLOMA" | "BSC" | "BS";
interface TrainingStageScore {
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

interface ActivityCatalogItem {
  id: string;
  table: "TABLE_1" | "TABLE_2" | "TABLE_3";
  domain: "COMMON" | "SOFTWARE_DEVELOPMENT" | "DATA_SCIENCE";
  topic: string;
  title: string;
  description: string;
  points: number;
  platformHint: string;
}

interface ActivitySubmission {
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

export const ACTIVITY_CATALOG: ActivityCatalogItem[] = [
  // Table 1: Common Mandatory (Total 15 pts, Min 10 pts)
  { id: "T1-DBMS-1", table: "TABLE_1", domain: "COMMON", topic: "DBMS", title: "SQL Basic Certification (HackerRank)", description: "SQL Basic Certification Skills on HackerRank", points: 1, platformHint: "https://www.hackerrank.com/skills-verification" },
  { id: "T1-DBMS-2", table: "TABLE_1", domain: "COMMON", topic: "DBMS", title: "SQL Intermediate Certification (HackerRank)", description: "SQL Intermediate Certification Skills on HackerRank", points: 1, platformHint: "https://www.hackerrank.com/skills-verification" },
  { id: "T1-DBMS-3", table: "TABLE_1", domain: "COMMON", topic: "DBMS", title: "SQL Advanced Certification (HackerRank)", description: "SQL Advanced Certification Skills on HackerRank", points: 2, platformHint: "https://www.hackerrank.com/skills-verification" },
  { id: "T1-PDSA-1", table: "TABLE_1", domain: "COMMON", topic: "PDSA (Python)", title: "PDSA Tasks Easy (20 LeetCode)", description: "Solve 20 Easy Level Questions on LeetCode", points: 1, platformHint: "https://leetcode.com/u/..." },
  { id: "T1-PDSA-2", table: "TABLE_1", domain: "COMMON", topic: "PDSA (Python)", title: "PDSA Tasks Medium (25 LeetCode)", description: "Solve 25 Intermediate Level Questions on LeetCode", points: 2, platformHint: "https://leetcode.com/u/..." },
  { id: "T1-PDSA-3", table: "TABLE_1", domain: "COMMON", topic: "PDSA (Python)", title: "PDSA Tasks Hard (10 LeetCode)", description: "Solve 10 Advanced Level Questions on LeetCode", points: 4, platformHint: "https://leetcode.com/u/..." },
  { id: "T1-SYS-1", table: "TABLE_1", domain: "COMMON", topic: "System Commands", title: "VM Task — Solve VMT1.x Series", description: "Complete VMT1.x series & HackerRank Linux Shell challenges (grep, sed, awk)", points: 3, platformHint: "https://www.hackerrank.com/domains/shell" },
  { id: "T1-CLD-1", table: "TABLE_1", domain: "COMMON", topic: "Cloud & DevOps", title: "Introduction to Cloud Computing / AWS Cloud Foundation", description: "Simplilearn Intro to Cloud Computing or AWS Certified Cloud Practitioner", points: 3, platformHint: "https://www.simplilearn.com/..." },

  // Table 2.1: Internship Mandatory — Software Development (Total 25 pts, Min 15 pts)
  { id: "T21-JAVA-1", table: "TABLE_2", domain: "SOFTWARE_DEVELOPMENT", topic: "Java", title: "Java Tasks Easy (HackerRank)", description: "Practice Java Easy Tasks on HackerRank", points: 1, platformHint: "https://www.hackerrank.com/domains/java" },
  { id: "T21-JAVA-2", table: "TABLE_2", domain: "SOFTWARE_DEVELOPMENT", topic: "Java", title: "Java Tasks Medium (5 Badges)", description: "Earn 5 Badges from Java Tasks on HackerRank", points: 4, platformHint: "https://www.hackerrank.com/domains/java" },
  { id: "T21-MAD-1", table: "TABLE_2", domain: "SOFTWARE_DEVELOPMENT", topic: "Modern App Dev", title: "Build 4 GitHub Projects (Flask, Vue3)", description: "Build 4 projects in GitHub using Flask, Vue3 & code contributions", points: 5, platformHint: "https://github.com/..." },
  { id: "T21-LNX-1", table: "TABLE_2", domain: "SOFTWARE_DEVELOPMENT", topic: "Linux Club", title: "Linux Club Mandatory Activity", description: "Complete mandatory IIC Linux Club practical task", points: 10, platformHint: "IIC Linux Club Submission Link" },
  { id: "T21-SWE-1", table: "TABLE_2", domain: "SOFTWARE_DEVELOPMENT", topic: "Certification", title: "Software Engineer Intern Certificate (HackerRank)", description: "HackerRank Software Engineer Intern Role Certification", points: 5, platformHint: "https://www.hackerrank.com/skills-verification" },

  // Table 2.2: Internship Mandatory — Data Science (Total 25 pts, Min 15 pts)
  { id: "T22-KAG-1", table: "TABLE_2", domain: "DATA_SCIENCE", topic: "ML Practice (Kaggle)", title: "Kaggle Regression Competition (RMSE <= 0.50)", description: "Compete in Regression-based Kaggle Competition and achieve RMSE <= 0.50", points: 5, platformHint: "https://www.kaggle.com/..." },
  { id: "T22-KAG-2", table: "TABLE_2", domain: "DATA_SCIENCE", topic: "ML Practice (Kaggle)", title: "Kaggle Classification Competition (Accuracy >= 80%)", description: "Compete in Classification-based Kaggle Competition and achieve Accuracy >= 80%", points: 5, platformHint: "https://www.kaggle.com/..." },
  { id: "T22-MLC-1", table: "TABLE_2", domain: "DATA_SCIENCE", topic: "ML Certification", title: "Machine Learning Basics Certification", description: "Complete verified Machine Learning Basics Certification", points: 15, platformHint: "Certificate URL" },

  // Table 3.1: Full-Time Placement Mandatory — Software Development (Total 40 pts, Min 25 pts)
  { id: "T31-SYS-1", table: "TABLE_3", domain: "SOFTWARE_DEVELOPMENT", topic: "System Commands", title: "VM Tasks — Solve VMT2.x Series", description: "Complete advanced VMT2.x series virtual machine tasks", points: 5, platformHint: "VM Submission Proof" },
  { id: "T31-EXR-1", table: "TABLE_3", domain: "SOFTWARE_DEVELOPMENT", topic: "Bash (Exercism)", title: "Bash Track on Exercism (30 Problems)", description: "Solve 30 problems in the Bash track on Exercism", points: 2, platformHint: "https://exercism.org/profiles/..." },
  { id: "T31-EXR-2", table: "TABLE_3", domain: "SOFTWARE_DEVELOPMENT", topic: "Bash (Exercism)", title: "Exercism Reputation > 100 Points", description: "Achieve over 100 reputation points on Exercism", points: 3, platformHint: "https://exercism.org/profiles/..." },
  { id: "T31-CLD-1", table: "TABLE_3", domain: "SOFTWARE_DEVELOPMENT", topic: "Cloud Associate", title: "Associate Cloud Certification (AWS / Azure AZ-204 / GCP)", description: "AWS Associate, Microsoft Azure AZ-204, or Google Associate Certification", points: 5, platformHint: "Credly / Certificate URL" },
  { id: "T31-APP-1", table: "TABLE_3", domain: "SOFTWARE_DEVELOPMENT", topic: "App Dev & GenAI", title: "4 Open-Source / FastAPI / React / RAG Chatbot GitHub Projects", description: "Open-source contributions + 4 GitHub projects using FastAPI, NodeJS/React, GenAI & RAG", points: 5, platformHint: "https://github.com/..." },
  { id: "T31-WEB-1", table: "TABLE_3", domain: "SOFTWARE_DEVELOPMENT", topic: "Web Dev Club", title: "Web Development Club Mandatory Activity", description: "Complete mandatory IIC Web Development Club activity", points: 10, platformHint: "IIC Web Dev Club Link" },
  { id: "T31-SWE-1", table: "TABLE_3", domain: "SOFTWARE_DEVELOPMENT", topic: "Certification", title: "Software Engineer Certificate (HackerRank)", description: "HackerRank Software Engineer Role Certification", points: 10, platformHint: "https://www.hackerrank.com/skills-verification" },

  // Table 3.2: Full-Time Placement Mandatory — Data Science (Total 40 pts, Min 25 pts)
  { id: "T32-VIZ-1", table: "TABLE_3", domain: "DATA_SCIENCE", topic: "Data Visualization", title: "Power BI / Tableau / Python Data Analysis Certification", description: "Microsoft Power BI Data Analyst, Tableau, or Data Analysis with Python Certification", points: 5, platformHint: "Certificate URL" },
  { id: "T32-AIML-1", table: "TABLE_3", domain: "DATA_SCIENCE", topic: "AI & ML Club", title: "AI & ML Club Mandatory Activity", description: "Complete mandatory IIC AI & ML Club project/activity", points: 10, platformHint: "IIC AI & ML Club Link" },
  { id: "T32-DLP-1", table: "TABLE_3", domain: "DATA_SCIENCE", topic: "Deep Learning (DLP)", title: "DLP — NPPE 1 Score", description: "Complete and qualify in NPPE1 of Deep Learning Practice (DLP)", points: 5, platformHint: "IITM BS DLP Scorecard" },
  { id: "T32-DLP-2", table: "TABLE_3", domain: "DATA_SCIENCE", topic: "Deep Learning (DLP)", title: "DLP — NPPE 2 Score", description: "Complete and qualify in NPPE2 of Deep Learning Practice (DLP)", points: 5, platformHint: "IITM BS DLP Scorecard" },
  { id: "T32-DLP-3", table: "TABLE_3", domain: "DATA_SCIENCE", topic: "Deep Learning (DLP)", title: "DLP — NPPE 3 Score", description: "Complete and qualify in NPPE3 of Deep Learning Practice (DLP)", points: 5, platformHint: "IITM BS DLP Scorecard" },
  { id: "T32-AWS-1", table: "TABLE_3", domain: "DATA_SCIENCE", topic: "AWS / GenAI Cert", title: "AWS Academy Data Engineering / ML / NLP / GenAI Foundations", description: "Complete AWS Academy Data Engineering, ML Foundations, NLP, or GenAI Foundations", points: 10, platformHint: "AWS Credly / Certificate URL" },
];

function parseGoogleDriveLink(rawUrl: string): {
  isValid: boolean;
  fileId: string | null;
  previewUrl: string;
  viewUrl: string;
} {
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("drive.google.com") && !host.includes("docs.google.com")) {
      return { isValid: false, fileId: null, previewUrl: trimmed, viewUrl: trimmed };
    }
    // Match /file/d/<ID>/... or ?id=<ID>
    const pathMatch = parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    const queryId = parsed.searchParams.get("id");
    const fileId = pathMatch?.[1] || queryId || null;

    if (fileId) {
      return {
        isValid: true,
        fileId,
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        viewUrl: `https://drive.google.com/file/d/${fileId}/view`,
      };
    }
    return { isValid: true, fileId: null, previewUrl: trimmed, viewUrl: trimmed };
  } catch {
    return { isValid: false, fileId: null, previewUrl: trimmed, viewUrl: trimmed };
  }
}

const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
  "http://localhost:8000";

const JWT_STORAGE_KEY = "iitm_placement_jwt";

function toBackendRole(role: Role): string {
  return role === "TRAINING_COORDINATOR" ? "PROGRAM_COORDINATOR" : role;
}

function fromBackendRole(role: string): Role {
  if (role === "PROGRAM_COORDINATOR") return "TRAINING_COORDINATOR";
  if (role === "SUPER_ADMIN") return "ADMIN";
  if (
    role === "STUDENT" ||
    role === "RECRUITER" ||
    role === "EXAMINER" ||
    role === "TRAINING_COORDINATOR" ||
    role === "ADMIN"
  ) {
    return role;
  }
  return "STUDENT";
}

const INITIAL_TRAINING_STAGES: TrainingStageScore[] = [
  // Level 1: Soft Skills Training (Overall Cutoff 80%, Stage Cutoff 70%, Max 2 Attempts/Stage)
  { id: "L1-S1", level: 1, stageNum: 1, title: "Placement Prep", description: "Video-based communication training", evaluationType: "MARKS", maxMarks: 20, minRequired: 14, obtainedMarks: 17, attemptsUsed: 1, maxAttempts: 2, statusText: "PASSED" },
  { id: "L1-S2", level: 1, stageNum: 2, title: "Listening Comprehension I", description: "Listen to audio and write a paragraph response via LMS", evaluationType: "MARKS", maxMarks: 20, minRequired: 14, obtainedMarks: 16, attemptsUsed: 1, maxAttempts: 2, statusText: "PASSED" },
  { id: "L1-S3", level: 1, stageNum: 3, title: "Listening Comprehension II", description: "Listen and speak to answer given questions", evaluationType: "MARKS", maxMarks: 20, minRequired: 14, obtainedMarks: 16, attemptsUsed: 2, maxAttempts: 2, statusText: "PASSED" },
  { id: "L1-S4", level: 1, stageNum: 4, title: "Self-Introduction Video", description: "Formally dressed video recording", evaluationType: "MARKS", maxMarks: 40, minRequired: 28, obtainedMarks: 34, attemptsUsed: 1, maxAttempts: 2, statusText: "PASSED" },
  { id: "L1-S5", level: 1, stageNum: 5, title: "Email Writing", description: "Write formal/professional corporate emails", evaluationType: "MARKS", maxMarks: 20, minRequired: 14, obtainedMarks: 17, attemptsUsed: 1, maxAttempts: 2, statusText: "PASSED" },

  // Level 2: Focus Finder (Overall Cutoff 60%, Stage Cutoff 70%, Max 2 Attempts/Stage)
  { id: "L2-S1", level: 2, stageNum: 1, title: "Behavioral Assessment", description: "Scenario-based response & live training assessment", evaluationType: "MARKS", maxMarks: 20, minRequired: 14, obtainedMarks: 15, attemptsUsed: 1, maxAttempts: 2, statusText: "PASSED" },
  { id: "L2-S2", level: 2, stageNum: 2, title: "Self-Paced Aptitude Test", description: "Analytical, quantitative, and logical tests", evaluationType: "MARKS", maxMarks: 30, minRequired: 21, obtainedMarks: 23, attemptsUsed: 1, maxAttempts: 2, statusText: "PASSED" },
  { id: "L2-S3", level: 2, stageNum: 3, title: "Project Presentation", description: "Present a short-term project added in resume", evaluationType: "MARKS", maxMarks: 30, minRequired: 21, obtainedMarks: 22, attemptsUsed: 1, maxAttempts: 2, statusText: "PASSED" },

  // Level 3: Hire Tracking (Overall Cutoff 60%, Stage Cutoff 60%, Max 2 Attempts/Stage)
  { id: "L3-S1", level: 3, stageNum: 1, title: "Technical Comprehensive Test", description: "Test on syllabus and industry-based concepts", evaluationType: "MARKS", maxMarks: 25, minRequired: 15, obtainedMarks: 18, attemptsUsed: 1, maxAttempts: 2, statusText: "PASSED" },
  { id: "L3-S2", level: 3, stageNum: 2, title: "Technical AI Mock Interview", description: "Realistic, AI-evaluated interview simulation", evaluationType: "AI_MOCK", maxMarks: 0, minRequired: 0, obtainedMarks: 0, attemptsUsed: 1, maxAttempts: 2, statusText: "Hire" },
  { id: "L3-S3", level: 3, stageNum: 3, title: "1-on-1 Session with Examiner", description: "Domain fundamentals, resume deep-dive & placement readiness", evaluationType: "ONE_ON_ONE", maxMarks: 0, minRequired: 0, obtainedMarks: 0, attemptsUsed: 0, maxAttempts: 2, statusText: "No" },
];

type AppStatusOption =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "OFFERED"
  | "OFFER_ACCEPTED"
  | "REJECTED" | "WITHDRAWN";

interface ResumeItem {
  id: string;
  title: string;
  targetRole: string;
  driveUrl: string;
  fileSize: string;
  updatedAt: string;
  isPrimary: boolean;
}

interface MarksheetRecord {
  fileName: string;
  driveUrl: string;
  fileSize: string;
  cgpa: string;
  uploadedAt: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: Role;
  action: string;
  resource: string;
  status: "SUCCESS" | "BLOCKED";
}

interface BankQuestionItem {
  id: string;
  domain: QuizDomainOption;
  track: QuizTrackOption;
  prompt: string;
  options: string[];
  correctIndex: number;
}

interface CourseModuleItem {
  id: string;
  title: string;
  durationMinutes: number;
  summary: string;
  completed: boolean;
}

interface SkillBadgeItem {
  code: string;
  courseCode: string;
  skillName: string;
  scorePct: number;
  issuedAt: string;
}

interface TrainingTrack {
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


interface OneOnOneSlotRecord {
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

interface ExaminerEvaluationRecord {
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

interface JobDriveItem {
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

interface JobApplicationRecord {
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

type InterviewRoundOption = "TECHNICAL_1" | "TECHNICAL_2" | "MANAGERIAL" | "HR_FINAL";
type InterviewStatusOption = "SCHEDULED" | "CONFIRMED" | "PASSED" | "FAILED";
type OfferStatusOption = "ISSUED" | "ACCEPTED" | "DECLINED";

interface InterviewScheduleRecord {
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

interface OfferLetterRecord {
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

const INITIAL_INTERVIEWS: InterviewScheduleRecord[] = [
  {
    id: "IV-901",
    applicationId: "SEED-APP-1",
    studentRoll: "22F3001234",
    studentName: "Aarav Sharma",
    companyName: "Fractal Analytics",
    jobTitle: "Associate Data Scientist",
    roundNumber: 1,
    roundType: "TECHNICAL_1",
    mode: "ONLINE_MEET",
    scheduledAt: "2026-11-22T10:30",
    meetingLink: "https://meet.google.com/iitm-fractal-ds1",
    panelistName: "Dr. Meera Subramanian (Principal DS)",
    status: "SCHEDULED",
  },
];

const INITIAL_OFFERS: OfferLetterRecord[] = [
  {
    id: "OFR-501",
    offerCode: "OFR-2026-8841A",
    applicationId: "SEED-APP-2",
    studentRoll: "22F3001234",
    studentName: "Aarav Sharma",
    companyName: "Flipkart",
    roleTitle: "Data Science Intern — Supply Chain",
    roleType: "INTERNSHIP",
    ctcLpa: 7.2,
    joiningDate: "2027-01-11",
    expiresAt: "2026-12-05",
    status: "ISSUED",
  },
];

const ALLOWED_DOMAINS = ["@ds.study.iitm.ac.in", "@es.study.iitm.ac.in"];
const QUIZ_DURATION_SECONDS = 30 * 60;
const QUESTIONS_PER_QUIZ = 15;

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Bihar",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
  "Other",
];

// 1. Data Science — Internship Track Question Bank (24 unique questions)
const SEED_DS_INTERNSHIP_BANK: Array<[string, string[], number]> = [
  ["When should StandardScaler be fit inside a cross-validation pipeline?", ["On the entire dataset before splitting", "Inside each training fold only, then applied to validation", "Only on the test set", "After hyperparameter tuning"], 1],
  ["Which metric is most informative on a heavily imbalanced 1% positive class dataset?", ["Raw Accuracy", "PR-AUC (Precision-Recall AUC)", "R-squared", "Mean Bias Error"], 1],
  ["Which SQL window function assigns consecutive ranks without gaps for ties?", ["RANK()", "DENSE_RANK()", "ROW_NUMBER()", "NTILE(4)"], 1],
  ["What does L1 (Lasso) regularization uniquely encourage compared to L2 (Ridge)?", ["Exact zero feature weights (sparsity)", "Uniformly small weights", "Faster matrix inversion", "Higher variance"], 0],
  ["Which hypothesis test compares medians across two independent non-normal samples?", ["Paired t-test", "Mann-Whitney U test", "Chi-square test", "ANOVA F-test"], 1],
  ["Why is stratified splitting recommended for classification datasets?", ["Preserves class proportions across train and test folds", "Removes outliers", "Normalizes skewed features", "Reduces dimensionality"], 0],
  ["In A/B testing, what does statistical power (1 - β) measure?", ["Probability of rejecting a false null hypothesis", "Type I error probability", "Sample mean variance", "Confidence interval width"], 0],
  ["Which distance metric is invariant to vector magnitude and ideal for TF-IDF text embeddings?", ["Euclidean distance", "Cosine similarity/distance", "Manhattan distance", "Hamming distance"], 1],
  ["What causes target leakage in time-series forecasting?", ["Using future lags or post-event aggregates as features", "Using rolling historical means", "Encoding day-of-week", "Dropping missing timestamps"], 0],
  ["Which loss function is minimized by binary logistic regression?", ["Hinge loss", "Binary cross-entropy (log loss)", "Huber loss", "Triplet loss"], 1],
  ["What does PCA maximize along its first principal component?", ["Class separability", "Projected variance of centered data", "Mutual information", "L1 sparsity"], 1],
  ["In k-means clustering, what does the silhouette score measure?", ["Cluster cohesion vs separation", "Iteration count", "Feature correlation", "Outlier count"], 0],
  ["Which technique addresses class imbalance by interpolating synthetic minority points?", ["SMOTE", "Random column shuffling", "Standard scaling", "PCA whitening"], 0],
  ["Which SQL clause filters groups after aggregation?", ["WHERE", "HAVING", "ORDER BY", "DISTINCT"], 1],
  ["What is the variance inflation factor (VIF) used to diagnose?", ["Heteroscedasticity", "Multicollinearity among predictors", "Autocorrelation", "Non-normality of target"], 1],
  ["In gradient boosted trees, what does lowering learning rate with more estimators generally improve?", ["Generalization performance", "Training speed", "Memory footprint", "Label noise"], 0],
  ["What is the difference between UNION and UNION ALL in SQL?", ["UNION deduplicates rows; UNION ALL retains all duplicates", "UNION ALL sorts automatically", "UNION requires identical column names", "UNION only works on indexed tables"], 0],
  ["Which Pandas operation avoids chained-indexing SettingWithCopyWarning?", ["Using .loc[row_indexer, col_indexer] in a single step", "Chaining df[a][b] = val", "Disabling garbage collection", "Converting to list first"], 0],
  ["What does a ROC curve plot across classification thresholds?", ["True Positive Rate vs False Positive Rate", "Precision vs Recall", "Loss vs Epoch", "Bias vs Variance"], 0],
  ["When is median imputation preferred over mean imputation?", ["When the numeric feature has heavy skewness or outliers", "When data is categorical", "When missingness is 0%", "When variance is zero"], 0],
  ["Which SQL join returns all rows from the left table and matched rows from the right table?", ["LEFT OUTER JOIN", "INNER JOIN", "CROSS JOIN", "SELF JOIN"], 0],
  ["Which diagnostic plot compares empirical sample quantiles against theoretical normal quantiles?", ["Q-Q Plot", "ROC Curve", "Scree Plot", "Partial Dependence Plot"], 0],
  ["Why is Huber loss preferred over MSE when target labels contain severe outliers?", ["It transitions from quadratic to linear error beyond threshold delta", "It ignores all residuals", "It forces sparse coefficients", "It requires no hyperparameter"], 0],
  ["What does the F1-score compute?", ["Harmonic mean of Precision and Recall", "Arithmetic mean of Accuracy and Specificity", "Area under the Lift curve", "Log-odds ratio"], 0],
];

// 2. Data Science — Full-Time Placement Question Bank (24 distinct production ML & statistical modeling questions)
const SEED_DS_FULLTIME_BANK: Array<[string, string[], number]> = [
  ["What does a high Population Stability Index (PSI > 0.25) indicate in production?", ["Significant covariate distribution shift", "Zero model latency", "Perfect calibration", "Training-only overfitting"], 0],
  ["Which technique calibrates predicted probabilities without altering rank ordering?", ["Dropout", "Isotonic / Platt Calibration", "L1 Pruning", "PCA"], 1],
  ["What is the primary purpose of an out-of-time (OOT) validation split?", ["Verify temporal stability against concept drift", "Speed up grid search", "Tune batch size", "Replace unit tests"], 0],
  ["What does SHAP provide for gradient boosted tree models?", ["Consistent local feature attribution values", "Hyperparameter bounds", "Database indexing", "GPU profiling"], 0],
  ["What does the Benjamini-Hochberg procedure control during multiple hypothesis testing?", ["False Discovery Rate (FDR)", "Model variance", "Learning rate decay", "Gradient clipping threshold"], 0],
  ["In survival analysis, what does right-censoring mean for an observation?", ["The event has not occurred yet by the end of the study window", "The feature values were deleted", "The label was inverted", "The sample failed quality checks"], 0],
  ["What is the primary role of an embedding layer in deep learning for high-cardinality categoricals?", ["Maps discrete IDs into dense low-dimensional continuous vectors", "Performs one-hot expansion on disk", "Normalizes batch gradients", "Prunes dead ReLU neurons"], 0],
  ["In Bayesian inference, what is a conjugate prior?", ["A prior distribution yielding a posterior in the same probability family", "A uniform uninformative prior only", "A point-mass Dirac prior", "A cross-validated hyperparameter"], 0],
  ["What does Kullback-Leibler (KL) divergence measure between distributions P and Q?", ["Relative entropy (information lost when Q approximates P)", "Euclidean distance between means", "Pearson correlation", "Sample size ratio"], 0],
  ["Why do online feature stores maintain separate offline and online storage tiers?", ["Sub-10ms point lookups for serving vs high-throughput batch scans for training", "Offline stores cannot store floats", "Online stores forbid primary keys", "To duplicate raw CSV files"], 0],
  ["In causal inference, what does the Difference-in-Differences (DiD) estimator assume?", ["Parallel trends between treatment and control groups absent intervention", "Random assignment at the individual level", "Zero confounding covariates", "Linearity of propensity scores"], 0],
  ["How does CUPED reduce variance in online A/B experiments?", ["Adjusts post-experiment metrics using correlated pre-experiment covariates", "Increases sample size by bootstrapping", "Drops the top 10% of users", "Uses one-tailed t-tests"], 0],
  ["What problem does Approximate Nearest Neighbor (HNSW / IVF) solve in vector retrieval?", ["Sub-linear similarity search over millions of dense embeddings", "Exact SQL joins on JSONB", "Gradient checkpointing", "Lossless image compression"], 0],
  ["In LightGBM, why does Gradient-based One-Side Sampling (GOSS) speed up training?", ["Retains instances with large gradients while randomly sampling small-gradient instances", "Drops all categorical features", "Uses full-batch second-order Hessians only", "Disables tree pruning"], 0],
  ["What does the Brier score evaluate for probabilistic classifiers?", ["Mean squared error between predicted probabilities and binary outcomes", "Ranking AUC across imbalanced classes", "Feature collinearity", "Cluster purity"], 0],
  ["Why is GroupKFold required when a dataset contains multiple rows per user or session?", ["Prevents entity leakage across train and validation splits", "Balances class weights automatically", "Speeds up matrix multiplication", "Normalizes target skewness"], 0],
  ["In multi-armed bandits, how does Thompson Sampling balance exploration and exploitation?", ["Samples parameters from each arm's posterior reward distribution and picks the highest", "Always picks the arm with highest empirical mean", "Selects arms uniformly at random forever", "Uses fixed round-robin scheduling"], 0],
  ["What causes catastrophic forgetting during continual fine-tuning of neural networks?", ["Gradient updates overwrite weights critical to earlier tasks", "Learning rate equals zero", "Batch normalization is frozen", "Weight decay is disabled"], 0],
  ["In recommendation systems, what is the cold-start problem?", ["Lack of historical interaction data for new users or items", "GPU thermal throttling during inference", "Over-regularization of matrix factorization", "Duplicate item IDs in catalog"], 0],
  ["Why apply log1p transformation to heavy-tailed monetary or count targets?", ["Stabilizes variance and reduces right-skew influence on residuals", "Converts regression to classification", "Removes all zero values", "Guarantees normal residuals"], 0],
  ["What does the Kolmogorov-Smirnov (KS) two-sample statistic measure in drift monitoring?", ["Maximum vertical distance between two empirical CDFs", "Ratio of sample variances", "Correlation of residuals", "Number of missing values"], 0],
  ["In shadow deployment of a new ML model, how is live traffic handled?", ["Production traffic is mirrored to the candidate model without affecting user responses", "50% of users receive candidate predictions immediately", "Offline batch files are replayed once a month", "The primary model is shut down during evaluation"], 0],
  ["What is focal loss designed to address in dense object detection or extreme class imbalance?", ["Down-weights well-classified easy negatives so training focuses on hard examples", "Eliminates bounding-box regression", "Replaces non-maximum suppression", "Enforces L1 weight sparsity"], 0],
  ["Why are monotonic constraints often enforced on credit-risk or pricing GBMs?", ["Ensures domain-consistent directional behavior and regulatory interpretability", "Reduces tree depth to 1", "Eliminates validation splits", "Forces linear decision boundaries"], 0],
];

// 3. Software Development — Internship Track Question Bank (24 unique questions)
const SEED_SD_INTERNSHIP_BANK: Array<[string, string[], number]> = [
  ["Which HTTP status code best represents a business-rule conflict like exceeding max attempts?", ["200 OK", "302 Found", "409 Conflict", "502 Bad Gateway"], 2],
  ["What is the average lookup time complexity in a balanced binary search tree?", ["O(1)", "O(log n)", "O(n)", "O(n log n)"], 1],
  ["Which Git command replays commits from a feature branch onto the tip of main cleanly?", ["git rebase main", "git stash pop", "git bisect", "git tag"], 0],
  ["What does CORS preflight (OPTIONS) verify before a browser sends a cross-origin POST?", ["Allowed origins, HTTP methods, and custom headers", "TLS certificate chain", "DB connection pool", "DNSSEC records"], 0],
  ["Which data structure underlies Dijkstra's shortest-path algorithm for O((V+E) log V) runtime?", ["Min-Priority Queue (Binary Heap)", "LIFO Stack", "Circular Buffer", "Disjoint Set"], 0],
  ["Why parameterize SQL queries instead of string concatenation?", ["Prevents SQL injection and enables query plan reuse", "Bypasses transactions", "Disables foreign keys", "Compresses text columns"], 0],
  ["In React, what causes an infinite re-render loop inside useEffect?", ["Updating state unconditionally without a proper dependency array", "Using TypeScript interfaces", "Memoizing callbacks", "Rendering lists with keys"], 0],
  ["Which HTTP status code indicates the client has sent too many requests in a given timeframe?", ["429 Too Many Requests", "401 Unauthorized", "403 Forbidden", "422 Unprocessable Entity"], 0],
  ["What is the worst-case time complexity of quicksort without randomized pivot selection?", ["O(n^2)", "O(n log n)", "O(log n)", "O(1)"], 0],
  ["Which React hook preserves a mutable value across renders without triggering re-renders?", ["useRef", "useState", "useEffect", "useReducer"], 0],
  ["What is the key difference between HTTP 401 Unauthorized and 403 Forbidden?", ["401 means unauthenticated; 403 means authenticated but lacking permission", "401 is for POST only; 403 is for GET", "403 triggers automatic token refresh", "They are identical in RFC 9110"], 0],
  ["Which data structure provides O(1) amortized push/pop at both ends?", ["Deque (Double-Ended Queue)", "Singly Linked List", "Binary Max-Heap", "Trie"], 0],
  ["Why should stable unique keys (not array index) be used when rendering dynamic lists in React?", ["Prevents state mismatch and unnecessary DOM re-creation on reorder/delete", "Enables CSS Grid", "Avoids TypeScript errors", "Compresses JSX bundles"], 0],
  ["What does a foreign key constraint enforce in a relational database?", ["Referential integrity between child and parent table rows", "Automatic full-text indexing", "Row-level encryption", "Read-only table access"], 0],
  ["Which HTTP method is defined as both safe and idempotent?", ["GET", "POST", "PATCH", "CONNECT"], 0],
  ["What is the time complexity of finding connected components in an undirected graph using BFS/DFS?", ["O(V + E)", "O(V^2 log V)", "O(E log V)", "O(V!)"], 0],
  ["In REST APIs, when is 201 Created the standard response status?", ["When a POST request successfully creates a new resource", "When a GET returns an empty list", "When validation fails", "When a record is deleted"], 0],
  ["What does git bisect use to locate the commit that introduced a regression?", ["Binary search across commit history", "Three-way merge conflict resolution", "Interactive rebase squashing", "Reflog garbage collection"], 0],
  ["In TypeScript, what is the difference between unknown and any?", ["unknown requires type narrowing before operations; any disables type checking", "any is stricter than unknown", "unknown only works for primitives", "They compile to different JS syntax"], 0],
  ["What does a B-Tree index accelerate in SQL queries?", ["Equality (=) and range (<, >, BETWEEN) predicates on indexed columns", "Full-table sequential scans only", "Unindexed LIKE '%substring%' searches", "Network serialization"], 0],
  ["Why store password hashes using bcrypt or Argon2 instead of plain SHA-256?", ["Adaptive work factor and built-in salting resist GPU brute-force attacks", "SHA-256 produces longer strings", "bcrypt is reversible for password recovery", "Argon2 requires no CPU"], 0],
  ["What is a hash collision in a hash table?", ["Two distinct keys map to the same bucket index", "The hash table runs out of RAM", "A key is null", "The load factor reaches zero"], 0],
  ["In CSS Flexbox, what does justify-content control?", ["Alignment along the main axis", "Alignment along the cross axis", "Grid template columns", "Z-index stacking context"], 0],
  ["What is the purpose of an environment file (.env) excluded via .gitignore?", ["Keeps secrets and environment-specific config out of source control", "Speeds up Vite bundling", "Stores database migrations", "Defines Docker base images"], 0],
];

// 4. Software Development — Full-Time Placement Question Bank (24 distinct backend, DB & distributed systems questions)
const SEED_SD_FULLTIME_BANK: Array<[string, string[], number]> = [
  ["Why should blocking I/O calls be avoided inside an async FastAPI route?", ["They stall the single-threaded asyncio event loop", "FastAPI rejects sync functions", "PostgreSQL drops sync connections", "CORS headers fail"], 0],
  ["How is immutability guaranteed on an enterprise audit log table?", ["Soft-delete flags", "Blocking UPDATE/DELETE at ORM hooks and DB triggers", "Nightly truncation", "Client-side caching"], 1],
  ["What is the primary advantage of keyset pagination over large OFFSET queries?", ["Eliminates indexes", "O(log N) index seek without scanning skipped rows", "Automatic compression", "Disables isolation"], 1],
  ["What does an idempotency key prevent on POST application or payment endpoints?", ["Duplicate side effects on network retries", "SQL injection", "Slow DNS lookups", "JWT expiration"], 0],
  ["Which PostgreSQL index type is best suited for JSONB containment (@>) queries?", ["B-Tree", "GIN (Generalized Inverted Index)", "Hash", "BRIN"], 1],
  ["In JWT authentication, why use short-lived access tokens paired with refresh tokens?", ["Limits exposure window if an access token is compromised", "Eliminates HTTPS", "Avoids signature verification", "Stores passwords in plaintext"], 0],
  ["Which PostgreSQL isolation level prevents dirty reads and non-repeatable reads?", ["READ UNCOMMITTED", "REPEATABLE READ", "READ COMMITTED", "NONE"], 1],
  ["What problem does a circuit breaker pattern solve in distributed services?", ["Cascading failures when a downstream dependency degrades", "Schema migrations", "Static asset bundling", "CSS layout shifts"], 0],
  ["What is the purpose of a database connection pooler like PgBouncer?", ["Multiplexes client connections onto a bounded pool of DB backends", "Replaces backups", "Encrypts disk volumes", "Formats JSON"], 0],
  ["Which HTTP response header enforces HTTPS-only connections in browsers?", ["Strict-Transport-Security (HSTS)", "X-Powered-By", "Accept-Encoding", "ETag"], 0],
  ["Which CAP theorem trade-off does a strongly consistent PostgreSQL primary choose during a partition?", ["Consistency over Availability (CP)", "Availability over Consistency (AP)", "Neither", "Eventual disk sync"], 0],
  ["What does EXPLAIN ANALYZE in PostgreSQL show that EXPLAIN alone does not?", ["Actual execution times and row counts from running the query", "Table column types", "User permissions", "Index definitions"], 0],
  ["Which rate-limiting algorithm allows short bursts while enforcing a steady average rate?", ["Token Bucket", "Bubble Sort", "Round-Robin DNS", "Two-Phase Commit"], 0],
  ["What does optimistic locking typically use to detect concurrent row updates?", ["A version number or timestamp checked in the UPDATE WHERE clause", "Exclusive table-level locks on read", "Disabling WAL logging", "Single-threaded web workers"], 0],
  ["In OAuth 2.0 / OIDC for SPAs, why is PKCE (Proof Key for Code Exchange) mandatory?", ["Prevents authorization code interception without embedding a client secret", "Encrypts localStorage cookies", "Replaces TLS certificates", "Bypasses token expiry"], 0],
  ["Why use an Outbox Pattern when publishing domain events alongside PostgreSQL writes?", ["Guarantees atomic persistence of state and event without dual-write loss", "Eliminates message brokers", "Compresses JSON payloads", "Avoids primary keys"], 0],
  ["What does a Covering Index (INCLUDE columns) in PostgreSQL enable?", ["Index-Only Scans without fetching heap table pages", "Automatic table partitioning", "Full-text stemming", "Foreign key cascading"], 0],
  ["In container security, why run FastAPI/Node workloads as a non-root user?", ["Limits blast radius if an application vulnerability is exploited", "Increases CPU clock speed", "Enables privileged port binding", "Disables memory limits"], 0],
  ["What causes write amplification in LSM-tree storage engines (like RocksDB/Cassandra)?", ["Background SSTable compaction rewriting key-value pairs across levels", "B-Tree page splits on reads", "Row-level foreign key checks", "TLS handshake overhead"], 0],
  ["Why use SELECT ... FOR UPDATE SKIP LOCKED in a PostgreSQL job queue?", ["Allows concurrent workers to claim distinct pending jobs without lock contention", "Disables ACID durability", "Drops dead tuples automatically", "Forces sequential table scans"], 0],
  ["In distributed tracing, what is the purpose of propagating a W3C traceparent header?", ["Correlates spans across microservices into a single end-to-end request trace", "Caches DNS lookups", "Compresses HTTP/2 frames", "Enforces CORS origin checks"], 0],
  ["What is a thundering herd (cache stampede) problem and how is it mitigated?", ["Many requests miss an expired cache key simultaneously; mitigated via request coalescing or jittered TTLs", "Database disk reaches 100% IOPS on backups", "JWT keys expire every second", "DNS TTL is set to 24 hours"], 0],
  ["Why prefer Zero-Downtime Expand-and-Contract migrations for live PostgreSQL schemas?", ["Avoids long ACCESS EXCLUSIVE locks and maintains compatibility across rolling deploys", "Eliminates foreign keys permanently", "Rebuilds all indexes synchronously", "Skips staging environments"], 0],
  ["What does backpressure achieve in streaming or async producer-consumer pipelines?", ["Signals upstream producers to slow down when downstream consumers saturate", "Drops all unacknowledged messages", "Doubles thread pool size infinitely", "Disables TCP flow control"], 0],
];

function buildInitialQuestionBank(): BankQuestionItem[] {
  const bank: BankQuestionItem[] = [];
  SEED_DS_INTERNSHIP_BANK.forEach(([prompt, options, correctIndex], idx) => {
    bank.push({
      id: `ds-INTERNSHIP-${idx + 1}`,
      domain: "DATA_SCIENCE",
      track: "INTERNSHIP",
      prompt,
      options,
      correctIndex,
    });
  });
  SEED_DS_FULLTIME_BANK.forEach(([prompt, options, correctIndex], idx) => {
    bank.push({
      id: `ds-SOFTWARE_DEVELOPMENT-${idx + 1}`,
      domain: "DATA_SCIENCE",
      track: "SOFTWARE_DEVELOPMENT",
      prompt,
      options,
      correctIndex,
    });
  });
  SEED_SD_INTERNSHIP_BANK.forEach(([prompt, options, correctIndex], idx) => {
    bank.push({
      id: `sd-INTERNSHIP-${idx + 1}`,
      domain: "SOFTWARE_DEVELOPMENT",
      track: "INTERNSHIP",
      prompt,
      options,
      correctIndex,
    });
  });
  SEED_SD_FULLTIME_BANK.forEach(([prompt, options, correctIndex], idx) => {
    bank.push({
      id: `sd-SOFTWARE_DEVELOPMENT-${idx + 1}`,
      domain: "SOFTWARE_DEVELOPMENT",
      track: "SOFTWARE_DEVELOPMENT",
      prompt,
      options,
      correctIndex,
    });
  });
  return bank;
}

function mergeSeededQuestionBank(existing: BankQuestionItem[]): BankQuestionItem[] {
  const deletedIds = new Set<string>(
    (() => {
      try {
        const raw = localStorage.getItem("iitm_os_deleted_qb_ids_v1");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })()
  );
  const existingIds = new Set(existing.map((q) => q.id));
  const missingSeeds = buildInitialQuestionBank().filter(
    (seed) => !existingIds.has(seed.id) && !deletedIds.has(seed.id)
  );
  return [...existing, ...missingSeeds];
}

const INITIAL_TRACKS: TrainingTrack[] = [
  {
    id: "track-ds-intern",
    code: "DS-INT-101",
    title: "Data Science — Internship Track",
    domain: "DATA_SCIENCE",
    track: "INTERNSHIP",
    skillTag: "Data Science Internship Ready",
    passThresholdPct: 75,
    attemptsUsed: 0,
    maxAttempts: 3,
    bestScorePct: null,
    modules: [
      { id: "m-1", title: "SQL Analytics & Window Functions", durationMinutes: 25, summary: "Cohort queries, DENSE_RANK, and aggregation hygiene.", completed: true },
      { id: "m-2", title: "Leakage-Free Cross-Validation", durationMinutes: 30, summary: "Fold-safe scalers and stratified splits.", completed: false },
    ],
  },
  {
    id: "track-ds-sde",
    code: "DS-SDE-201",
    title: "Data Science — Software Development Track",
    domain: "DATA_SCIENCE",
    track: "SOFTWARE_DEVELOPMENT",
    skillTag: "Production ML & Data Engineering",
    passThresholdPct: 75,
    attemptsUsed: 0,
    maxAttempts: 3,
    bestScorePct: null,
    modules: [
      { id: "m-3", title: "Model Calibration & Threshold Tuning", durationMinutes: 25, summary: "Platt/Isotonic calibration and cost-sensitive operating points.", completed: false },
      { id: "m-4", title: "Covariate Drift & Telemetry (PSI/KS)", durationMinutes: 30, summary: "Detect production data drift before accuracy degrades.", completed: false },
    ],
  },
  {
    id: "track-sd-intern",
    code: "SD-INT-102",
    title: "Software Development — Internship Track",
    domain: "SOFTWARE_DEVELOPMENT",
    track: "INTERNSHIP",
    skillTag: "Software Dev Internship Ready",
    passThresholdPct: 75,
    attemptsUsed: 0,
    maxAttempts: 3,
    bestScorePct: null,
    modules: [
      { id: "m-5", title: "Core Data Structures & Graph Algorithms", durationMinutes: 25, summary: "Heaps, hash tables, BFS/DFS, and shortest paths.", completed: false },
      { id: "m-6", title: "REST Semantics & Relational Indexing", durationMinutes: 25, summary: "HTTP status codes, keyset pagination, and B-Trees.", completed: false },
    ],
  },
  {
    id: "track-sd-sde",
    code: "SD-SDE-202",
    title: "Software Development — Software Development Track",
    domain: "SOFTWARE_DEVELOPMENT",
    track: "SOFTWARE_DEVELOPMENT",
    skillTag: "Full-Stack & Distributed SDE",
    passThresholdPct: 75,
    attemptsUsed: 0,
    maxAttempts: 3,
    bestScorePct: null,
    modules: [
      { id: "m-7", title: "Async FastAPI & Connection Pooling", durationMinutes: 25, summary: "Prevent event-loop starvation at 50k concurrent users.", completed: false },
      { id: "m-8", title: "Idempotency, Circuit Breakers & RBAC", durationMinutes: 30, summary: "Build resilient, tamper-audited backend systems.", completed: false },
    ],
  },
];

const INITIAL_JOBS: JobDriveItem[] = [
  {
    id: "job-flipkart-intern",
    jobCode: "DRV-2026-FLIPKART-INT",
    companyName: "Flipkart",
    title: "Data Science & Analytics Intern (6 Months)",
    roleType: "INTERNSHIP",
    domain: "DATA_SCIENCE",
    location: "Bengaluru",
    compensation: "₹75,000 / month",
    workMode: "HYBRID",
    openingsCount: 6,
    applicationDeadline: "2026-12-10",
    selectionRounds: "Resume Shortlist → Online Python/ML Assessment → Technical Interview",
    description: "Supply-chain demand forecasting, anomaly detection, and A/B experimentation.",
    jdText: "Role Overview:\nJoin Flipkart Supply Chain Analytics as a Data Science & Analytics Intern (6 Months) to build demand forecasting and anomaly detection pipelines.\n\nKey Responsibilities:\n• Build time-series forecasting & inventory optimization models in Python & SQL.\n• Design A/B experimentation metrics for fulfillment centers.\n• Present weekly insights to product and operations leads.\n\nEligibility & Perks:\n• Open to IITM BS Diploma, BSc, and BS students with CGPA >= 7.5.\n• PPO conversion opportunity based on 6-month performance review.",
    minCgpa: 7.5,
    maxBacklogs: 0,
    allowedLevels: ["DIPLOMA", "BSC", "BS"],
    requireExaminerReady: false,
    requiredSkillTags: [],
  },
  {
    id: "job-zoho-intern",
    jobCode: "DRV-2026-ZOHO-INT",
    companyName: "Zoho Corporation",
    title: "Software Developer Intern",
    roleType: "INTERNSHIP",
    domain: "SOFTWARE_DEVELOPMENT",
    location: "Chennai",
    compensation: "₹45,000 / month",
    description: "Full-stack cloud productivity applications, REST APIs, and relational query tuning.",
    minCgpa: 7.0,
    maxBacklogs: 1,
    allowedLevels: ["DIPLOMA", "BSC", "BS"],
    requireExaminerReady: false,
    requiredSkillTags: [],
  },
  {
    id: "job-fractal-ft",
    jobCode: "DRV-2026-FRACTAL",
    companyName: "Fractal Analytics",
    title: "Applied Data Scientist — Decision Sciences",
    roleType: "FULL_TIME",
    domain: "DATA_SCIENCE",
    location: "Bengaluru / Mumbai (Hybrid)",
    compensation: "₹16.5 LPA",
    description: "Production forecasting, propensity modeling, and causal inference pipelines.",
    minCgpa: 8.0,
    maxBacklogs: 0,
    allowedLevels: ["BSC", "BS"],
    requireExaminerReady: true,
    requiredSkillTags: ["Production ML & Data Engineering"],
  },
  {
    id: "job-razorpay-ft",
    jobCode: "DRV-2026-RAZORPAY",
    companyName: "Razorpay",
    title: "Software Development Engineer I (Backend)",
    roleType: "FULL_TIME",
    domain: "SOFTWARE_DEVELOPMENT",
    location: "Bengaluru",
    compensation: "₹22.0 LPA",
    description: "High-throughput payment orchestration APIs, idempotent ledgers, and microservices.",
    minCgpa: 8.2,
    maxBacklogs: 0,
    allowedLevels: ["BSC", "BS"],
    requireExaminerReady: true,
    requiredSkillTags: ["Full-Stack & Distributed SDE"],
  },
];

function drawRandomQuestions(pool: BankQuestionItem[], count: number): BankQuestionItem[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

const AdminGovernancePortal = lazy(() => import("./components/AdminGovernancePortal"));
const TrainingAndVettingPortal = lazy(() => import("./components/TrainingAndVettingPortal"));

const dedupeEvaluationsByRoll = (list: any[]) => {
  const seen = new Set<string>();
  return list.filter((ev: any) => {
    const r = String(ev?.studentRoll || "").trim().toUpperCase();
    if (!r) return true;
    if (seen.has(r)) return false;
    seen.add(r);
    return true;
  });
};

export default function App() {
  const [email, setEmail] = useState("22f3001234@ds.study.iitm.ac.in");
  const [selectedRole, setSelectedRole] = useState<Role>("STUDENT");
  const [user, setUser] = useState<{ email: string; role: Role; name: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("SIGN_IN");
  const INITIAL_STUDENT_DRAFT: StudentOnboardingDraft = {
    fullName: "",
    email: "",
    password: "",
    personalEmail: "",
    mobileNumber: "",
    cgpa: "",
    activeBacklogs: 0,
    programLevel: "DIPLOMA",
    hasDiplomaDataScience: false,
    hasDiplomaProgramming: false,
    applyingTrack: "INTERNSHIP",
    targetDomain: "DATA_SCIENCE",
    gender: "",
    stateName: "",
    category: "GENERAL",
    degreeType: "STANDALONE",
    isWorkingProf: false,
    yearsExp: "",
    workDomain: "DATA_SCIENCE",
    presentCompany: "",
    workLocation: "",
    currentCtc: "",
  };
  const [onboardingStep, setOnboardingStep] = useState<StudentOnboardingStep>("AUTH");
  const [studentDraft, setStudentDraft] = useState<StudentOnboardingDraft>(INITIAL_STUDENT_DRAFT);
  const resetStudentDraft = () => setStudentDraft({ ...INITIAL_STUDENT_DRAFT });
  const [eligibilityVerdict, setEligibilityVerdict] = useState<{
    eligible: boolean;
    message: string;
  } | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [password, setPassword] = useState("123456");
  const [regFullName, setRegFullName] = useState("");
  const [regOrgOrDept, setRegOrgOrDept] = useState("");
  const [recruiterDraft, setRecruiterDraft] = useState<RecruiterOnboardingDetails>({
    mobileNumber: "",
    companyName: "",
    companyType: "PRODUCT",
    companySize: "251–1,000 employees",
    foundedYear: "",
    companyWebsite: "",
    companyLinkedinUrl: "",
    cinOrGstNumber: "",
    headquartersLocation: "",
    hiringLocations: "",
    workMode: "HYBRID",
    companyOverview: "",
    designation: "",
    linkedinUrl: "",
    hiringMode: "BOTH",
    targetRoles: "",
    expectedHeadcount: "1–5 hires",
    compensationRange: "",
    policyAccepted: false,
  });
  const [examinerDraft, setExaminerDraft] = useState<ExaminerOnboardingDetails>({
    mobileNumber: "",
    category: "INDUSTRY_MENTOR",
    organization: "",
    designation: "",
    yearsExperience: "",
    linkedinUrl: "",
    portfolioOrScholarUrl: "",
    evaluationDomain: "BOTH",
    specializations: "",
    weeklyVivaCapacity: 5,
    preferredTimeWindow: "Weekday Evenings (6 PM – 9 PM IST)",
    cvDriveUrl: "",
    coiAccepted: false,
  });
  // Admin Executive Command Center CRUD & Export States
  const [adminDirectoryRoleFilter, setAdminDirectoryRoleFilter] = useState<"ALL" | Role>("ALL");
  const [adminDirectorySearch, setAdminDirectorySearch] = useState("");
  const [adminNewFullName, setAdminNewFullName] = useState("");
  const [adminNewEmail, setAdminNewEmail] = useState("");
  const [adminNewRole, setAdminNewRole] = useState<Exclude<Role, "ADMIN">>("STUDENT");
  const [adminNewOrgOrDept, setAdminNewOrgOrDept] = useState("");
  const [adminNewStatus, setAdminNewStatus] = useState<"APPROVED" | "PENDING" | "REJECTED">("APPROVED");
  const [editingRegId, setEditingRegId] = useState<string | null>(null);
  const [editRegDraft, setEditRegDraft] = useState<{
    fullName: string;
    email: string;
    role: Exclude<Role, "ADMIN">;
    orgOrDept: string;
    status: RegistrationApprovalStatus;
  }>({
    fullName: "",
    email: "",
    role: "STUDENT",
    orgOrDept: "",
    status: "APPROVED",
  });
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editJobDraft, setEditJobDraft] = useState<{
    companyName: string;
    title: string;
    domain: QuizDomainOption;
    roleType: "INTERNSHIP" | "FULL_TIME";
    compensation: string;
    minCgpa: string;
  }>({
    companyName: "",
    title: "",
    domain: "DATA_SCIENCE",
    roleType: "INTERNSHIP",
    compensation: "",
    minCgpa: "7.0",
  });
  const [adminCommandAlert, setAdminCommandAlert] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);

  const handleAdminDownloadRosterCsv = (roleFilter: "ALL" | Role) => {
    const filtered =
      roleFilter === "ALL"
        ? registrations
        : registrations.filter((r) => r.role === roleFilter);

    const escapeCsv = (val: unknown) => {
      const s = String(val ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const headers = [
      "Reg_ID",
      "Full_Name",
      "Email",
      "Role",
      "Department_Or_Organization",
      "Approval_Status",
      "Payment_Status",
      "Submitted_At",
      "Reviewed_By",
      "Extra_Profile_Metadata",
    ];

    const rows = filtered.map((r) => {
      let extraMeta = "";
      if (r.role === "EXAMINER" && r.examinerProfileDetails) {
        const ep = r.examinerProfileDetails;
        extraMeta = `${ep.organization} | ${ep.designation} | ${ep.yearsExperience} yrs | Domain: ${ep.evaluationDomain} | Mobile: ${ep.mobileNumber} | LinkedIn: ${ep.linkedinUrl}`;
      } else if (r.role === "RECRUITER" && r.recruiterProfileDetails) {
        const rp = r.recruiterProfileDetails;
        extraMeta = `${rp.companyName} | ${rp.designation} | HQ: ${rp.headquartersLocation} | Hiring: ${rp.hiringLocations} | Comp: ${rp.compensationRange} | Mobile: ${rp.mobileNumber} | Web: ${rp.companyWebsite}`;
      }
      return [
        r.id,
        r.fullName,
        r.email,
        r.role,
        r.orgOrDept,
        r.status,
        r.paymentStatus || "NOT_REQUIRED",
        r.submittedAt || "2026-01-15",
        r.reviewedBy || "placement.admin@iitm.ac.in",
        extraMeta,
      ]
        .map(escapeCsv)
        .join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const label = roleFilter === "ALL" ? "all_platform_stakeholders" : roleFilter.toLowerCase() + "s";
    link.href = url;
    link.setAttribute("download", `iitm_placement_${label}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    appendAudit(
      user?.email || "placement.admin@iitm.ac.in",
      "ADMIN",
      "ADMIN_CSV_DATA_EXPORT",
      `Exported ${filtered.length} ${roleFilter} record(s) to CSV`,
      "SUCCESS"
    );
    setAdminCommandAlert({
      type: "OK",
      text: `Downloaded ${filtered.length} ${roleFilter === "ALL" ? "Master Roster" : roleFilter} record(s) as CSV.`,
    });
  };

  const handleDownloadFullTrainingReportCsv = () => {
    const escapeCsv = (val: unknown) => {
      const s = String(val ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const studentMap = new Map<string, { roll: string; fullName: string; email: string; status: string }>();
    registrations
      .filter((r) => r.role === "STUDENT")
      .forEach((r) => {
        const roll = (r.email.split("@")[0] || "").trim().toUpperCase();
        if (roll) {
          studentMap.set(roll, {
            roll,
            fullName: r.fullName,
            email: r.email,
            status: r.status,
          });
        }
      });

    Object.keys(trainingStagesByRoll).forEach((r) => {
      const roll = r.trim().toUpperCase();
      if (roll && !studentMap.has(roll)) {
        studentMap.set(roll, {
          roll,
          fullName: `IITM Student (${roll})`,
          email: `${roll.toLowerCase()}@ds.study.iitm.ac.in`,
          status: "APPROVED",
        });
      }
    });

    evaluations.forEach((ev) => {
      const roll = String(ev.studentRoll || "").trim().toUpperCase();
      if (roll && !studentMap.has(roll)) {
        studentMap.set(roll, {
          roll,
          fullName: `IITM Student (${roll})`,
          email: `${roll.toLowerCase()}@ds.study.iitm.ac.in`,
          status: "APPROVED",
        });
      }
    });

    const activeRoll = resolveActiveStudentRoll();
    const allStagesMap: Record<string, TrainingStageScore[]> = {
      ...trainingStagesByRoll,
      [activeRoll]: trainingStages,
    };

    const headers = [
      "Roll_No",
      "Full_Name",
      "IITM_Email",
      "Account_Status",
      "Level_1_Marks",
      "Level_1_Max",
      "Level_1_Status",
      "Level_1_Stages",
      "Level_2_Marks",
      "Level_2_Max",
      "Level_2_Status",
      "Level_2_Stages",
      "Level_3_Tech_Test",
      "Level_3_AI_Mock",
      "Level_3_Viva_SignOff",
      "IIC_Approved_Points",
      "IIC_Pending_Count",
      "IIC_Activities",
      "Quiz_Badges_Count",
      "Quiz_Badges",
      "Viva_Slot",
      "Assigned_Examiner",
      "Prog_Rating",
      "DS_Rating",
      "Comm_Rating",
      "Placement_Ready_Verdict",
      "Examiner_Remarks",
    ];

    const rows = Array.from(studentMap.values()).map((st) => {
      const stages = allStagesMap[st.roll] || INITIAL_TRAINING_STAGES;
      const l1 = stages.filter((s) => s.level === 1);
      const l2 = stages.filter((s) => s.level === 2);
      const l1Obt = l1.reduce((acc, s) => acc + s.obtainedMarks, 0);
      const l1Max = l1.reduce((acc, s) => acc + s.maxMarks, 0) || 120;
      const l2Obt = l2.reduce((acc, s) => acc + s.obtainedMarks, 0);
      const l2Max = l2.reduce((acc, s) => acc + s.maxMarks, 0) || 80;
      const l3s1 = stages.find((s) => s.id === "L3-S1");
      const l3s2 = stages.find((s) => s.id === "L3-S2");
      const l3s3 = stages.find((s) => s.id === "L3-S3");

      const subs = activitySubmissions.filter(
        (sub) => String(sub.studentEmail || "").split("@")[0].trim().toUpperCase() === st.roll
      );
      const approvedSubs = subs.filter((s) => s.reviewStatus === "APPROVED");
      const pendingSubs = subs.filter((s) => s.reviewStatus === "PENDING_COORDINATOR");
      const approvedPts = approvedSubs.reduce((acc, s) => {
        const cat = ACTIVITY_CATALOG.find((c) => c.id === s.activityId);
        return acc + (cat?.points || 0);
      }, 0);

      const studentBadges = badges;

      const ev = evaluations.find(
        (e) => String(e.studentRoll || "").trim().toUpperCase() === st.roll
      );
      const slot = oneOnOneSlots.find(
        (sl) => String(sl.studentEmail || "").split("@")[0].trim().toUpperCase() === st.roll
      );

      return [
        st.roll,
        st.fullName,
        st.email,
        st.status,
        l1Obt,
        l1Max,
        l1Obt >= Math.round(l1Max * 0.8) ? "PASSED" : "IN_PROGRESS",
        l1.map((s) => `${s.id}:${s.obtainedMarks}/${s.maxMarks}`).join(" | "),
        l2Obt,
        l2Max,
        l2Obt >= Math.round(l2Max * 0.6) ? "PASSED" : "IN_PROGRESS",
        l2.map((s) => `${s.id}:${s.obtainedMarks}/${s.maxMarks}`).join(" | "),
        l3s1 ? `${l3s1.obtainedMarks}/${l3s1.maxMarks} (${l3s1.statusText})` : "0/25",
        l3s2 ? l3s2.statusText : "Pending",
        ev?.isPlacementReady ? "Yes" : l3s3?.statusText || "Pending",
        approvedPts,
        pendingSubs.length,
        subs.map((s) => {
          const cat = ACTIVITY_CATALOG.find((c) => c.id === s.activityId);
          return `${cat?.title || s.activityId} [${s.reviewStatus}]`;
        }).join(" | "),
        studentBadges.length,
        studentBadges.map((b) => `${b.skillName} (${b.scorePct}%)`).join(" | "),
        slot ? `${slot.date} ${slot.slotTime}` : "Not Scheduled",
        ev?.examinerEmail || slot?.instructor || "Unassigned",
        ev ? `${ev.programmingRating}/5` : "-",
        ev ? `${ev.dataScienceRating}/5` : "-",
        ev ? `${ev.communicationRating}/5` : "-",
        ev ? (ev.isPlacementReady ? "PLACEMENT_READY" : "REMEDIAL_ASSIGNED") : "PENDING_VIVA",
        ev?.notes || "",
      ]
        .map(escapeCsv)
        .join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `iitm_full_student_training_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    appendAudit(
      user?.email || "admin@iitm.ac.in",
      user?.role || "ADMIN",
      "FULL_TRAINING_REPORT_EXPORT",
      `Downloaded consolidated training & readiness CSV for ${rows.length} student(s)`,
      "SUCCESS"
    );
    setAdminCommandAlert({
      type: "OK",
      text: `Downloaded full training & readiness report for ${rows.length} student(s).`,
    });
    setCoordFeedback({
      type: "OK",
      text: `Downloaded full training & readiness CSV report for ${rows.length} student(s).`,
    });
  };

  const isPersistedUuid = (val: string) => val.includes("-") && val.length >= 32;

  const handleAdminCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNewFullName.trim() || !adminNewEmail.trim() || !adminNewOrgOrDept.trim()) {
      setAdminCommandAlert({
        type: "ERR",
        text: "Full Name, Email, and Department/Organization are required to create a stakeholder record.",
      });
      return;
    }
    const cleanName = adminNewFullName.trim();
    const cleanEmail = adminNewEmail.trim().toLowerCase();
    const cleanOrg = adminNewOrgOrDept.trim();
    let finalId = `REG-${Math.floor(200 + Math.random() * 800)}`;

    if (authToken) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            email: cleanEmail,
            full_name: cleanName,
            role: toBackendRole(adminNewRole),
            organization_or_dept: cleanOrg,
            approval_status: adminNewStatus,
            password: "123456",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Failed to persist stakeholder record." }));
          setAdminCommandAlert({ type: "ERR", text: err.detail || "PostgreSQL create failed." });
          return;
        }
        const saved = await res.json();
        if (saved?.user_id) {
          finalId = saved.user_id;
        }
      } catch {
        // Fallback to local state if backend unreachable
      }
    }

    const created: RegistrationRequestRecord = {
      id: finalId,
      fullName: cleanName,
      email: cleanEmail,
      password: "123456",
      role: adminNewRole,
      orgOrDept: cleanOrg,
      status: adminNewStatus,
      paymentStatus: adminNewRole === "STUDENT" ? "PAID" : "NOT_REQUIRED",
      submittedAt: new Date().toLocaleTimeString("en-IN", { hour12: false }),
      reviewedBy: user?.email || "placement.admin@iitm.ac.in",
    };
    setRegistrations((prev) => [created, ...prev]);
    appendAudit(
      user?.email || "placement.admin@iitm.ac.in",
      "ADMIN",
      "ADMIN_USER_CREATED",
      `${finalId} • ${created.fullName} (${created.role}) • Status: ${created.status}`,
      "SUCCESS"
    );
    setAdminNewFullName("");
    setAdminNewEmail("");
    setAdminNewOrgOrDept("");
    setAdminCommandAlert({
      type: "OK",
      text: `Created ${created.role} account ${created.fullName} (${finalId}).`,
    });
  };

  const handleAdminStartEditUser = (reg: RegistrationRequestRecord) => {
    setEditingRegId(reg.id);
    setEditRegDraft({
      fullName: reg.fullName,
      email: reg.email,
      role: reg.role,
      orgOrDept: reg.orgOrDept,
      status: reg.status,
    });
  };

  const handleAdminSaveEditUser = async (regId: string) => {
    if (!editRegDraft.fullName.trim() || !editRegDraft.email.trim()) {
      setAdminCommandAlert({ type: "ERR", text: "Name and Email cannot be empty." });
      return;
    }
    const cleanName = editRegDraft.fullName.trim();
    const cleanEmail = editRegDraft.email.trim().toLowerCase();
    const cleanOrg = editRegDraft.orgOrDept.trim();

    if (authToken && isPersistedUuid(regId)) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${encodeURIComponent(regId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            full_name: cleanName,
            email: cleanEmail,
            role: toBackendRole(editRegDraft.role),
            organization_or_dept: cleanOrg,
            approval_status: editRegDraft.status,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Failed to update stakeholder record." }));
          setAdminCommandAlert({ type: "ERR", text: err.detail || "PostgreSQL update failed." });
          return;
        }
      } catch {
        // Fallback to local state if backend unreachable
      }
    }

    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === regId
          ? {
              ...r,
              fullName: cleanName,
              email: cleanEmail,
              role: editRegDraft.role,
              orgOrDept: cleanOrg,
              status: editRegDraft.status,
              reviewedBy: user?.email || "placement.admin@iitm.ac.in",
            }
          : r
      )
    );
    appendAudit(
      user?.email || "placement.admin@iitm.ac.in",
      "ADMIN",
      "ADMIN_USER_UPDATED",
      `${regId} -> ${cleanName} (${editRegDraft.role} • ${editRegDraft.status})`,
      "SUCCESS"
    );
    setEditingRegId(null);
    setAdminCommandAlert({ type: "OK", text: `Updated stakeholder record ${regId}.` });
  };

  const handleAdminDeleteUser = async (reg: RegistrationRequestRecord) => {
    if (authToken && isPersistedUuid(reg.id)) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${encodeURIComponent(reg.id)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Failed to delete stakeholder record." }));
          setAdminCommandAlert({ type: "ERR", text: err.detail || "PostgreSQL delete failed." });
          return;
        }
      } catch {
        // Fallback to local state if backend unreachable
      }
    }

    setRegistrations((prev) => prev.filter((r) => r.id !== reg.id));
    appendAudit(
      user?.email || "placement.admin@iitm.ac.in",
      "ADMIN",
      "ADMIN_USER_DELETED",
      `Deleted ${reg.id} • ${reg.fullName} (${reg.role})`,
      "SUCCESS"
    );
    setAdminCommandAlert({
      type: "OK",
      text: `Deleted ${reg.role} record ${reg.fullName} (${reg.id}).`,
    });
  };

  const handleAdminStartEditJob = (job: JobDriveItem) => {
    setEditingJobId(job.id);
    setEditJobDraft({
      companyName: job.companyName,
      title: job.title,
      domain: job.domain,
      roleType: job.roleType,
      compensation: job.compensation,
      minCgpa: String(job.minCgpa),
    });
  };

  const handleAdminSaveEditJob = async (jobId: string) => {
    const cleanCompany = editJobDraft.companyName.trim();
    const cleanTitle = editJobDraft.title.trim();
    const cleanComp = editJobDraft.compensation.trim();
    const parsedCgpa = parseFloat(editJobDraft.minCgpa);

    if (authToken && isPersistedUuid(jobId)) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/recruitment/jobs/${encodeURIComponent(jobId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            company_name: cleanCompany || undefined,
            title: cleanTitle || undefined,
            domain: editJobDraft.domain,
            role_type: editJobDraft.roleType,
            compensation_label: cleanComp || undefined,
            min_cgpa: Number.isFinite(parsedCgpa) ? parsedCgpa : undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Failed to update job drive." }));
          setAdminCommandAlert({ type: "ERR", text: err.detail || "PostgreSQL drive update failed." });
          return;
        }
      } catch {
        // Fallback to local state if backend unreachable
      }
    }

    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              companyName: cleanCompany || j.companyName,
              title: cleanTitle || j.title,
              domain: editJobDraft.domain,
              roleType: editJobDraft.roleType,
              compensation: cleanComp || j.compensation,
              minCgpa: Number.isFinite(parsedCgpa) ? parsedCgpa : j.minCgpa,
            }
          : j
      )
    );
    appendAudit(
      user?.email || "placement.admin@iitm.ac.in",
      "ADMIN",
      "ADMIN_DRIVE_UPDATED",
      `Updated drive ${jobId} (${cleanCompany} — ${cleanTitle})`,
      "SUCCESS"
    );
    setEditingJobId(null);
    setAdminCommandAlert({ type: "OK", text: `Updated job drive ${jobId}.` });
  };

  const handleAdminDeleteJob = async (job: JobDriveItem) => {
    if (authToken && isPersistedUuid(job.id)) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/recruitment/jobs/${encodeURIComponent(job.id)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Failed to delete job drive." }));
          setAdminCommandAlert({ type: "ERR", text: err.detail || "PostgreSQL drive delete failed." });
          return;
        }
      } catch {
        // Fallback to local state if backend unreachable
      }
    }

    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    appendAudit(
      user?.email || "placement.admin@iitm.ac.in",
      "ADMIN",
      "ADMIN_DRIVE_DELETED",
      `Deleted drive ${job.jobCode} (${job.companyName} — ${job.title})`,
      "SUCCESS"
    );
    setAdminCommandAlert({
      type: "OK",
      text: `Removed job drive ${job.jobCode} (${job.companyName}).`,
    });
  };

  const [registrations, setRegistrations] = useState<RegistrationRequestRecord[]>([
    {
      id: "REG-101",
      fullName: "Test Student (22F3001013)",
      email: "22f3001013@ds.study.iitm.ac.in",
      role: "STUDENT",
      orgOrDept: "BS Data Science • Roll 22F3001013",
      password: "123456",
      status: "APPROVED",
      submittedAt: "2026-11-10 09:15 IST",
      reviewedBy: "placement.admin@iitm.ac.in",
    },
    {
      id: "REG-102",
      fullName: "Shyam (Viva Examiner)",
      email: "shyam@ds.iitm.ac.in",
      role: "EXAMINER",
      orgOrDept: "Technical Viva & Assessment Panel",
      password: "123456",
      status: "APPROVED",
      submittedAt: "2026-11-11 11:00 IST",
      reviewedBy: "placement.admin@iitm.ac.in",
    },
    {
      id: "REG-103",
      fullName: "Ricoh India HR",
      email: "lalit@iit.in",
      role: "RECRUITER",
      orgOrDept: "Ricoh India • Talent Acquisition",
      password: "123456",
      status: "APPROVED",
      submittedAt: "2026-11-11 14:20 IST",
      reviewedBy: "placement.admin@iitm.ac.in",
    },
    {
      id: "REG-103B",
      fullName: "Lalit (Swiggy Talent Partner)",
      email: "lalit@iit.in",
      role: "RECRUITER",
      orgOrDept: "Swiggy • Campus & Lateral Hiring",
      password: "123456",
      status: "APPROVED",
      submittedAt: "2026-11-11 15:10 IST",
      reviewedBy: "placement.admin@iitm.ac.in",
    },
    {
      id: "REG-106",
      fullName: "Dr. Meera Nair (Training Coordinator)",
      email: "coordinator@study.iitm.ac.in",
      role: "TRAINING_COORDINATOR",
      orgOrDept: "IITM BS Career Readiness & Training Cell",
      password: "123456",
      status: "APPROVED",
      submittedAt: "2026-11-11 16:00 IST",
      reviewedBy: "placement.admin@iitm.ac.in",
    },
    {
      id: "REG-104",
      fullName: "Aarav Sharma",
      email: "22f3001234@ds.study.iitm.ac.in",
      role: "STUDENT",
      orgOrDept: "BS Data Science • Roll 22F3001234",
      password: "123456",
      status: "APPROVED",
      submittedAt: "2026-11-12 09:30 IST",
      reviewedBy: "placement.admin@iitm.ac.in",
    },
    {
      id: "REG-105",
      fullName: "Rohan Deshmukh",
      email: "23f1004512@ds.study.iitm.ac.in",
      role: "STUDENT",
      orgOrDept: "BS Data Science • Roll 23F1004512",
      password: "123456",
      status: "PENDING",
      submittedAt: "2026-11-18 10:05 IST",
    },
  ]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("RECRUITMENT");
  const [editingRecruiterProfile, setEditingRecruiterProfile] = useState(false);
  const [recruiterEditDraft, setRecruiterEditDraft] = useState<RecruiterOnboardingDetails | null>(null);


  // Increment 1: Complete Student Registration Dossier
  const [fullName, setFullName] = useState("Aarav Sharma");
  const [cgpaInput, setCgpaInput] = useState("8.92");
  const [programLevel, setProgramLevel] = useState<ProgramLevelOption>("BSC");
  const [activeBacklogs, setActiveBacklogs] = useState<number>(0);
  const [isPlaced, setIsPlaced] = useState<boolean>(false);
  const [gender, setGender] = useState("Male");
  const [mobileNumber, setMobileNumber] = useState("+91 9876543210");
  const [personalEmail, setPersonalEmail] = useState("aarav.sharma@gmail.com");
  const [stateName, setStateName] = useState("Maharashtra");
  const [category, setCategory] = useState<CategoryOption>("GENERAL");
  const [degreeType, setDegreeType] = useState<DegreeTypeOption>("STANDALONE");
  const [studentTargetDomain, setStudentTargetDomain] = useState<QuizDomainOption>("DATA_SCIENCE");
  const [studentApplyingTrack, setStudentApplyingTrack] = useState<StudentTrackOption>("INTERNSHIP");
  const [trainingStages, setTrainingStages] = useState<TrainingStageScore[]>(INITIAL_TRAINING_STAGES);
  const [trainingStagesByRoll, setTrainingStagesByRoll] = useState<Record<string, TrainingStageScore[]>>({});
  const [activitySubmissions, setActivitySubmissions] = useState<ActivitySubmission[]>([]);
  const [selectedActivityToLog, setSelectedActivityToLog] = useState<string>("T22-KAG-1");
  const [activityProofUrl, setActivityProofUrl] = useState<string>("");
  const [activityEvidenceLabel, setActivityEvidenceLabel] = useState<string>("");
  const [activityCompletedDate, setActivityCompletedDate] = useState<string>("2026-11-15");
  const [activityAlert, setActivityAlert] = useState<string | null>(null);
  const [coordTargetRoll, setCoordTargetRoll] = useState<string>("21F3001013");
  const [coordFeedback, setCoordFeedback] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);
  const coordCsvInputRef = useRef<HTMLInputElement | null>(null);  const [isWorkingProf, setIsWorkingProf] = useState<boolean>(false);
  const [yearsExp, setYearsExp] = useState("2.0");
  const [workDomain, setWorkDomain] = useState<WorkDomainOption>("DATA_SCIENCE");
  const [presentCompany, setPresentCompany] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [currentCtc, setCurrentCtc] = useState("");
  const [regAlert, setRegAlert] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);

  // Increment 1: Developer Handles & BS Marksheet
  const [linkedinId, setLinkedinId] = useState("aarav-sharma-iitm");
  const [githubUsername, setGithubUsername] = useState("aarav-ds-iitm");
  const [kaggleUsername, setKaggleUsername] = useState("aaravml");
  const [handlesSavedBanner, setHandlesSavedBanner] = useState<string | null>(null);

  const [marksheet, setMarksheet] = useState<MarksheetRecord | null>(null);
  const [marksheetDriveUrl, setMarksheetDriveUrl] = useState<string>("");
  const [marksheetAlert, setMarksheetAlert] = useState<string | null>(null);

  // Increment 1: Resume Vault (3 Google Drive Resume Links — isolated per student roll)
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [newResumeTitle, setNewResumeTitle] = useState("");
  const [newResumeDriveUrl, setNewResumeDriveUrl] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [vaultAlert, setVaultAlert] = useState<string | null>(null);
  const [previewSubmission, setPreviewSubmission] = useState<ActivitySubmission | null>(null);
  const [driveDocPreview, setDriveDocPreview] = useState<{ title: string; subtitle: string; url: string } | null>(null);

  // Increment 2: Question Bank Database + Random 15-Question Quiz Engine
  const [questionBank, setQuestionBank] = useState<BankQuestionItem[]>(buildInitialQuestionBank);
  const [tracks, setTracks] = useState<TrainingTrack[]>(INITIAL_TRACKS);
  const [activeTrackId, setActiveTrackId] = useState<string>(INITIAL_TRACKS[0].id);
  const [drawnQuestions, setDrawnQuestions] = useState<BankQuestionItem[]>([]);
  const [isQuizActive, setIsQuizActive] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(QUIZ_DURATION_SECONDS);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizBanner, setQuizBanner] = useState<{
    type: "PASS" | "FAIL" | "BLOCKED";
    text: string;
  } | null>(null);
  const [badges, setBadges] = useState<SkillBadgeItem[]>([]);

  // Question Bank Builder State
  const [qbDomain, setQbDomain] = useState<QuizDomainOption>("DATA_SCIENCE");
  const [qbTrack, setQbTrack] = useState<QuizTrackOption>("INTERNSHIP");
  const [qbPrompt, setQbPrompt] = useState("");
  const [qbOpt0, setQbOpt0] = useState("");
  const [qbOpt1, setQbOpt1] = useState("");
  const [qbOpt2, setQbOpt2] = useState("");
  const [qbOpt3, setQbOpt3] = useState("");
  const [qbCorrectIdx, setQbCorrectIdx] = useState<number>(0);

  const [bulkQDomain, setBulkQDomain] = useState<QuizDomainOption>("DATA_SCIENCE");
  const [bulkQTrack, setBulkQTrack] = useState<QuizTrackOption>("INTERNSHIP");
  const [bulkQMode, setBulkQMode] = useState<"APPEND" | "REPLACE">("APPEND");
  const [bulkSheetUrl, setBulkSheetUrl] = useState<string>("");
  const [bulkQStatus, setBulkQStatus] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);
  const [bulkImporting, setBulkImporting] = useState<boolean>(false);

  const parseQuestionRows = (
    rows: string[][],
    defaultDomain: QuizDomainOption,
    defaultTrack: QuizTrackOption
  ) => {
    const parsed: typeof questionBank = [];
    const errors: string[] = [];
    if (!rows.length) return { parsed, errors: ["Spreadsheet is empty."] };

    const firstRowLower = rows[0].map((c) => String(c || "").trim().toLowerCase());
    const hasHeader =
      firstRowLower.some((c) => c.includes("question") || c.includes("prompt")) &&
      firstRowLower.some((c) => c.includes("option") || c.includes("answer") || c.includes("correct"));

    const colIdx = {
      prompt: -1,
      optA: -1,
      optB: -1,
      optC: -1,
      optD: -1,
      correct: -1,
      domain: -1,
      track: -1,
    };

    if (hasHeader) {
      firstRowLower.forEach((h, idx) => {
        if (colIdx.prompt === -1 && (h.includes("question") || h.includes("prompt"))) colIdx.prompt = idx;
        else if (colIdx.optA === -1 && (h === "a" || h.includes("option a") || h.includes("option_a") || h.includes("opt1") || h.includes("option 1"))) colIdx.optA = idx;
        else if (colIdx.optB === -1 && (h === "b" || h.includes("option b") || h.includes("option_b") || h.includes("opt2") || h.includes("option 2"))) colIdx.optB = idx;
        else if (colIdx.optC === -1 && (h === "c" || h.includes("option c") || h.includes("option_c") || h.includes("opt3") || h.includes("option 3"))) colIdx.optC = idx;
        else if (colIdx.optD === -1 && (h === "d" || h.includes("option d") || h.includes("option_d") || h.includes("opt4") || h.includes("option 4"))) colIdx.optD = idx;
        else if (colIdx.correct === -1 && (h.includes("correct") || h.includes("answer") || h === "ans")) colIdx.correct = idx;
        else if (colIdx.domain === -1 && h.includes("domain")) colIdx.domain = idx;
        else if (colIdx.track === -1 && h.includes("track")) colIdx.track = idx;
      });
    }

    const dataRows = hasHeader ? rows.slice(1) : rows;
    dataRows.forEach((rawRow, rIdx) => {
      const cells = rawRow.map((c) => String(c ?? "").trim());
      if (cells.every((c) => !c)) return;

      const pIdx = colIdx.prompt >= 0 ? colIdx.prompt : 0;
      const aIdx = colIdx.optA >= 0 ? colIdx.optA : 1;
      const bIdx = colIdx.optB >= 0 ? colIdx.optB : 2;
      const cIdx = colIdx.optC >= 0 ? colIdx.optC : 3;
      const dIdx = colIdx.optD >= 0 ? colIdx.optD : 4;
      const ansIdx = colIdx.correct >= 0 ? colIdx.correct : 5;

      const prompt = cells[pIdx] || "";
      const opts: [string, string, string, string] = [
        cells[aIdx] || "",
        cells[bIdx] || "",
        cells[cIdx] || "",
        cells[dIdx] || "",
      ];
      const rawAns = (cells[ansIdx] || "").trim();

      if (!prompt || opts.some((o) => !o) || !rawAns) {
        errors.push(`Row ${rIdx + (hasHeader ? 2 : 1)}: Missing question, one of the 4 options, or correct answer.`);
        return;
      }

      let correctIndex = -1;
      const ansUpper = rawAns.toUpperCase();
      if (ansUpper === "A" || ansUpper === "OPTION A" || ansUpper === "1") correctIndex = 0;
      else if (ansUpper === "B" || ansUpper === "OPTION B" || ansUpper === "2") correctIndex = 1;
      else if (ansUpper === "C" || ansUpper === "OPTION C" || ansUpper === "3") correctIndex = 2;
      else if (ansUpper === "D" || ansUpper === "OPTION D" || ansUpper === "4") correctIndex = 3;
      else {
        const matchedOptIdx = opts.findIndex((o) => o.toLowerCase() === rawAns.toLowerCase());
        if (matchedOptIdx >= 0) correctIndex = matchedOptIdx;
      }

      if (correctIndex < 0 || correctIndex > 3) {
        errors.push(`Row ${rIdx + (hasHeader ? 2 : 1)}: Invalid correct answer "${rawAns}" (use A/B/C/D, 1-4, or exact option text).`);
        return;
      }

      let rowDomain: QuizDomainOption = defaultDomain;
      if (colIdx.domain >= 0 && cells[colIdx.domain]) {
        const dVal = cells[colIdx.domain].toUpperCase();
        if (dVal.includes("SOFTWARE") || dVal === "SD" || dVal === "SDE") rowDomain = "SOFTWARE_DEVELOPMENT";
        else if (dVal.includes("DATA") || dVal === "DS") rowDomain = "DATA_SCIENCE";
      }

      let rowTrack: QuizTrackOption = defaultTrack;
      if (colIdx.track >= 0 && cells[colIdx.track]) {
        const tVal = cells[colIdx.track].toUpperCase();
        if (tVal.includes("FULL") || tVal.includes("SOFTWARE") || tVal === "FT" || tVal === "FTE" || tVal === "PLACEMENT" || tVal === "SDE") {
          rowTrack = "SOFTWARE_DEVELOPMENT";
        } else if (tVal.includes("INTERN")) {
          rowTrack = "INTERNSHIP";
        }
      }

      parsed.push({
        id: `QB-IMP-${Date.now()}-${rIdx}-${Math.random().toString(36).slice(2, 6)}`,
        domain: rowDomain,
        track: rowTrack,
        prompt,
        options: opts,
        correctIndex,
      });
    });

    return { parsed, errors };
  };

  const applyImportedQuestions = (parsed: typeof questionBank, errors: string[], sourceLabel: string) => {
    if (!parsed.length) {
      setBulkQStatus({
        type: "ERR",
        text: errors[0] || "No valid questions found. Verify columns: Question, Option A, Option B, Option C, Option D, Correct Answer.",
      });
      return;
    }
    setQuestionBank((prev) => {
      if (bulkQMode === "REPLACE") {
        const affectedCombos = new Set(parsed.map((q) => `${q.domain}::${q.track}`));
        const kept = prev.filter((q) => !affectedCombos.has(`${q.domain}::${q.track}`));
        return [...kept, ...parsed];
      }
      return [...prev, ...parsed];
    });
    const bankName = `${bulkQDomain === "DATA_SCIENCE" ? "Data Science" : "Software Development"} — ${
      bulkQTrack === "INTERNSHIP" ? "Internship" : "Full-Time Placement"
    }`;
    setBulkQStatus({
      type: "OK",
      text: `${bulkQMode === "REPLACE" ? "Replaced" : "Imported"} ${parsed.length} question(s) into ${bankName} from ${sourceLabel}${
        errors.length ? ` (${errors.length} row(s) skipped)` : ""
      }.`,
    });
    appendAudit(
      user?.email || "coordinator@study.iitm.ac.in",
      user?.role || "TRAINING_COORDINATOR",
      "QUIZ_BANK_BULK_IMPORT",
      `${parsed.length} Qs loaded (${bulkQMode}) from ${sourceLabel}`,
      "SUCCESS"
    );
  };

  const handleQuestionBankFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkImporting(true);
    setBulkQStatus(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, defval: "" });
      const { parsed, errors } = parseQuestionRows(rows, bulkQDomain, bulkQTrack);
      applyImportedQuestions(parsed, errors, file.name);
    } catch {
      setBulkQStatus({
        type: "ERR",
        text: `Failed to parse "${file.name}". Upload a valid .csv, .xlsx, or .xls spreadsheet.`,
      });
    } finally {
      setBulkImporting(false);
      e.target.value = "";
    }
  };

  const handleQuestionBankSheetUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawUrl = bulkSheetUrl.trim();
    if (!rawUrl) {
      setBulkQStatus({ type: "ERR", text: "Paste a Google Sheets share link or direct CSV/XLSX spreadsheet URL." });
      return;
    }
    setBulkImporting(true);
    setBulkQStatus(null);
    try {
      let fetchUrl = rawUrl;
      const gsheetMatch = rawUrl.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (gsheetMatch) {
        const sheetId = gsheetMatch[1];
        const gidMatch = rawUrl.match(/[?#&]gid=(\d+)/);
        const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : "";
        fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
      }
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html")) throw new Error("PRIVATE_SHEET");

      const buffer = await res.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, defval: "" });
      const { parsed, errors } = parseQuestionRows(rows, bulkQDomain, bulkQTrack);
      applyImportedQuestions(parsed, errors, gsheetMatch ? "Google Spreadsheet Link" : "Spreadsheet URL");
      if (parsed.length) setBulkSheetUrl("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message === "PRIVATE_SHEET"
          ? "Spreadsheet is private or requires sign-in. Set sharing to 'Anyone with the link can view' (or File -> Share -> Publish to web as CSV) and retry."
          : "Could not fetch spreadsheet from link (ensure link is publicly accessible or upload the .csv/.xlsx file directly).";
      setBulkQStatus({ type: "ERR", text: msg });
    } finally {
      setBulkImporting(false);
    }
  };

  const handleDownloadSampleQuestionCsv = () => {
    const sampleCsv = [
      "Question,Option A,Option B,Option C,Option D,Correct Answer,Domain,Track",
      '"Which SQL window function assigns consecutive ranks without gaps for ties?","RANK()","DENSE_RANK()","ROW_NUMBER()","NTILE(4)","B","DATA_SCIENCE","INTERNSHIP"',
      '"What is the worst-case time complexity of quicksort?","O(n log n)","O(n)","O(n^2)","O(log n)","C","SOFTWARE_DEVELOPMENT","FULL_TIME"',
    ].join("\n");
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iitm_quiz_question_bank_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const [qbBanner, setQbBanner] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);

  // Increment 2: Final Stage Examiner Interview Evaluation State
  const [evalSkillsets, setEvalSkillsets] = useState("Python, SQL, FastAPI, Machine Learning");
  const [progRating, setProgRating] = useState<number>(4);
  const [dsRating, setDsRating] = useState<number>(4);
  const [commRating, setCommRating] = useState<number>(4);
  const [isPlacementReady, setIsPlacementReady] = useState<boolean>(true);
  const [performingExceptionallyGood, setPerformingExceptionallyGood] = useState<boolean>(false);
  const [remedialTasksText, setRemedialTasksText] = useState(
    "1. Solve 25 medium DSA graph & DP problems\n2. Complete 2 mock system design interviews"
  );
  const [examinerNotes, setExaminerNotes] = useState("");
  const [evalBanner, setEvalBanner] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);
  const [evaluations, setEvaluations] = useState<ExaminerEvaluationRecord[]>(() => {
    try {
      const raw = localStorage.getItem("iitm_os_examiner_evaluations_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [examinerSlots, setExaminerSlots] = useState<
    Array<{
      id: string;
      instructor: string;
      instructorEmail: string;
      date: string;
      slotTime: string;
      domain: string;
      status: "OPEN" | "REQUESTED" | "ALLOTTED";
      requestedByEmail?: string;
      requestedByName?: string;
    }>
  >(() => {
    try {
      const saved = localStorage.getItem("iitm_examiner_slots_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("iitm_examiner_slots_v1", JSON.stringify(examinerSlots));
    } catch {}
  }, [examinerSlots]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "iitm_examiner_slots_v1" && e.newValue) {
        try {
          setExaminerSlots(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const syncLatestSnapshot = async () => {
      try {
        const rollParam = encodeURIComponent(resolveActiveStudentRoll());
        const res = await fetch(`${API_BASE_URL}/api/v1/portal-state/bootstrap?student_roll=${rollParam}`);
        if (!res.ok) return;
        const data = await res.json();
        const snap = data?.snapshot || {};
        if (Array.isArray(snap.evaluations)) setEvaluations(dedupeEvaluationsByRoll(snap.evaluations));
        if (Array.isArray(snap.oneOnOneSlots) && snap.oneOnOneSlots.length > 0) {
          setOneOnOneSlots(snap.oneOnOneSlots);
        }
        if (Array.isArray(snap.examinerSlots) && snap.examinerSlots.length > 0) {
          setExaminerSlots(snap.examinerSlots);
        }
        if (Array.isArray(snap.questionBank) && snap.questionBank.length > 0) {
          setQuestionBank(mergeSeededQuestionBank(snap.questionBank));
        }
        if (Array.isArray(data.activitySubmissions)) {
          setActivitySubmissions(data.activitySubmissions);
        }
      } catch {}
    };
    const onFocus = () => { void syncLatestSnapshot(); };
    const onVisible = () => { if (document.visibilityState === "visible") void syncLatestSnapshot(); };
    const pollId = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncLatestSnapshot();
    }, 8000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(pollId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  const [oneOnOneSlots, setOneOnOneSlots] = useState<OneOnOneSlotRecord[]>(() => {
    try {
      const raw = localStorage.getItem("iitm_os_one_on_one_slots_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: "SLOT-1001",
        studentEmail: "22f3001842@ds.study.iitm.ac.in",
        studentName: "Aarav Sharma",
        date: "2026-11-22",
        slotTime: "10:30 AM - 11:00 AM IST",
        instructor: "Dr. R. Subramanian",
        status: "SCHEDULED",
      },
    ];
  });
  const [selectedSlotIdForEval, setSelectedSlotIdForEval] = useState<string>("");
  const [slotUploadAlert, setSlotUploadAlert] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);
  const [slotPasteText, setSlotPasteText] = useState("");
  const [slotProgressFilter, setSlotProgressFilter] = useState<"ALL" | "SCHEDULED" | "COMPLETED">("ALL");
  const [examinerSlotScope, setExaminerSlotScope] = useState<"MINE" | "ALL">("MINE");
  const [manualSlotEmail, setManualSlotEmail] = useState("");
  const [manualSlotName, setManualSlotName] = useState("");
  const [manualSlotDate, setManualSlotDate] = useState("");
  const [manualSlotTime, setManualSlotTime] = useState("");
  const [manualSlotInstructor, setManualSlotInstructor] = useState("");



  // Increment 3: Recruitment, Job Postings & Application Eligibility Engine
  const [jobs, setJobs] = useState<JobDriveItem[]>(() => {
    try {
      const raw = localStorage.getItem("iitm_os_jobs_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_JOBS;
  });
  const [newWorkMode, setNewWorkMode] = useState<"HYBRID" | "ONSITE" | "REMOTE">("HYBRID");
  const [newOpeningsCount, setNewOpeningsCount] = useState("4");
  const [newApplicationDeadline, setNewApplicationDeadline] = useState("2026-12-15");
  const [newSelectionRounds, setNewSelectionRounds] = useState(
    "Resume Shortlist → Online Coding/Aptitude Test → 2 Technical Rounds → HR"
  );
  const [newRequiredSkillsInput, setNewRequiredSkillsInput] = useState("Python, SQL, Problem Solving");
  const [newMaxBacklogs, setNewMaxBacklogs] = useState("0");
  const [newJdText, setNewJdText] = useState("");
  const [newJdPdfName, setNewJdPdfName] = useState("");
  const [newJdPdfDataUrl, setNewJdPdfDataUrl] = useState("");
  const [activeJdModalJob, setActiveJdModalJob] = useState<JobDriveItem | null>(null);
  const [opportunityTrackFilter, setOpportunityTrackFilter] = useState<"ALL" | "INTERNSHIP" | "FULL_TIME">("ALL");
  const [opportunityDomainFilter, setOpportunityDomainFilter] = useState<"ALL" | QuizDomainOption>("ALL");
  const [opportunitySearchQuery, setOpportunitySearchQuery] = useState("");
  const [_recruiterCandidateDossier, setRecruiterCandidateDossier] = useState<{
    loading: boolean;
    error: string | null;
    data: any | null;
    inlineDoc: { title: string; url: string } | null;
  } | null>(null);

  const handleOpenRecruiterCandidateDossier = async (studentRoll: string, studentName: string) => {
    const cleanRoll = (studentRoll || "").trim().toUpperCase();
    setRecruiterCandidateDossier({ loading: true, error: null, data: null, inlineDoc: null });
    try {
      const token = localStorage.getItem("iitm_os_access_token") || "";
      const res = await fetch(
        `${API_BASE_URL}/api/v1/students/dossier/${encodeURIComponent(cleanRoll)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRecruiterCandidateDossier({ loading: false, error: null, data, inlineDoc: null });
    } catch (err: any) {
      setRecruiterCandidateDossier({
        loading: false,
        error: err?.message || `Unable to load dossier for ${studentName} (${cleanRoll})`,
        data: null,
        inlineDoc: null,
      });
    }
  };

  const [recruiterWorkspaceView, setRecruiterWorkspaceView] = useState<"MY_DRIVES" | "POST_DRIVE" | "ATS_PIPELINE">("MY_DRIVES");
  const recruiterShowAllDrives = false;

  useEffect(() => {
    try {
      localStorage.setItem("iitm_os_one_on_one_slots_v1", JSON.stringify(oneOnOneSlots));
      localStorage.setItem("iitm_os_jobs_v1", JSON.stringify(jobs));
    } catch {}
  }, [oneOnOneSlots, jobs]);
  const [applications, setApplications] = useState<JobApplicationRecord[]>(() => {
    try {
      const raw = localStorage.getItem("iitm_os_applications_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [selectedResumeIdForApply, setSelectedResumeIdForApply] = useState<string>("res-1");
  const [interviews, setInterviews] = useState<InterviewScheduleRecord[]>(() => {
    try {
      const raw = localStorage.getItem("iitm_os_interviews_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_INTERVIEWS;
  });
  const [offers, setOffers] = useState<OfferLetterRecord[]>(() => {
    try {
      const raw = localStorage.getItem("iitm_os_offers_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_OFFERS;
  });
  const [helpdeskTickets, setHelpdeskTickets] = useState<HelpdeskTicketRecord[]>([]);
  const [hdCategory, setHdCategory] = useState<string>("PLACEMENT");
  const [hdPriority, setHdPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [hdSubject, setHdSubject] = useState<string>("");
  const [hdDescription, setHdDescription] = useState<string>("");
  const [hdFilterStatus, setHdFilterStatus] = useState<string>("ALL");
  const [hdReplyDrafts, setHdReplyDrafts] = useState<Record<string, string>>({});
  const [jobAlert, setJobAlert] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);

  // Recruiter New Job Form
  const [newJobCode, setNewJobCode] = useState("DRV-2026-SWIGGY");
  const [newCompany, setNewCompany] = useState("Swiggy");
  const [newJobTitle, setNewJobTitle] = useState("Data Science Intern — Logistics");
  const [newRoleType, setNewRoleType] = useState<JobRoleTypeOption>("INTERNSHIP");
  const [newJobDomain, setNewJobDomain] = useState<QuizDomainOption | "">("");
  const [newLocation, setNewLocation] = useState("Bengaluru");
  const [newCompensation, setNewCompensation] = useState("₹60,000 / month");
  const [newMinCgpa, setNewMinCgpa] = useState("7.50");
  const [newRequireReady, setNewRequireReady] = useState(false);

  // Immutable Audit Trail
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([
    {
      id: "AUD-1001",
      timestamp: "08:00:00 IST",
      actor: "system@iitm.ac.in",
      role: "ADMIN",
      action: "PLATFORM_INITIALIZED",
      resource: "Increment 1 (Registration/Vault), Increment 2 (80-Q Bank/Examiner), Increment 3 (4 Drives/Eligibility Engine)",
      status: "SUCCESS",
    },
  ]);

  const [dbHydrated, setDbHydrated] = useState<boolean>(false);
  const [dbSyncStatus, setDbSyncStatus] = useState<"SYNCED" | "SYNCING" | "LOCAL_FALLBACK">("SYNCING");
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(JWT_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  // Restore active 30m sliding JWT session from FastAPI /api/v1/auth/me on mount
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            window.localStorage.removeItem(JWT_STORAGE_KEY);
            if (!cancelled) setAuthToken(null);
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const mappedRole = fromBackendRole(data.active_role);
        if (data.access_token) {
          window.localStorage.setItem(JWT_STORAGE_KEY, data.access_token);
          setAuthToken(data.access_token);
        }
        setUser({
          email: data.email,
          role: mappedRole,
          name: data.full_name,
        });
        setActiveTab(
          mappedRole === "ADMIN"
            ? "GOVERNANCE"
            : mappedRole === "RECRUITER"
            ? "RECRUITER_COMPANY"
            : mappedRole === "TRAINING_COORDINATOR" || mappedRole === "EXAMINER"
            ? "TRAINING"
            : "IDENTITY"
        );
      } catch {
        // Keep offline session if backend is unreachable
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load real PostgreSQL user registrations when Placement Admin signs in with a valid JWT
  useEffect(() => {
    if (!authToken || user?.role !== "ADMIN") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/registrations`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) return;
        const rows = await res.json();
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
        setRegistrations(
          rows
            .filter((r: Record<string, string>) => fromBackendRole(r.role) !== "ADMIN")
            .map((r: Record<string, string>) => ({
              id: r.user_id,
              fullName: r.full_name,
              email: r.email,
              role: fromBackendRole(r.role) as Exclude<Role, "ADMIN">,
              orgOrDept: r.organization_or_dept || "IITM BS Portal",
              password: "••••••••",
              status: (r.approval_status as RegistrationApprovalStatus) || "PENDING",
              submittedAt: r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : "PostgreSQL",
            }))
        );

        const auditRes = await fetch(`${API_BASE_URL}/api/v1/audit-logs?limit=150`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (auditRes.ok) {
          const auditRows = await auditRes.json();
          if (!cancelled && Array.isArray(auditRows) && auditRows.length > 0) {
            setAuditLogs(
              auditRows.map((a: Record<string, unknown>) => ({
                id: String(a.id || `AUD-${Math.random()}`),
                timestamp: a.created_at
                  ? new Date(String(a.created_at)).toLocaleTimeString("en-IN", { hour12: false })
                  : "PostgreSQL",
                actor: String(a.actor_id || "system@iitm.ac.in"),
                role: fromBackendRole(String(a.actor_role || "ADMIN")),
                action: String(a.action || "AUDIT_EVENT"),
                resource: `${String(a.entity_type || "Entity")} • ${String(a.entity_id || "")}`,
                status: "SUCCESS" as const,
              }))
            );
          }
        }
      } catch {
        // Retain snapshot fallback if offline
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken, user?.role]);

  const loadedRollRef = useRef<string | null>(null);

  useEffect(() => {
    if (user?.role !== "EXAMINER") return;
    const uName = (user.name || "").toLowerCase();
    const uPrefix = (user.email || "").split("@")[0].toLowerCase();
    const mySlots = oneOnOneSlots.filter((s) => {
      const inst = (s.instructor || "").toLowerCase();
      return (uName && (inst.includes(uName) || uName.includes(inst))) || (uPrefix && inst.includes(uPrefix));
    });
    const slot =
      mySlots.find((s) => s.id === selectedSlotIdForEval) ||
      mySlots.find((s) => s.status === "SCHEDULED") ||
      mySlots[0];
    if (slot?.studentEmail) {
      const derivedRoll = slot.studentEmail.split("@")[0].trim().toUpperCase();
      if (derivedRoll && derivedRoll !== coordTargetRoll) {
        setCoordTargetRoll(derivedRoll);
      }
    }
  }, [user?.role, user?.name, user?.email, selectedSlotIdForEval, oneOnOneSlots]);

  const resolveActiveStudentRoll = (): string => {
    if (user?.role === "STUDENT" && user.email) {
      return user.email.split("@")[0].trim().toUpperCase();
    }
    return (coordTargetRoll || "21F3001013").trim().toUpperCase();
  };

  // Hydrate roll-isolated training stages, activity submissions, resumes, and scorecard from PostgreSQL
  useEffect(() => {
    let cancelled = false;
    const isStudentUser = user?.role === "STUDENT";
    const rollToFetch = resolveActiveStudentRoll();
    loadedRollRef.current = null;
    setDbHydrated(false);

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/portal-state/bootstrap?student_roll=${encodeURIComponent(
            rollToFetch
          )}&scope_student_only=${isStudentUser ? "true" : "false"}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        const snap = data.snapshot || {};
        const snapByRoll: Record<string, TrainingStageScore[]> =
          snap.trainingStagesByRoll && typeof snap.trainingStagesByRoll === "object"
            ? snap.trainingStagesByRoll
            : {};
        if (Object.keys(snapByRoll).length > 0) {
          setTrainingStagesByRoll(snapByRoll);
        }
        if (Array.isArray(data.trainingStages) && data.trainingStages.length > 0) {
          setTrainingStages(data.trainingStages);
          setTrainingStagesByRoll((prev) => ({ ...prev, [rollToFetch]: data.trainingStages }));
        } else if (Array.isArray(snapByRoll[rollToFetch]) && snapByRoll[rollToFetch].length > 0) {
          setTrainingStages(snapByRoll[rollToFetch]);
        } else {
          setTrainingStages(INITIAL_TRAINING_STAGES);
        }
        if (Array.isArray(data.activitySubmissions)) {
          setActivitySubmissions(data.activitySubmissions);
        }
        if (Array.isArray(snap.registrations) && snap.registrations.length > 0) {
          setRegistrations((prevDefaults) => {
            const existingEmails = new Set(
              snap.registrations.map((r: RegistrationRequestRecord) => `${r.role}::${r.email.toLowerCase()}`)
            );
            const missingSeeded = prevDefaults.filter(
              (d) => !existingEmails.has(`${d.role}::${d.email.toLowerCase()}`)
            );
            return [...snap.registrations, ...missingSeeded];
          });
        }
        if (Array.isArray(snap.jobs) && snap.jobs.length > 0) {
          setJobs(snap.jobs);
        }
        if (Array.isArray(snap.questionBank) && snap.questionBank.length > 0) {
          setQuestionBank(mergeSeededQuestionBank(snap.questionBank));
        }
        if (Array.isArray(snap.applications)) {
          setApplications(snap.applications);
        }
        if (Array.isArray(snap.evaluations)) {
          setEvaluations(dedupeEvaluationsByRoll(snap.evaluations));
        }
        if (Array.isArray(snap.oneOnOneSlots) && snap.oneOnOneSlots.length > 0) {
          setOneOnOneSlots(snap.oneOnOneSlots);
        }
        if (Array.isArray(snap.examinerSlots) && snap.examinerSlots.length > 0) {
          const seenKeys = new Set<string>();
          const normalized = snap.examinerSlots
            .map((s: any) => {
              let d = String(s.date || "").trim();
              if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
                const [dd, mm, yyyy] = d.split("-");
                d = `${yyyy}-${mm}-${dd}`;
              } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(d)) {
                const [p1, p2, p3] = d.split("/");
                const yyyy = p3.length === 2 ? `20${p3}` : p3;
                d = `${yyyy}-${p1.padStart(2, "0")}-${p2.padStart(2, "0")}`;
              }
              return { ...s, date: d };
            })
            .filter((s: any) => {
              if (/^\d+(\.\d+)?$/.test(s.date)) return false;
              const k = `${String(s.instructor || "").trim().toLowerCase()}::${s.date}::${String(s.slotTime || "").trim().toLowerCase()}`;
              if (seenKeys.has(k) && s.status === "OPEN") return false;
              seenKeys.add(k);
              return true;
            });
          setExaminerSlots(normalized);
        }
        if (Array.isArray(snap.auditLogs) && snap.auditLogs.length > 0) {
          setAuditLogs(snap.auditLogs);
        }
        if (Array.isArray(snap.interviews)) {
          setInterviews(snap.interviews);
        }
        if (Array.isArray(snap.offers)) {
          setOffers(snap.offers);
        }
        if (Array.isArray(data.helpdeskTickets)) {
          setHelpdeskTickets(data.helpdeskTickets);
        }
        const regList = Array.isArray(snap.registrations) ? snap.registrations : registrations;
        const matchedStudentReg = regList.find(
          (r: any) =>
            r.role === "STUDENT" &&
            (String(r.email || "").trim().toLowerCase() === String(user?.email || "").trim().toLowerCase() ||
              String(r.rollNumber || "").trim().toUpperCase() === rollToFetch)
        );
        if (matchedStudentReg) {
          if (matchedStudentReg.fullName) setFullName(matchedStudentReg.fullName);
          if (matchedStudentReg.applyingTrack) setStudentApplyingTrack(matchedStudentReg.applyingTrack);
          if (matchedStudentReg.targetDomain) setStudentTargetDomain(matchedStudentReg.targetDomain);
        }
        if (data.studentProfile && typeof data.studentProfile === "object") {
          const prof = data.studentProfile;
          if (prof.fullName) setFullName(prof.fullName);
          if (prof.cgpa) setCgpaInput(String(prof.cgpa));
          if (typeof prof.activeBacklogs === "number") setActiveBacklogs(prof.activeBacklogs);
          if (prof.programLevel) setProgramLevel(prof.programLevel);
          if (prof.degreeType) setDegreeType(prof.degreeType);
          if (prof.applyingTrack) setStudentApplyingTrack(prof.applyingTrack);
          if (prof.targetDomain) setStudentTargetDomain(prof.targetDomain);
          if (prof.personalEmail) setPersonalEmail(prof.personalEmail);
          if (prof.mobileNumber) setMobileNumber(prof.mobileNumber);
          if (prof.linkedinUrl) setLinkedinId(prof.linkedinUrl);
          if (prof.githubUrl) setGithubUsername(prof.githubUrl);
          if (prof.kaggleUrl) setKaggleUsername(prof.kaggleUrl);
        }
        setResumes(Array.isArray(snap.resumes) ? snap.resumes : []);
        setMarksheet(snap.marksheet && typeof snap.marksheet === "object" ? snap.marksheet : null);
        loadedRollRef.current = rollToFetch;
        setDbSyncStatus("SYNCED");
      } catch {
        if (!cancelled) {
          loadedRollRef.current = rollToFetch;
          setDbSyncStatus("LOCAL_FALLBACK");
        }
      } finally {
        if (!cancelled) setDbHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.email, user?.role, coordTargetRoll, activeTab]);

  // Write-through sync to PostgreSQL scoped strictly to loadedRollRef.current
  useEffect(() => {
    if (!dbHydrated) return;
    const rollToSave = resolveActiveStudentRoll();
    if (loadedRollRef.current !== rollToSave) return;
    setTrainingStagesByRoll((prev) => {
      if (prev[rollToSave] === trainingStages) return prev;
      return { ...prev, [rollToSave]: trainingStages };
    });
    setDbSyncStatus("SYNCING");

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/portal-state/sync`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentRoll: rollToSave,
            trainingStages,
            activitySubmissions,
            studentProfile: {
              studentRoll: rollToSave,
              fullName,
              iitmEmail: user?.email || `${rollToSave.toLowerCase()}@ds.study.iitm.ac.in`,
              personalEmail,
              mobileNumber,
              cgpa: cgpaInput,
              activeBacklogs,
              programLevel,
              degreeType,
              applyingTrack: studentApplyingTrack,
              targetDomain: studentTargetDomain,
              headline: `${programLevel} • ${studentTargetDomain.replace("_", " ")}`,
              githubUrl: githubUsername,
              linkedinUrl: linkedinId,
              kaggleUrl: kaggleUsername,
              portfolioUrl: "",
              skills: [],
              projects: [],
              experiences: [],
              isSuspended: false,
              noShowCount: 0,
            },
            helpdeskTickets,
            snapshot: {
              registrations,
              jobs,
              applications,
              interviews,
              offers,
              evaluations,
              oneOnOneSlots,
              examinerSlots,
              questionBank,
              trainingStagesByRoll: {
                ...trainingStagesByRoll,
                [rollToSave]: trainingStages,
              },
              auditLogs,
              resumes,
              marksheet,
            },
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setDbSyncStatus("SYNCED");
      } catch {
        setDbSyncStatus("LOCAL_FALLBACK");
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [
    dbHydrated,
    user?.email,
    user?.role,
    coordTargetRoll,
    trainingStages,
    activitySubmissions,
    registrations,
    jobs,
    applications,
    evaluations,
    oneOnOneSlots,
    examinerSlots,
    questionBank,
    auditLogs,
    resumes,
    marksheet,
    interviews,
    offers,
    helpdeskTickets,
    fullName,
    cgpaInput,
    activeBacklogs,
    programLevel,
    degreeType,
    studentApplyingTrack,
    studentTargetDomain,
    personalEmail,
    mobileNumber,
    linkedinId,
    githubUsername,
    kaggleUsername,
  ]);

  const appendAudit = useCallback(
    (
      actor: string,
      role: Role,
      action: string,
      resource: string,
      status: "SUCCESS" | "BLOCKED" = "SUCCESS"
    ) => {
      const entry: AuditEntry = {
        id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST",
        actor,
        role,
        action,
        resource,
        status,
      };
      setAuditLogs((prev) => [entry, ...prev]);
    },
    []
  );

  const activeTrack =
    (user?.role === "STUDENT"
      ? tracks.find((t) => t.domain === studentTargetDomain && (studentApplyingTrack === "BOTH" ? true : t.track === studentApplyingTrack))
      : tracks.find((t) => t.id === activeTrackId)) || tracks[0];

  const finalizeQuizAttempt = useCallback(
    (reason: "NORMAL" | "TIMEOUT" | "TAB_SWITCH_VIOLATION") => {
      if (!user) return;

      if (activeTrack.attemptsUsed >= activeTrack.maxAttempts) {
        setIsQuizActive(false);
        setQuizBanner({
          type: "BLOCKED",
          text: `BRULE-12 Enforcement: Maximum ${activeTrack.maxAttempts} assessment attempts exhausted for ${activeTrack.code}.`,
        });
        appendAudit(
          user.email,
          user.role,
          "BRULE_12_BLOCKED",
          `${activeTrack.code} (Attempt #${activeTrack.attemptsUsed + 1})`,
          "BLOCKED"
        );
        return;
      }

      const nextAttemptNum = activeTrack.attemptsUsed + 1;
      const totalQ = drawnQuestions.length || QUESTIONS_PER_QUIZ;
      let correctCount = 0;
      let scorePct = 0;
      let passed = false;

      if (reason === "NORMAL") {
        correctCount = drawnQuestions.reduce(
          (acc, q) => (quizAnswers[q.id] === q.correctIndex ? acc + 1 : acc),
          0
        );
        scorePct = Math.round((correctCount / totalQ) * 100);
        passed = scorePct >= activeTrack.passThresholdPct;
      }

      setIsQuizActive(false);
      setTracks((prev) =>
        prev.map((t) =>
          t.id === activeTrack.id
            ? {
                ...t,
                attemptsUsed: nextAttemptNum,
                bestScorePct: Math.max(t.bestScorePct ?? 0, scorePct),
              }
            : t
        )
      );

      if (reason === "TAB_SWITCH_VIOLATION") {
        appendAudit(
          user.email,
          user.role,
          "ASSESSMENT_TAB_VIOLATION",
          `${activeTrack.code} • Attempt ${nextAttemptNum}/${activeTrack.maxAttempts} auto-failed (0%)`,
          "BLOCKED"
        );
        setQuizBanner({
          type: "BLOCKED",
          text: `Proctoring Violation: Tab/window switch detected! Attempt #${nextAttemptNum} automatically failed (0%). ${
            activeTrack.maxAttempts - nextAttemptNum
          } attempt(s) remaining.`,
        });
        return;
      }

      if (reason === "TIMEOUT") {
        appendAudit(
          user.email,
          user.role,
          "ASSESSMENT_TIMEOUT",
          `${activeTrack.code} • 30:00 timer expired on Attempt ${nextAttemptNum}/${activeTrack.maxAttempts}`,
          "BLOCKED"
        );
        setQuizBanner({
          type: "FAIL",
          text: `Time Expired (30:00)! Attempt #${nextAttemptNum} recorded as failed (0%). ${
            activeTrack.maxAttempts - nextAttemptNum
          } attempt(s) remaining.`,
        });
        return;
      }

      appendAudit(
        user.email,
        user.role,
        passed ? "ASSESSMENT_PASSED" : "ASSESSMENT_FAILED",
        `${activeTrack.code} • ${correctCount}/${totalQ} correct (${scorePct}%) on Attempt ${nextAttemptNum}/${activeTrack.maxAttempts}`,
        "SUCCESS"
      );

      if (passed) {
        const alreadyHasBadge = badges.some((b) => b.courseCode === activeTrack.code);
        if (!alreadyHasBadge) {
          const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
          const code = `BADGE-IITM-${activeTrack.code.replace(/-/g, "")}-${hash}`;
          const newBadge: SkillBadgeItem = {
            code,
            courseCode: activeTrack.code,
            skillName: activeTrack.skillTag,
            scorePct,
            issuedAt: new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST",
          };
          setBadges((prev) => [newBadge, ...prev]);
          appendAudit(
            user.email,
            user.role,
            "BADGE_ISSUED",
            `${code} (${activeTrack.skillTag})`,
            "SUCCESS"
          );
        }
        setQuizBanner({
          type: "PASS",
          text: `Auto-Evaluated: ${correctCount}/${totalQ} correct (${scorePct}%) — PASSED! Verified credential "${activeTrack.skillTag}" issued.`,
        });
      } else {
        const remaining = activeTrack.maxAttempts - nextAttemptNum;
        setQuizBanner({
          type: "FAIL",
          text: `Auto-Evaluated: ${correctCount}/${totalQ} correct (${scorePct}% • Required: ${activeTrack.passThresholdPct}%). ${remaining} attempt(s) remaining under BRULE-12.`,
        });
      }
    },
    [activeTrack, appendAudit, badges, drawnQuestions, quizAnswers, user]
  );

  useEffect(() => {
    if (!isQuizActive) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          finalizeQuizAttempt("TIMEOUT");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isQuizActive, finalizeQuizAttempt]);

  useEffect(() => {
    if (!isQuizActive) return;
    const handleVisibilityChange = () => {
      if (document.hidden) finalizeQuizAttempt("TAB_SWITCH_VIOLATION");
    };
    const handleWindowBlur = () => {
      finalizeQuizAttempt("TAB_SWITCH_VIOLATION");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isQuizActive, finalizeQuizAttempt]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const BLOCKED_PUBLIC_DOMAINS = [
    "@gmail.com",
    "@yahoo.com",
    "@hotmail.com",
    "@outlook.com",
    "@icloud.com",
    "@protonmail.com",
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthNotice(null);
    setAuthError(null);
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setAuthError("Please enter your institutional or corporate email address.");
      return;
    }

    if (selectedRole === "STUDENT") {
      const validDomain = ALLOWED_DOMAINS.some((d) => normalized.endsWith(d));
      if (!validDomain) {
        setAuthError(
          "Domain Guard Rejected: Students must authenticate with @ds.study.iitm.ac.in or @es.study.iitm.ac.in."
        );
        appendAudit(normalized, "STUDENT", "SSO_DOMAIN_REJECTED", "IAM Domain Filter", "BLOCKED");
        return;
      }
    } else if (selectedRole === "RECRUITER") {
      if (
        BLOCKED_PUBLIC_DOMAINS.some((d) => normalized.endsWith(d)) ||
        ALLOWED_DOMAINS.some((d) => normalized.endsWith(d))
      ) {
        setAuthError(
          "Domain Guard Rejected: Recruiters must use an official corporate domain (public email providers are blocked)."
        );
        appendAudit(normalized, "RECRUITER", "RECRUITER_PUBLIC_DOMAIN_BLOCKED", "IAM Domain Filter", "BLOCKED");
        return;
      }
    } else if (selectedRole === "ADMIN" && normalized !== "placement.admin@iitm.ac.in") {
      setAuthError(
        "Admin Access Denied: Only authorized Placement Admin accounts (placement.admin@iitm.ac.in) may sign in as ADMIN."
      );
      appendAudit(normalized, "ADMIN", "ADMIN_UNAUTHORIZED_EMAIL", "IAM Admin Guard", "BLOCKED");
      return;
    }

    // Attempt real FastAPI PostgreSQL JWT authentication first
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/sso-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalized,
          password: password || "123456",
          full_name: normalized.split("@")[0],
          role: toBackendRole(selectedRole),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const resolvedRole = fromBackendRole(data.active_role);
        if (data.access_token) {
          try {
            window.localStorage.setItem(JWT_STORAGE_KEY, data.access_token);
          } catch {
            // ignore storage errors
          }
          setAuthToken(data.access_token);
        }
        setAuthError(null);
        setActiveTab(
          resolvedRole === "ADMIN"
            ? "GOVERNANCE"
            : resolvedRole === "RECRUITER"
            ? "RECRUITER_COMPANY"
            : resolvedRole === "TRAINING_COORDINATOR" || resolvedRole === "EXAMINER"
            ? "TRAINING"
            : "IDENTITY"
        );
        setUser({ email: data.email, role: resolvedRole, name: data.full_name });
        appendAudit(data.email, resolvedRole, "USER_LOGIN_JWT", "PostgreSQL IAM + 30m Sliding JWT", "SUCCESS");
        return;
      }

      const errBody = await res.json().catch(() => ({}));
      const detail = typeof errBody.detail === "string" ? errBody.detail : null;
      if (detail && [400, 401, 403, 404].includes(res.status)) {
        setAuthError(detail);
        appendAudit(normalized, selectedRole, "IAM_LOGIN_REJECTED", detail, "BLOCKED");
        return;
      }
    } catch {
      // Backend unreachable -> fall back to local demo account check
    }

    // Offline / Local Fallback Authentication
    const matchedReg = registrations.find(
      (r) => r.email.toLowerCase() === normalized && r.role === selectedRole
    );
    if (matchedReg) {
      if (matchedReg.status === "PENDING") {
        setAuthError(
          "Approval Pending: Your registration is awaiting Placement Admin approval."
        );
        return;
      }
      if (matchedReg.status === "REJECTED") {
        setAuthError(
          "Registration Declined: This account request was rejected by Placement Admin."
        );
        return;
      }
      if (password && matchedReg.password !== "••••••••" && password !== matchedReg.password) {
        setAuthError("Invalid password. Please verify your credentials.");
        return;
      }
      setAuthError(null);
      setActiveTab(selectedRole === "RECRUITER" ? "RECRUITER_COMPANY" : selectedRole === "TRAINING_COORDINATOR" || selectedRole === "EXAMINER" ? "TRAINING" : "IDENTITY");
      setUser({ email: normalized, role: selectedRole, name: matchedReg.fullName });
      appendAudit(normalized, selectedRole, "USER_LOGIN_LOCAL", "Offline Fallback Session", "SUCCESS");
      return;
    }

    if (selectedRole === "ADMIN" && normalized === "placement.admin@iitm.ac.in") {
      if (password !== "123456") {
        setAuthError("Invalid Admin password. Please verify your credentials.");
        return;
      }
      setAuthError(null);
      setActiveTab("GOVERNANCE");
      setUser({ email: normalized, role: "ADMIN", name: "Placement Admin" });
      return;
    }

    setAuthError("Account not found. Please switch to the Register (Sign Up) tab first.");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthNotice(null);
    setAuthError(null);
    if (selectedRole === "ADMIN") {
      setAuthError("Admin accounts cannot self-register.");
      return;
    }

    const normalized = email.trim().toLowerCase();
    const cleanName = regFullName.trim();
    let cleanOrg = regOrgOrDept.trim();
    let examinerDetailsPayload: ExaminerOnboardingDetails | undefined = undefined;

    if (selectedRole === "EXAMINER") {
      const cleanMobile = examinerDraft.mobileNumber.trim();
      const cleanExOrg = examinerDraft.organization.trim();
      const cleanDesig = examinerDraft.designation.trim();
      const expNum = Number(examinerDraft.yearsExperience);
      const cleanLinkedin = examinerDraft.linkedinUrl.trim();
      const cleanSpecs = examinerDraft.specializations.trim();
      const cleanCvDrive = (examinerDraft.cvDriveUrl || "").trim();

      if (
        !cleanName ||
        !normalized ||
        !password.trim() ||
        !cleanMobile ||
        !cleanExOrg ||
        !cleanDesig ||
        !examinerDraft.yearsExperience.trim() ||
        Number.isNaN(expNum) ||
        expNum < 0 ||
        !cleanLinkedin ||
        !cleanSpecs
      ) {
        setAuthError(
          "Please complete all mandatory Examiner fields (Name, Email, Password, Mobile, Organization, Designation, Experience, LinkedIn URL, and Technical Specializations)."
        );
        return;
      }

      if (!cleanLinkedin.toLowerCase().includes("linkedin.com")) {
        setAuthError("Please enter a valid LinkedIn profile URL (https://www.linkedin.com/in/...).");
        return;
      }

      let normalizedCvUrl: string | undefined = undefined;
      if (cleanCvDrive) {
        const parsedCv = parseGoogleDriveLink(cleanCvDrive);
        if (!parsedCv.isValid) {
          setAuthError(
            "Invalid CV / Faculty ID Google Drive Link: Please paste a valid drive.google.com share link ('Anyone with the link can view') or leave it blank."
          );
          return;
        }
        normalizedCvUrl = parsedCv.viewUrl;
      }

      if (!examinerDraft.coiAccepted) {
        setAuthError(
          "Please accept the Conflict-of-Interest & Student Confidentiality Declaration before submitting."
        );
        return;
      }

      const categoryLabels: Record<ExaminerOnboardingDetails["category"], string> = {
        IITM_FACULTY: "IITM Faculty / Instructor",
        IITM_RESEARCH_TA: "IITM PhD / MS Scholar / TA",
        INDUSTRY_MENTOR: "Industry Mentor / Senior Engineer",
        IITM_ALUMNI: "IITM BS Alumni",
      };
      const domainLabels: Record<ExaminerOnboardingDetails["evaluationDomain"], string> = {
        DATA_SCIENCE: "Data Science & ML",
        SOFTWARE_DEVELOPMENT: "Software Development & Systems",
        BOTH: "DS + Software Engineering",
      };

      cleanOrg = `${categoryLabels[examinerDraft.category]} • ${cleanExOrg} (${cleanDesig}, ${expNum} yrs) • Domain: ${domainLabels[examinerDraft.evaluationDomain]} • Cap: ${examinerDraft.weeklyVivaCapacity}/wk`;
      examinerDetailsPayload = {
        ...examinerDraft,
        mobileNumber: cleanMobile,
        organization: cleanExOrg,
        designation: cleanDesig,
        yearsExperience: String(expNum),
        linkedinUrl: cleanLinkedin,
        portfolioOrScholarUrl: (examinerDraft.portfolioOrScholarUrl || "").trim() || undefined,
        specializations: cleanSpecs,
        cvDriveUrl: normalizedCvUrl,
      };
    } else if (selectedRole === "RECRUITER") {
      const cleanMobile = recruiterDraft.mobileNumber.trim();
      const cleanCompany = recruiterDraft.companyName.trim();
      const cleanWebsite = recruiterDraft.companyWebsite.trim();
      const cleanHq = recruiterDraft.headquartersLocation.trim();
      const cleanHiringLocs = recruiterDraft.hiringLocations.trim();
      const cleanOverview = recruiterDraft.companyOverview.trim();
      const cleanDesig = recruiterDraft.designation.trim();
      const cleanLinkedin = recruiterDraft.linkedinUrl.trim();
      const cleanRoles = recruiterDraft.targetRoles.trim();
      const cleanComp = recruiterDraft.compensationRange.trim();

      if (
        !cleanName ||
        !normalized ||
        !password.trim() ||
        !cleanMobile ||
        !cleanCompany ||
        !cleanWebsite ||
        !cleanHq ||
        !cleanHiringLocs ||
        !cleanOverview ||
        !cleanDesig ||
        !cleanLinkedin ||
        !cleanRoles ||
        !cleanComp
      ) {
        setAuthError(
          "Please complete all mandatory Company, Location, and Recruiter fields (Company Name, Size, Website, HQ Location, Hiring Locations, Company Overview, Designation, Mobile, LinkedIn URL, Target Roles, and Compensation Band)."
        );
        return;
      }

      const personalDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "rediffmail.com"];
      const emailDomain = normalized.split("@")[1] || "";
      if (personalDomains.includes(emailDomain)) {
        setAuthError(
          "Corporate Domain Required: Please register using your official company work email (not @gmail.com / @yahoo.com / @outlook.com)."
        );
        return;
      }

      if (!cleanLinkedin.toLowerCase().includes("linkedin.com")) {
        setAuthError("Please enter a valid LinkedIn profile URL (https://www.linkedin.com/in/...).");
        return;
      }

      if (!/^https?:\/\//i.test(cleanWebsite)) {
        setAuthError("Please enter a valid Company Website URL starting with https:// or http://.");
        return;
      }

      if (!recruiterDraft.policyAccepted) {
        setAuthError(
          "Please accept the IITM BS Placement Cell Employer Charter & Offer Policy before submitting."
        );
        return;
      }

      const companyTypeLabels: Record<RecruiterOnboardingDetails["companyType"], string> = {
        PRODUCT: "Product Engineering",
        MNC_ENTERPRISE: "MNC / Enterprise",
        STARTUP: "High-Growth Startup",
        CONSULTING_ANALYTICS: "Consulting & Analytics",
        RESEARCH_PSU: "R&D Lab / PSU",
      };
      const hiringModeLabels: Record<RecruiterOnboardingDetails["hiringMode"], string> = {
        INTERNSHIP: "Internships",
        FULL_TIME: "Full-Time (FTE)",
        BOTH: "Internship + PPO + FTE",
      };

      const workModeLabels: Record<RecruiterOnboardingDetails["workMode"], string> = {
        HYBRID: "Hybrid",
        ONSITE: "On-Site",
        REMOTE: "Remote",
        FLEXIBLE: "Flexible",
      };
      cleanOrg = `${cleanCompany} (${companyTypeLabels[recruiterDraft.companyType]} • ${recruiterDraft.companySize}) • HQ: ${cleanHq} • Hiring: ${cleanHiringLocs} (${workModeLabels[recruiterDraft.workMode]}) • ${hiringModeLabels[recruiterDraft.hiringMode]} • ${cleanDesig}`;
      var recruiterDetailsPayload: RecruiterOnboardingDetails | undefined = {
        ...recruiterDraft,
        mobileNumber: cleanMobile,
        companyName: cleanCompany,
        foundedYear: (recruiterDraft.foundedYear || "").trim() || undefined,
        companyWebsite: cleanWebsite,
        companyLinkedinUrl: (recruiterDraft.companyLinkedinUrl || "").trim() || undefined,
        cinOrGstNumber: (recruiterDraft.cinOrGstNumber || "").trim() || undefined,
        headquartersLocation: cleanHq,
        hiringLocations: cleanHiringLocs,
        companyOverview: cleanOverview,
        designation: cleanDesig,
        linkedinUrl: cleanLinkedin,
        targetRoles: cleanRoles,
        compensationRange: cleanComp,
      };
    } else if (!cleanName || !normalized || !cleanOrg) {
      setAuthError("Please complete Full Name, Email, and Department / Organization details.");
      return;
    }

    if (selectedRole === "STUDENT") {
      const validDomain = ALLOWED_DOMAINS.some((d) => normalized.endsWith(d));
      if (!validDomain) {
        setAuthError(
          "Domain Guard Rejected: Student registration requires @ds.study.iitm.ac.in or @es.study.iitm.ac.in."
        );
        appendAudit(normalized, "STUDENT", "SIGNUP_DOMAIN_REJECTED", "IAM Domain Filter", "BLOCKED");
        return;
      }
    } else if (selectedRole === "RECRUITER") {
      if (
        BLOCKED_PUBLIC_DOMAINS.some((d) => normalized.endsWith(d)) ||
        ALLOWED_DOMAINS.some((d) => normalized.endsWith(d))
      ) {
        setAuthError("Recruiter registration requires an official corporate email domain.");
        appendAudit(normalized, "RECRUITER", "SIGNUP_DOMAIN_REJECTED", "IAM Domain Filter", "BLOCKED");
        return;
      }
    }

    const existing = registrations.find(
      (r) => r.email.toLowerCase() === normalized && r.role === selectedRole
    );
    if (existing) {
      setAuthError(
        `A ${selectedRole} registration for ${normalized} already exists (Current Status: ${existing.status}).`
      );
      return;
    }

    let backendUserId = `REG-${101 + registrations.length}`;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalized,
          password: password || "123456",
          full_name: cleanName,
          role: toBackendRole(selectedRole),
          organization_or_dept: cleanOrg,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        if (created.user_id) backendUserId = created.user_id;
      } else {
        const errBody = await res.json().catch(() => ({}));
        if (typeof errBody.detail === "string") {
          setAuthError(errBody.detail);
          return;
        }
      }
    } catch {
      // Fallback to snapshot registration if offline
    }

    const newRecord: RegistrationRequestRecord = {
      id: backendUserId,
      fullName: cleanName,
      email: normalized,
      role: selectedRole,
      orgOrDept: cleanOrg,
      password: password || "123456",
      status: "PENDING",
      submittedAt: new Date().toLocaleString("en-IN", { hour12: false }) + " IST",
      examinerProfileDetails: examinerDetailsPayload,
      recruiterProfileDetails: typeof recruiterDetailsPayload !== "undefined" ? recruiterDetailsPayload : undefined,
    };

    setRegistrations((prev) => [newRecord, ...prev.filter((r) => r.email.toLowerCase() !== normalized)]);
    appendAudit(
      normalized,
      selectedRole,
      "REGISTRATION_SUBMITTED",
      `${newRecord.id} (${selectedRole}) persisted in PostgreSQL -> Awaiting Admin Approval`,
      "SUCCESS"
    );
    setAuthError(null);
    setAuthNotice(
      `Registration saved in PostgreSQL for ${cleanName} (${selectedRole}). Sign-in will unlock once approved by Placement Admin.`
    );
    setRegFullName("");
    setRegOrgOrDept("");
    setAuthMode("SIGN_IN");
  };

  const handleRegistrationDecision = async (regId: string, decision: "APPROVED" | "REJECTED") => {
    if (!user || user.role !== "ADMIN") return;
    if (authToken && regId.includes("-") && regId.length >= 32) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/admin/registrations/${encodeURIComponent(regId)}/decision`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ decision }),
        });
      } catch {
        // Continue with state sync fallback
      }
    }

    let target: RegistrationRequestRecord | undefined;
    setRegistrations((prev) =>
      prev.map((r) => {
        if (r.id !== regId) return r;
        target = { ...r, status: decision, reviewedBy: user.email };
        return target;
      })
    );
    if (target) {
      appendAudit(
        user.email,
        "ADMIN",
        `REGISTRATION_${decision}`,
        `${target.id} (${target.email} • ${target.role})`,
        "SUCCESS"
      );
    }
  };


  const resolveStudentRegMeta = (emailOrRoll: string) => {
    const clean = String(emailOrRoll || "").trim().toLowerCase();
    const roll = clean.includes("@") ? clean.split("@")[0] : clean;
    const reg = registrations.find(
      (r) =>
        r.role === "STUDENT" &&
        (r.email.toLowerCase() === clean || r.email.toLowerCase().startsWith(`${roll}@`))
    );
    if (!reg) return null;
    if (reg.studentProfileDetails) {
      return { reg, details: reg.studentProfileDetails };
    }
    const raw = String(reg.orgOrDept || "");
    const parts = raw.split("•").map((s) => s.trim());
    const progToken = (parts[0] || "").toUpperCase();
    const level: ProgramLevelOption = progToken.startsWith("BS ") || progToken === "BS"
      ? "BS"
      : progToken.startsWith("BSC")
      ? "BSC"
      : progToken.startsWith("FOUNDATION")
      ? "FOUNDATION"
      : "DIPLOMA";
    const isDeg = level === "BSC" || level === "BS";
    const trackToken = (parts[1] || "").toUpperCase();
    const track: StudentTrackOption = trackToken.includes("BOTH")
      ? "BOTH"
      : trackToken.includes("FULL_TIME") || trackToken.includes("FULL-TIME")
      ? "FULL_TIME"
      : "INTERNSHIP";
    const domainToken = (parts[2] || "").toUpperCase();
    const domain: QuizDomainOption = domainToken.includes("SOFTWARE") ? "SOFTWARE_DEVELOPMENT" : "DATA_SCIENCE";
    return {
      reg,
      details: {
        personalEmail: "",
        mobileNumber: "",
        cgpa: "",
        activeBacklogs: 0,
        programLevel: level,
        degreeType: "STANDALONE" as DegreeTypeOption,
        applyingTrack: track,
        targetDomain: domain,
        hasDiplomaDataScience: isDeg || raw.includes("Diploma in Data Science"),
        hasDiplomaProgramming: isDeg || raw.includes("Diploma in Programming"),
        gender: "",
        stateName: "",
        category: "GENERAL" as CategoryOption,
        isWorkingProf: false,
      },
    };
  };

  const evaluateStudentEligibility = (draft: StudentOnboardingDraft): { eligible: boolean; message: string } => {
    const isBscOrBs = draft.programLevel === "BSC" || draft.programLevel === "BS";
    const hasDsDiploma = isBscOrBs || draft.hasDiplomaDataScience;
    const hasProgDiploma = isBscOrBs || draft.hasDiplomaProgramming;

    if (draft.applyingTrack === "INTERNSHIP") {
      if (draft.targetDomain === "DATA_SCIENCE") {
        if (!hasDsDiploma) {
          return {
            eligible: false,
            message:
              "Eligibility Check Failed: For Data Science Internship, completing the Diploma in Data Science (or BSc/BS) is mandatory.",
          };
        }
        return {
          eligible: true,
          message: `Eligible for Data Science Internship (${isBscOrBs ? `${draft.programLevel} — Both Diplomas Verified` : "Diploma in Data Science verified"}).`,
        };
      }
      if (draft.targetDomain === "SOFTWARE_DEVELOPMENT") {
        if (!hasProgDiploma) {
          return {
            eligible: false,
            message:
              "Eligibility Check Failed: For Software Development Internship, completing the Diploma in Programming (or BSc/BS) is mandatory.",
          };
        }
        return {
          eligible: true,
          message: `Eligible for Software Development Internship (${isBscOrBs ? `${draft.programLevel} — Both Diplomas Verified` : "Diploma in Programming verified"}).`,
        };
      }
    }

    // FULL_TIME or BOTH tracks require minimum BSc Pass (BSC or BS, which implies both diplomas passed)
    if (!isBscOrBs) {
      return {
        eligible: false,
        message: `Eligibility Check Failed: For ${
          draft.applyingTrack === "BOTH" ? "Combined Internship + Full-Time Placement" : "Full-Time Placement"
        }, minimum BSc Pass (BSc / BS level) is mandatory.`,
      };
    }

    return {
      eligible: true,
      message:
        draft.applyingTrack === "BOTH"
          ? `Eligible for Both Internship & Full-Time Placement (${draft.programLevel} — Both Diplomas automatically verified).`
          : `Eligible for Full-Time Placement (${draft.programLevel} — Both Diplomas automatically verified).`,
    };
  };

  const handleStudentRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setEligibilityVerdict(null);

    const normalizedEmail = studentDraft.email.trim().toLowerCase();
    const cleanFullName = studentDraft.fullName.trim();
    const cleanPersonalEmail = studentDraft.personalEmail.trim().toLowerCase();
    const cleanMobile = studentDraft.mobileNumber.trim();
    const cgpaNum = Number(studentDraft.cgpa);

    if (
      !cleanFullName ||
      !normalizedEmail ||
      !studentDraft.password.trim() ||
      !cleanPersonalEmail ||
      !cleanMobile ||
      !studentDraft.cgpa.trim() ||
      Number.isNaN(cgpaNum) ||
      cgpaNum < 0 ||
      cgpaNum > 10 ||
      !studentDraft.gender ||
      !studentDraft.stateName
    ) {
      setAuthError("All fields marked with * are mandatory. Please fill in every required field.");
      return;
    }

    if (studentDraft.isWorkingProf) {
      if (
        !studentDraft.yearsExp.trim() ||
        Number(studentDraft.yearsExp) <= 0 ||
        !studentDraft.presentCompany.trim() ||
        !studentDraft.workLocation.trim() ||
        !studentDraft.currentCtc.trim() ||
        Number(studentDraft.currentCtc) < 0
      ) {
        setAuthError(
          "Working Professional details (Years of Experience, Work Domain, Present Company, Location, and Current CTC) are mandatory when 'Yes' is selected."
        );
        return;
      }
    }

    const validDomain = ALLOWED_DOMAINS.some((d) => normalizedEmail.endsWith(d));
    if (!validDomain) {
      setAuthError(
        "Institutional Email must end with @ds.study.iitm.ac.in or @es.study.iitm.ac.in."
      );
      appendAudit(normalizedEmail, "STUDENT", "STUDENT_REG_DOMAIN_REJECTED", "IAM Domain Guard", "BLOCKED");
      return;
    }

    const existing = registrations.find(
      (r) => r.email.toLowerCase() === normalizedEmail && r.role === "STUDENT"
    );
    if (existing) {
      setAuthError(
        `An account for ${normalizedEmail} is already registered. Please use Sign In instead.`
      );
      return;
    }

    const verdict = evaluateStudentEligibility(studentDraft);
    setEligibilityVerdict(verdict);

    if (!verdict.eligible) {
      appendAudit(
        normalizedEmail,
        "STUDENT",
        "ELIGIBILITY_CHECK_FAILED",
        verdict.message,
        "BLOCKED"
      );
      return;
    }

    appendAudit(
      normalizedEmail,
      "STUDENT",
      "ELIGIBILITY_CHECK_PASSED",
      verdict.message,
      "SUCCESS"
    );
    setOnboardingStep("PAYMENT");
  };

  const handleConfirmPaymentAndEnterDashboard = async () => {
    setPaymentProcessing(true);
    const normalizedEmail = studentDraft.email.trim().toLowerCase();
    const cleanFullName = studentDraft.fullName.trim();
    const rollCode = normalizedEmail.split("@")[0].toUpperCase();

    const isDegreeLevel = studentDraft.programLevel === "BSC" || studentDraft.programLevel === "BS";
    const resolvedDsDiploma = isDegreeLevel ? true : studentDraft.hasDiplomaDataScience;
    const resolvedProgDiploma = isDegreeLevel ? true : studentDraft.hasDiplomaProgramming;
    const diplomasLabel = [
      resolvedDsDiploma ? "Diploma in Data Science" : null,
      resolvedProgDiploma ? "Diploma in Programming" : null,
    ]
      .filter(Boolean)
      .join(" + ");

    const orgSummary = `${studentDraft.programLevel} (${diplomasLabel || "Degree"}) • ${
      studentDraft.applyingTrack
    } • ${studentDraft.targetDomain} • CGPA ${studentDraft.cgpa || "N/A"} • Payment: PAID`;

    let backendUserId = `REG-${101 + registrations.length}`;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password: studentDraft.password || "123456",
          full_name: cleanFullName,
          role: "STUDENT",
          organization_or_dept: orgSummary,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        if (created.user_id) backendUserId = created.user_id;
      }
    } catch {
      // Fallback to snapshot persistence if offline
    }

    const newRecord: RegistrationRequestRecord = {
      id: backendUserId,
      fullName: cleanFullName,
      email: normalizedEmail,
      role: "STUDENT",
      orgOrDept: orgSummary,
      password: studentDraft.password,
      status: "PENDING",
      paymentStatus: "PAID",
      submittedAt: new Date().toLocaleString("en-IN", { hour12: false }) + " IST",
      studentProfileDetails: {
        personalEmail: studentDraft.personalEmail.trim().toLowerCase(),
        mobileNumber: studentDraft.mobileNumber.trim(),
        cgpa: studentDraft.cgpa.trim(),
        activeBacklogs: studentDraft.activeBacklogs,
        programLevel: studentDraft.programLevel,
        degreeType: studentDraft.degreeType,
        applyingTrack: studentDraft.applyingTrack,
        targetDomain: studentDraft.targetDomain,
        hasDiplomaDataScience: resolvedDsDiploma,
        hasDiplomaProgramming: resolvedProgDiploma,
        gender: studentDraft.gender,
        stateName: studentDraft.stateName,
        category: studentDraft.category,
        isWorkingProf: studentDraft.isWorkingProf,
        yearsExp: studentDraft.isWorkingProf ? studentDraft.yearsExp : undefined,
        workDomain: studentDraft.isWorkingProf ? studentDraft.workDomain : undefined,
        presentCompany: studentDraft.isWorkingProf ? studentDraft.presentCompany : undefined,
        workLocation: studentDraft.isWorkingProf ? studentDraft.workLocation : undefined,
        currentCtc: studentDraft.isWorkingProf ? studentDraft.currentCtc : undefined,
      },
    };

    setRegistrations((prev) => [newRecord, ...prev.filter((r) => r.email.toLowerCase() !== normalizedEmail)]);

    // Pre-populate student dossier fields for when Admin approves login
    setFullName(cleanFullName);
    setPersonalEmail(studentDraft.personalEmail.trim().toLowerCase());
    setMobileNumber(studentDraft.mobileNumber.trim());
    setCgpaInput(studentDraft.cgpa);
    setActiveBacklogs(studentDraft.activeBacklogs);
    setProgramLevel(studentDraft.programLevel);
    setGender(studentDraft.gender);
    setStateName(studentDraft.stateName);
    setCategory(studentDraft.category);
    setDegreeType(studentDraft.degreeType);
    setStudentTargetDomain(studentDraft.targetDomain);
    setStudentApplyingTrack(studentDraft.applyingTrack);
    setIsWorkingProf(studentDraft.isWorkingProf);
    setYearsExp(studentDraft.yearsExp);
    setWorkDomain(studentDraft.workDomain);
    setPresentCompany(studentDraft.presentCompany);
    setWorkLocation(studentDraft.workLocation);
    setCurrentCtc(studentDraft.currentCtc);

    appendAudit(
      normalizedEmail,
      "STUDENT",
      "REGISTRATION_PAYMENT_CONFIRMED",
      `${newRecord.id} (${rollCode}) -> Payment Confirmed; Queued for Admin Approval`,
      "SUCCESS"
    );

    setPaymentProcessing(false);
    resetStudentDraft();
    setRegFullName("");
    setRegOrgOrDept("");
    setEmail(normalizedEmail);
    setPassword("");
    setOnboardingStep("AUTH");
    setAuthMode("SIGN_IN");
    setAuthError(null);
    setAuthNotice(
      `Registration ${newRecord.id} and payment confirmed for ${cleanFullName}. Your account is now PENDING Placement Admin approval before you can sign in.`
    );
  };


  const handleSaveRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsedCgpa = parseFloat(cgpaInput);
    if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
      setRegAlert({ type: "ERR", text: "Enter a valid CGPA between 0.00 and 10.00." });
      return;
    }
    if (!fullName.trim() || !mobileNumber.trim() || !personalEmail.trim()) {
      setRegAlert({
        type: "ERR",
        text: "Full name, mobile number, and personal email ID are required.",
      });
      return;
    }
    if (isWorkingProf) {
      const exp = parseFloat(yearsExp);
      if (isNaN(exp) || exp < 0 || !presentCompany.trim()) {
        setRegAlert({
          type: "ERR",
          text: "Working professionals must provide years of experience, domain, and present company.",
        });
        return;
      }
    }

    setRegAlert({
      type: "OK",
      text: `Registration Dossier Saved (${category} • ${degreeType.replace("_", " ")} • Level ${programLevel} • CGPA ${parsedCgpa.toFixed(
        2
      )}).`,
    });
    appendAudit(
      user.email,
      user.role,
      "STUDENT_REGISTRATION_SAVED",
      `${fullName} | ${category} | ${degreeType} | ${programLevel} | CGPA ${parsedCgpa.toFixed(2)}`,
      "SUCCESS"
    );
  };

  const handleSaveHandles = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setHandlesSavedBanner("Developer & LinkedIn handles verified and saved to Student Profile.");
    appendAudit(
      user.email,
      user.role,
      "STUDENT_HANDLES_UPDATED",
      `LinkedIn: ${linkedinId || "N/A"} | GitHub: ${githubUsername || "N/A"} | Kaggle: ${kaggleUsername || "N/A"}`,
      "SUCCESS"
    );
  };

  const handleUploadMarksheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsedDrive = parseGoogleDriveLink(marksheetDriveUrl);
    if (!parsedDrive.isValid) {
      setMarksheetAlert(
        "Invalid Google Drive Link: Upload your downloaded IITM BS Scorecard PDF to Google Drive ('Anyone with the link can view') and paste the share URL."
      );
      return;
    }
    const parsedCgpa = parseFloat(cgpaInput);
    if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
      setMarksheetAlert("Enter a valid CGPA between 0.00 and 10.00.");
      return;
    }
    const record: MarksheetRecord = {
      fileName: `IITM_BS_Scorecard_${parsedCgpa.toFixed(2)}.pdf`,
      driveUrl: parsedDrive.viewUrl,
      fileSize: "Google Drive",
      cgpa: parsedCgpa.toFixed(2),
      uploadedAt: new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST",
    };
    setMarksheet(record);
    setMarksheetDriveUrl("");
    setMarksheetAlert(null);
    appendAudit(
      user.email,
      user.role,
      "BS_SCORECARD_DRIVE_LINKED",
      `${record.fileName} (CGPA ${record.cgpa})`,
      "SUCCESS"
    );
  };

  const handleAddResume = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (resumes.length >= 3) {
      setVaultAlert("BRULE-55 Enforcement: Maximum 3 active resumes allowed per student.");
      appendAudit(user.email, user.role, "BRULE_55_BLOCKED", "Attempted 4th active resume", "BLOCKED");
      return;
    }
    const parsedDrive = parseGoogleDriveLink(newResumeDriveUrl);
    if (!parsedDrive.isValid) {
      setVaultAlert(
        "Invalid Google Drive Link: Upload your PDF resume to Google Drive ('Anyone with the link can view') and paste the drive.google.com link."
      );
      return;
    }
    if (!newTarget.trim()) {
      setVaultAlert("Please specify the target role (e.g., Data Scientist, SDE, Core).");
      return;
    }

    const label =
      newResumeTitle.trim() ||
      `${newTarget.trim().replace(/\s+/g, "_")}_Resume_${resumes.length + 1}.pdf`;

    const created: ResumeItem = {
      id: `res-${Date.now()}`,
      title: label,
      targetRole: newTarget.trim(),
      driveUrl: parsedDrive.viewUrl,
      fileSize: "Google Drive",
      updatedAt: "Just now",
      isPrimary: resumes.length === 0,
    };

    setResumes((prev) => [...prev, created]);
    setSelectedResumeIdForApply(created.id);
    setNewResumeTitle("");
    setNewResumeDriveUrl("");
    setNewTarget("");
    setVaultAlert(null);
    appendAudit(user.email, user.role, "RESUME_DRIVE_LINKED", `${created.title} (${created.targetRole})`, "SUCCESS");
  };

  const handleDeleteResume = (id: string, title: string) => {
    if (!user) return;
    setResumes((prev) => prev.filter((r) => r.id !== id));
    setVaultAlert(null);
    appendAudit(user.email, user.role, "RESUME_ARCHIVED", title, "SUCCESS");
  };

  const toggleModuleComplete = (trackId: string, moduleId: string) => {
    if (!user) return;
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          modules: t.modules.map((m) => {
            if (m.id !== moduleId) return m;
            const nextState = !m.completed;
            if (nextState) {
              appendAudit(user.email, user.role, "MODULE_COMPLETED", `${t.code}: ${m.title}`, "SUCCESS");
            }
            return { ...m, completed: nextState };
          }),
        };
      })
    );
  };


  // Increment 4: Interviews & Offers State (hydrated from PostgreSQL)

  useEffect(() => {
    setJobAlert(null);
    setRecruiterWorkspaceView("MY_DRIVES");
    if (user?.role === "RECRUITER") {
      const matchedReg = registrations.find(
        (r) => r.email.toLowerCase() === user.email.toLowerCase() && r.role === "RECRUITER"
      );
      const derivedCompany = (
        matchedReg?.recruiterProfileDetails?.companyName ||
        matchedReg?.orgOrDept?.split("•")[0]?.split("(")[0] ||
        ""
      ).trim();
      if (derivedCompany) {
        setNewCompany(derivedCompany);
      }
    }
  }, [user?.email, user?.role, registrations]);

  useEffect(() => {
    try {
      localStorage.setItem("iitm_os_applications_v1", JSON.stringify(applications));
      localStorage.setItem("iitm_os_interviews_v1", JSON.stringify(interviews));
      localStorage.setItem("iitm_os_offers_v1", JSON.stringify(offers));
    } catch {}
  }, [applications, interviews, offers]);
  const [placementAlert, setPlacementAlert] = useState<{ type: "OK" | "ERR"; text: string } | null>(null);

  const [ivAppId, setIvAppId] = useState<string>("");
  const [ivRoundType, setIvRoundType] = useState<InterviewRoundOption>("TECHNICAL_1");
  const [ivMode, setIvMode] = useState<"ONLINE_MEET" | "IN_PERSON">("ONLINE_MEET");
  const [ivDateTime, setIvDateTime] = useState<string>("2026-11-24T14:00");
  const [ivMeetingLink, setIvMeetingLink] = useState<string>("https://meet.google.com/iitm-placement-panel");
  const [ivPanelist, setIvPanelist] = useState<string>("Rohan Kulkarni (Staff Engineer)");

  const [ofrAppId, setOfrAppId] = useState<string>("");
  const [ofrCtcLpa, setOfrCtcLpa] = useState<string>("16.50");
  const [ofrJoiningDate, setOfrJoiningDate] = useState<string>("2027-06-15");
  const [ofrExpiresAt, setOfrExpiresAt] = useState<string>("2026-12-10");

  const handleScheduleInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const targetApp = applications.find((a) => a.id === ivAppId) || applications[0];
    const studentRoll = targetApp ? targetApp.studentRoll : "22F3001234";
    const studentName = targetApp ? targetApp.studentName : fullName;
    const companyName = targetApp ? targetApp.companyName : "Google Research India";
    const jobTitle = targetApp ? targetApp.jobTitle : "AI/ML Research Fellow";
    const appId = targetApp ? targetApp.id : `APP-${Date.now()}`;

    const proposedMs = new Date(ivDateTime).getTime();
    if (Number.isNaN(proposedMs)) {
      setPlacementAlert({ type: "ERR", text: "Select a valid interview date and time." });
      return;
    }

    // BRULE-31: 45-minute student conflict check
    const conflict = interviews.find(
      (iv) =>
        iv.studentRoll === studentRoll &&
        (iv.status === "SCHEDULED" || iv.status === "CONFIRMED") &&
        Math.abs(new Date(iv.scheduledAt).getTime() - proposedMs) < 45 * 60 * 1000
    );
    if (conflict) {
      const msg = `BRULE-31 Conflict: ${studentName} already has an active interview (${conflict.companyName} at ${conflict.scheduledAt.replace("T", " ")}) within 45 minutes.`;
      setPlacementAlert({ type: "ERR", text: msg });
      appendAudit(user.email, user.role, "INTERVIEW_CONFLICT_BLOCKED", msg, "BLOCKED");
      return;
    }

    const existingForApp = interviews.filter((iv) => iv.applicationId === appId).length;
    const created: InterviewScheduleRecord = {
      id: `IV-${Math.floor(100 + Math.random() * 900)}`,
      applicationId: appId,
      studentRoll,
      studentName,
      companyName,
      jobTitle,
      roundNumber: existingForApp + 1,
      roundType: ivRoundType,
      mode: ivMode,
      scheduledAt: ivDateTime,
      meetingLink: ivMeetingLink.trim() || "https://meet.google.com/iitm-panel",
      panelistName: ivPanelist.trim() || "Industry Panelist",
      status: "SCHEDULED",
    };
    setInterviews((prev) => [created, ...prev]);
    if (targetApp && targetApp.status === "APPLIED") {
      setApplications((prev) =>
        prev.map((a) => (a.id === targetApp.id ? { ...a, status: "SHORTLISTED" } : a))
      );
    }
    setPlacementAlert({
      type: "OK",
      text: `Scheduled Round ${created.roundNumber} (${created.roundType}) for ${studentName} with ${companyName}.`,
    });
    appendAudit(
      user.email,
      user.role,
      "INTERVIEW_SCHEDULED",
      `${created.id} — ${companyName} (${created.roundType}) for ${studentRoll}`,
      "SUCCESS"
    );
  };

  const handleUpdateInterviewStatus = (ivId: string, nextStatus: InterviewStatusOption) => {
    if (!user) return;
    setInterviews((prev) =>
      prev.map((iv) => (iv.id === ivId ? { ...iv, status: nextStatus } : iv))
    );
    setPlacementAlert({ type: "OK", text: `Interview ${ivId} updated to ${nextStatus}.` });
    appendAudit(user.email, user.role, "INTERVIEW_STATUS_UPDATED", `${ivId} -> ${nextStatus}`, "SUCCESS");
  };

  const handleIssueOfferLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const targetApp = applications.find((a) => a.id === ofrAppId) || applications[0];
    const studentRoll = targetApp ? targetApp.studentRoll : "22F3001234";
    const studentName = targetApp ? targetApp.studentName : fullName;
    const companyName = targetApp ? targetApp.companyName : "Fractal Analytics";
    const roleTitle = targetApp ? targetApp.jobTitle : "Associate Data Scientist";
    const roleType: JobRoleTypeOption = targetApp ? targetApp.roleType : "FULL_TIME";
    const appId = targetApp ? targetApp.id : `APP-OFR-${Date.now()}`;
    const parsedCtc = parseFloat(ofrCtcLpa);

    if (Number.isNaN(parsedCtc) || parsedCtc <= 0) {
      setPlacementAlert({ type: "ERR", text: "Enter a valid positive CTC / Stipend annualized value in LPA." });
      return;
    }

    const newOffer: OfferLetterRecord = {
      id: `OFR-${Math.floor(100 + Math.random() * 900)}`,
      offerCode: `OFR-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      applicationId: appId,
      studentRoll,
      studentName,
      companyName,
      roleTitle,
      roleType,
      ctcLpa: parsedCtc,
      joiningDate: ofrJoiningDate,
      expiresAt: ofrExpiresAt,
      status: "ISSUED",
    };
    setOffers((prev) => [newOffer, ...prev]);
    if (targetApp) {
      setApplications((prev) =>
        prev.map((a) => (a.id === targetApp.id ? { ...a, status: "OFFERED" } : a))
      );
    }
    setPlacementAlert({
      type: "OK",
      text: `Issued offer ${newOffer.offerCode} (${companyName} — ₹${parsedCtc.toFixed(2)} LPA) to ${studentName}.`,
    });
    appendAudit(
      user.email,
      user.role,
      "OFFER_LETTER_ISSUED",
      `${newOffer.offerCode} (${companyName}, ₹${parsedCtc.toFixed(2)} LPA) -> ${studentRoll}`,
      "SUCCESS"
    );
  };

  const handleRespondToOffer = (offerId: string, decision: "ACCEPTED" | "DECLINED") => {
    if (!user) return;
    const target = offers.find((o) => o.id === offerId);
    if (!target || target.status !== "ISSUED") return;

    // BRULE-35: Single Accepted Full-Time Offer Lock
    if (decision === "ACCEPTED" && target.roleType === "FULL_TIME") {
      const alreadyAcceptedFt = offers.find(
        (o) =>
          o.studentRoll === target.studentRoll &&
          o.roleType === "FULL_TIME" &&
          o.status === "ACCEPTED"
      );
      if (alreadyAcceptedFt) {
        const msg = `BRULE-35 Lock: Already accepted full-time offer from ${alreadyAcceptedFt.companyName} (${alreadyAcceptedFt.offerCode}).`;
        setPlacementAlert({ type: "ERR", text: msg });
        appendAudit(user.email, user.role, "OFFER_ACCEPT_BLOCKED", msg, "BLOCKED");
        return;
      }
      setIsPlaced(true);
    }

    setOffers((prev) =>
      prev.map((o) => {
        if (o.id === offerId) {
          return {
            ...o,
            status: decision,
            remarks: decision === "ACCEPTED" ? "Accepted via IITM BS Placement Portal" : "Declined by candidate",
          };
        }
        if (
          decision === "ACCEPTED" &&
          target.roleType === "FULL_TIME" &&
          o.studentRoll === target.studentRoll &&
          o.roleType === "FULL_TIME" &&
          o.status === "ISSUED"
        ) {
          return {
            ...o,
            status: "DECLINED",
            remarks: "Auto-closed under BRULE-35 Single Full-Time Offer Policy",
          };
        }
        return o;
      })
    );

    setPlacementAlert({
      type: "OK",
      text:
        decision === "ACCEPTED"
          ? `Offer ${target.offerCode} from ${target.companyName} ACCEPTED! Placement status updated.`
          : `Offer ${target.offerCode} from ${target.companyName} declined.`,
    });
    appendAudit(
      user.email,
      user.role,
      `OFFER_${decision}`,
      `${target.offerCode} (${target.companyName})`,
      "SUCCESS"
    );
  };

  const handleAddQuestionToBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const opts = [qbOpt0.trim(), qbOpt1.trim(), qbOpt2.trim(), qbOpt3.trim()];
    if (!qbPrompt.trim() || opts.some((o) => !o)) {
      setQbBanner({ type: "ERR", text: "Provide the question prompt and all 4 options." });
      return;
    }
    const newItem: BankQuestionItem = {
      id: `custom-${Date.now()}`,
      domain: qbDomain,
      track: qbTrack,
      prompt: qbPrompt.trim(),
      options: opts,
      correctIndex: qbCorrectIdx,
    };
    setQuestionBank((prev) => [newItem, ...prev]);
    setQbPrompt("");
    setQbOpt0("");
    setQbOpt1("");
    setQbOpt2("");
    setQbOpt3("");
    setQbCorrectIdx(0);
    setQbBanner({
      type: "OK",
      text: `Added to ${qbDomain.replace("_", " ")} • ${qbTrack.replace(
        "_",
        " "
      )} Question Bank!`,
    });
    appendAudit(
      user.email,
      user.role,
      "QUESTION_BANK_ADDED",
      `${qbDomain} / ${qbTrack}: "${newItem.prompt.slice(0, 48)}..."`,
      "SUCCESS"
    );
  };

  const handleCreateQuestionDirect = (item: Omit<BankQuestionItem, "id">) => {
    if (!user) return;
    const newItem: BankQuestionItem = {
      ...item,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setQuestionBank((prev) => [newItem, ...prev]);
    setQbBanner({
      type: "OK",
      text: `Added question to ${item.domain.replace("_", " ")} • ${
        item.track === "INTERNSHIP" ? "Internship" : "Full-Time Placement"
      } Question Bank!`,
    });
    appendAudit(
      user.email,
      user.role,
      "QUESTION_BANK_ADDED",
      `${item.domain} / ${item.track}: "${newItem.prompt.slice(0, 48)}..."`,
      "SUCCESS"
    );
  };

  const handleUpdateQuestionInBank = (updated: BankQuestionItem) => {
    if (!user) return;
    setQuestionBank((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    setQbBanner({
      type: "OK",
      text: `Updated question ${updated.id} in ${updated.domain.replace("_", " ")} bank.`,
    });
    appendAudit(
      user.email,
      user.role,
      "QUESTION_BANK_UPDATED",
      `Updated ${updated.id} (${updated.domain} / ${updated.track})`,
      "SUCCESS"
    );
  };

  const handleDeleteQuestionFromBank = (questionId: string) => {
    if (!user) return;
    try {
      const raw = localStorage.getItem("iitm_os_deleted_qb_ids_v1");
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(questionId)) {
        localStorage.setItem("iitm_os_deleted_qb_ids_v1", JSON.stringify([...arr, questionId]));
      }
    } catch {}
    setQuestionBank((prev) => prev.filter((q) => q.id !== questionId));
    setQbBanner({
      type: "OK",
      text: `Removed question ${questionId} from Question Bank.`,
    });
    appendAudit(
      user.email,
      user.role,
      "QUESTION_BANK_DELETED",
      `Deleted question ${questionId}`,
      "SUCCESS"
    );
  };

  const handleDownloadQuestionBankCsv = (domainFilter = "ALL", trackFilter = "ALL") => {
    const filtered = questionBank.filter((q) => {
      if (domainFilter !== "ALL" && q.domain !== domainFilter) return false;
      if (trackFilter !== "ALL" && q.track !== trackFilter) return false;
      return true;
    });
    const escapeCsv = (val: string) => `"${String(val || "").replace(/"/g, '""')}"`;
    const letters = ["A", "B", "C", "D"];
    const rows = [
      "ID,Question,Option A,Option B,Option C,Option D,Correct Answer,Domain,Track",
      ...filtered.map((q) =>
        [
          escapeCsv(q.id),
          escapeCsv(q.prompt),
          escapeCsv(q.options[0] || ""),
          escapeCsv(q.options[1] || ""),
          escapeCsv(q.options[2] || ""),
          escapeCsv(q.options[3] || ""),
          escapeCsv(letters[q.correctIndex] || "A"),
          escapeCsv(q.domain),
          escapeCsv(q.track === "INTERNSHIP" ? "INTERNSHIP" : "FULL_TIME"),
        ].join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = domainFilter === "ALL" ? "all_4_banks" : `${domainFilter.toLowerCase()}_${trackFilter.toLowerCase()}`;
    a.download = `iitm_question_bank_${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartRandomQuiz = () => {
    if (!user) return;
    if (activeTrack.attemptsUsed >= activeTrack.maxAttempts) {
      setQuizBanner({
        type: "BLOCKED",
        text: `BRULE-12 Enforcement: Maximum ${activeTrack.maxAttempts} assessment attempts exhausted for ${activeTrack.code}.`,
      });
      return;
    }
    const pool = questionBank.filter(
      (q) => q.domain === activeTrack.domain && q.track === activeTrack.track
    );
    const randomFifteen = drawRandomQuestions(pool, QUESTIONS_PER_QUIZ);
    setDrawnQuestions(randomFifteen);
    setQuizAnswers({});
    setQuizBanner(null);
    setSecondsLeft(QUIZ_DURATION_SECONDS);
    setIsQuizActive(true);
    appendAudit(
      user.email,
      user.role,
      "ASSESSMENT_SESSION_STARTED",
      `${activeTrack.code} • Randomly drew ${randomFifteen.length}/${pool.length} questions (30:00 timer)`,
      "SUCCESS"
    );
  };

  const handleSubmitQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    const unanswered = drawnQuestions.some((q) => quizAnswers[q.id] === undefined);
    if (unanswered) {
      setQuizBanner({
        type: "FAIL",
        text: `Please answer all ${drawnQuestions.length} randomly selected questions before submitting.`,
      });
      return;
    }
    finalizeQuizAttempt("NORMAL");
  };

  const handleSaveExaminerEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const skills = evalSkillsets
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (skills.length === 0) {
      setExaminerNotes("");
    setEvalBanner({ type: "ERR", text: "Specify at least one observed skillset." });
      return;
    }

    const tasks = isPlacementReady
      ? []
      : remedialTasksText
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean);

    if (!isPlacementReady && tasks.length === 0) {
      setEvalBanner({
        type: "ERR",
        text: "BRULE-18: When student is marked Not Ready, please mention the list of tasks the student should do.",
      });
      return;
    }

    const selectedCandidateRoll = resolveActiveStudentRoll();
    const activeSlot =
      oneOnOneSlots.find((s) => s.id === selectedSlotIdForEval) ||
      oneOnOneSlots.find(
        (s) =>
          s.status === "SCHEDULED" &&
          String(s.studentEmail || "").split("@")[0].trim().toUpperCase() === selectedCandidateRoll
      ) ||
      oneOnOneSlots.find(
        (s) => String(s.studentEmail || "").split("@")[0].trim().toUpperCase() === selectedCandidateRoll
      ) ||
      oneOnOneSlots.find((s) => s.status === "SCHEDULED");
    const slotRoll = activeSlot?.studentEmail
      ? activeSlot.studentEmail.split("@")[0].trim().toUpperCase()
      : resolveActiveStudentRoll();
    const evaluatedStudentLabel = activeSlot
      ? `${activeSlot.studentName} • Roll ${slotRoll} (${activeSlot.studentEmail})`
      : `${resolveActiveStudentRoll()} • ${user.name}`;
    const completedStamp =
      new Date().toLocaleDateString("en-IN") +
      " " +
      new Date().toLocaleTimeString("en-IN", { hour12: false }) +
      " IST";

    const cleanRoll = slotRoll.slice(0, 32);
    const record: ExaminerEvaluationRecord = {
      id: `EVAL-${Date.now()}`,
      studentRoll: cleanRoll,
      examinerEmail: user.email,
      skillsets: skills,
      programmingRating: progRating,
      dataScienceRating: dsRating,
      communicationRating: commRating,
      isPlacementReady,
      performingExceptionallyGood,
      remedialTasks: tasks,
      notes: examinerNotes.trim(),
      evaluatedAt: completedStamp,
    };

    setEvaluations((prev) => {
      const withoutSameRoll = prev.filter(
        (ev) => String(ev.studentRoll || "").trim().toUpperCase() !== cleanRoll
      );
      const next = [record, ...withoutSameRoll];
      try {
        localStorage.setItem("iitm_os_examiner_evaluations_v1", JSON.stringify(next));
      } catch {}
      return next;
    });

    if (activeSlot) {
      setOneOnOneSlots((prev) =>
        prev.map((slot) =>
          slot.id === activeSlot.id
            ? {
                ...slot,
                status: "COMPLETED",
                instructorFeedback:
                  examinerNotes.trim() ||
                  (isPlacementReady
                    ? "Cleared 1-on-1 Viva with strong technical & communication readiness."
                    : "Completed 1-on-1 Viva — please complete the assigned remedial tasks before re-evaluation."),
                isPlacementReady,
                programmingRating: progRating,
                dataScienceRating: dsRating,
                communicationRating: commRating,
                remedialTasks: tasks,
                completedAt: completedStamp,
              }
            : slot
        )
      );
      setSelectedSlotIdForEval("");
    }

    const updatedSlots = activeSlot
      ? oneOnOneSlots.map((slot) =>
          slot.id === activeSlot.id
            ? {
                ...slot,
                status: "COMPLETED" as const,
                instructorFeedback:
                  examinerNotes.trim() ||
                  (isPlacementReady
                    ? "Cleared 1-on-1 Viva with strong technical & communication readiness."
                    : "Completed 1-on-1 Viva — please complete the assigned remedial tasks before re-evaluation."),
                isPlacementReady,
                programmingRating: progRating,
                dataScienceRating: dsRating,
                communicationRating: commRating,
                remedialTasks: tasks,
                completedAt: completedStamp,
              }
            : slot
        )
      : oneOnOneSlots;
    try {
      localStorage.setItem("iitm_os_one_on_one_slots_v1", JSON.stringify(updatedSlots));
    } catch {}
    const updatedEvals = [
      record,
      ...evaluations.filter((ev) => String(ev.studentRoll || "").trim().toUpperCase() !== cleanRoll),
    ];

    void (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/portal-state/sync`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentRoll: slotRoll || resolveActiveStudentRoll(),
            trainingStages,
            activitySubmissions,
            helpdeskTickets,
            snapshot: {
              registrations,
              jobs,
              applications,
              interviews,
              offers,
              evaluations: updatedEvals,
              oneOnOneSlots: updatedSlots,
              questionBank,
              auditLogs,
              resumes,
              marksheet,
            },
          }),
        });
        if (res.ok) setDbSyncStatus("SYNCED");
      } catch {}
    })();

    if (isPlacementReady) {
      setTrainingStages((prev) =>
        prev.map((s) => (s.id === "L3-S3" ? { ...s, statusText: "Yes" } : s))
      );
    }

    setEvalBanner({
      type: "OK",
      text: `1-on-1 Viva Completed & Feedback Published for ${evaluatedStudentLabel} (${
        isPlacementReady ? "Placement Ready" : "Not Ready — Remedial Tasks Assigned"
      }).`,
    });
    appendAudit(
      user.email,
      user.role,
      "EXAMINER_INTERVIEW_EVALUATED",
      `Prog ${progRating}/5 | DS ${dsRating}/5 | Comm ${commRating}/5 | Ready: ${
        isPlacementReady ? "Yes" : "No"
      } | Exceptional: ${performingExceptionallyGood ? "Yes" : "No"}`,
      "SUCCESS"
    );
  };

  const ingestParsedSlotRows = (rawRows: Record<string, unknown>[], sourceLabel: string) => {
    const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");
    const imported: OneOnOneSlotRecord[] = [];

    rawRows.forEach((row, idx) => {
      const mapped: Record<string, string> = {};
      Object.entries(row).forEach(([k, v]) => {
        mapped[normalizeKey(k)] = String(v ?? "").trim();
      });

      const studentEmail = mapped["studentemail"] || mapped["email"] || mapped["mail"] || "";
      const studentName = mapped["studentname"] || mapped["student"] || "";
      let date = mapped["date"] || mapped["slotdate"] || mapped["vivadate"] || mapped["availabledate"] || "";
      if (/^\d+(\.\d+)?$/.test(date)) {
        const serial = Math.floor(Number(date));
        const utcDays = serial - 25569;
        const dt = new Date(utcDays * 86400 * 1000);
        if (!Number.isNaN(dt.getTime())) {
          date = dt.toISOString().slice(0, 10);
        }
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        const [dd, mm, yyyy] = date.split("-");
        date = `${yyyy}-${mm}-${dd}`;
      } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(date)) {
        const [p1, p2, p3] = date.split("/");
        const yyyy = p3.length === 2 ? `20${p3}` : p3;
        const mm = p1.padStart(2, "0");
        const dd = p2.padStart(2, "0");
        date = `${yyyy}-${mm}-${dd}`;
      }
      const slotTime = mapped["slottime"] || mapped["timeslot"] || mapped["time"] || mapped["slot"] || "";
      const instructor = mapped["instructor"] || mapped["examiner"] || mapped["examinername"] || mapped["name"] || mapped["mentor"] || mapped["panelist"] || "";
      const domain = mapped["domain"] || mapped["track"] || "Data Science";
      const instructorEmail = mapped["examineremail"] || mapped["instructoremail"] || "";

      // Mode A: Examiner Availability row (no Student Email / Student Name) -> publish to Examiner Slot Pool (deduplicated)
      if (!studentEmail && !studentName) {
        if (!instructor || !date || !slotTime) return;
        setExaminerSlots((prev) => {
          const cleanPrev = prev.filter((s) => !/^\d+(\.\d+)?$/.test(String(s.date || "")));
          const exists = cleanPrev.some(
            (s) =>
              s.instructor.trim().toLowerCase() === instructor.trim().toLowerCase() &&
              s.date.trim() === date.trim() &&
              s.slotTime.trim().toLowerCase() === slotTime.trim().toLowerCase()
          );
          if (exists) return cleanPrev;
          return [
            ...cleanPrev,
            {
              id: `EXPOOL-${Date.now()}-${idx + 1}`,
              instructor,
              instructorEmail,
              date,
              slotTime,
              domain,
              status: "OPEN",
            },
          ];
        });
        imported.push({
          id: `__POOL__-${idx}`,
          studentEmail: "",
          studentName: "",
          date,
          slotTime,
          instructor,
          status: "SCHEDULED",
        });
        return;
      }

      // Mode B: Direct Student Allotment row (Email + Student Name + Date + Slot Time + Instructor)
      if (!date || !slotTime || !instructor) return;
      imported.push({
        id: `SLOT-${Date.now()}-${idx + 1}`,
        studentEmail: studentEmail || `${studentName.toLowerCase().replace(/\s+/g, ".")}@ds.study.iitm.ac.in`,
        studentName: studentName || studentEmail.split("@")[0],
        date,
        slotTime,
        instructor,
        status: "SCHEDULED",
      });
    });

    const poolCount = imported.filter((r) => r.id.startsWith("__POOL__")).length;
    const directAssigned = imported.filter((r) => !r.id.startsWith("__POOL__"));

    if (imported.length === 0) {
      setSlotUploadAlert({
        type: "ERR",
        text: "No valid rows found. Use columns: Instructor, Date, Slot Time, Domain",
      });
      return;
    }

    if (poolCount > 0 && directAssigned.length === 0) {
      setSlotUploadAlert({
        type: "OK",
        text: `Published ${poolCount} Examiner availability slot(s) from ${sourceLabel}. Unlocked students can now pick 1 preferred slot.`,
      });
      return;
    }

    setOneOnOneSlots((prev) => {
      const updated = [...prev];
      directAssigned.forEach((item) => {
        const existingIdx = updated.findIndex(
          (s) =>
            s.studentEmail.toLowerCase() === item.studentEmail.toLowerCase() &&
            s.status === "SCHEDULED"
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = { ...updated[existingIdx], ...item, id: updated[existingIdx].id };
        } else {
          updated.unshift(item);
        }
      });
      return updated;
    });

    setSlotUploadAlert({
      type: "OK",
      text: `Synced ${imported.length} 1-on-1 slot(s) from ${sourceLabel} to Examiner & Student dashboards.`,
    });
    if (user) {
      appendAudit(
        user.email,
        user.role,
        "ONE_ON_ONE_SLOTS_BULK_UPLOADED",
        `${imported.length} slot(s) imported via ${sourceLabel}`,
        "SUCCESS"
      );
    }
  };

  const handleSpreadsheetSlotFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "", raw: false });
      ingestParsedSlotRows(rows, file.name);
    } catch {
      setSlotUploadAlert({
        type: "ERR",
        text: "Could not parse spreadsheet. Please upload a valid .csv, .xlsx, or .xls file.",
      });
    } finally {
      e.target.value = "";
    }
  };

  const handlePasteSlotRowsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotPasteText.trim()) return;
    try {
      const wb = XLSX.read(slotPasteText.trim(), { type: "string" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
      ingestParsedSlotRows(rows, "Pasted Spreadsheet Table");
      setSlotPasteText("");
    } catch {
      setSlotUploadAlert({
        type: "ERR",
        text: "Failed to parse pasted rows. Include header row: Email, Student Name, Date, Slot Time, Instructor.",
      });
    }
  };

  const handleAddSingleSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSlotEmail.trim() || !manualSlotName.trim() || !manualSlotDate.trim() || !manualSlotTime.trim() || !manualSlotInstructor.trim()) {
      setSlotUploadAlert({ type: "ERR", text: "Fill in all 5 fields (Email, Student Name, Date, Slot Time, Instructor)." });
      return;
    }
    ingestParsedSlotRows(
      [
        {
          Email: manualSlotEmail.trim(),
          "Student Name": manualSlotName.trim(),
          Date: manualSlotDate.trim(),
          "Slot Time": manualSlotTime.trim(),
          Instructor: manualSlotInstructor.trim(),
        },
      ],
      "Manual Slot Entry"
    );
    setManualSlotEmail("");
    setManualSlotName("");
    setManualSlotDate("");
    setManualSlotTime("");
  };

  const handleDownloadSampleSlotsCsv = () => {
    const csvContent = [
      "Instructor,Date,Slot Time,Domain",
      "Lalit,2026-11-28,10:00 AM - 10:30 AM IST,Data Science",
      "Lalit,2026-11-28,11:00 AM - 11:30 AM IST,Data Science",
      "Dr. R. Subramanian,2026-11-28,02:00 PM - 02:30 PM IST,Software Development",
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iitm_examiner_availability_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Increment 3: Live Eligibility Engine Evaluation (BRULE-21 to BRULE-25)
  const computeTrainingAndActivityProgress = () => {
    const l1Stages = trainingStages.filter((s) => s.level === 1);
    const l1Max = l1Stages.reduce((acc, s) => acc + s.maxMarks, 0);
    const l1Obt = l1Stages.reduce((acc, s) => acc + s.obtainedMarks, 0);
    const l1Pct = l1Max ? (l1Obt / l1Max) * 100 : 0;
    const l1StagesPassed = l1Stages.every((s) => s.obtainedMarks >= s.minRequired);
    const l1Passed = l1StagesPassed && l1Pct >= 80;

    const l2Stages = trainingStages.filter((s) => s.level === 2);
    const l2Max = l2Stages.reduce((acc, s) => acc + s.maxMarks, 0);
    const l2Obt = l2Stages.reduce((acc, s) => acc + s.obtainedMarks, 0);
    const l2Pct = l2Max ? (l2Obt / l2Max) * 100 : 0;
    const l2StagesPassed = l2Stages.every((s) => s.obtainedMarks >= s.minRequired);
    const l2Passed = l2StagesPassed && l2Pct >= 60;

    const l3TechTest = trainingStages.find((s) => s.id === "L3-S1")!;
    const l3AiMock = trainingStages.find((s) => s.id === "L3-S2")!;
    const l3OneOnOne = trainingStages.find((s) => s.id === "L3-S3")!;
    const l3PreSessionPassed =
      l3TechTest.obtainedMarks >= l3TechTest.minRequired && l3AiMock.statusText === "Hire";

    // Filter valid activity submissions (within 1-year validity)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const activeRollForPoints = resolveActiveStudentRoll();
    const validSubmittedIds = new Set(
      activitySubmissions
        .filter((sub) => {
          const subRoll = (sub.studentEmail || "").split("@")[0].trim().toUpperCase();
          return (
            subRoll === activeRollForPoints &&
            sub.reviewStatus === "APPROVED" &&
            new Date(sub.completedDate) >= oneYearAgo
          );
        })
        .map((sub) => sub.activityId)
    );

    const table1Points = ACTIVITY_CATALOG.filter(
      (a) => a.table === "TABLE_1" && validSubmittedIds.has(a.id)
    ).reduce((sum, a) => sum + a.points, 0);

    const table2Points = ACTIVITY_CATALOG.filter(
      (a) =>
        a.table === "TABLE_2" &&
        a.domain === studentTargetDomain &&
        validSubmittedIds.has(a.id)
    ).reduce((sum, a) => sum + a.points, 0);

    const table3Points = ACTIVITY_CATALOG.filter(
      (a) =>
        a.table === "TABLE_3" &&
        a.domain === studentTargetDomain &&
        validSubmittedIds.has(a.id)
    ).reduce((sum, a) => sum + a.points, 0);

    const requiredTotalPoints = studentApplyingTrack === "INTERNSHIP" ? 25 : 50;
    const earnedPointsForTrack =
      studentApplyingTrack === "INTERNSHIP"
        ? table1Points + table2Points
        : table1Points + table2Points + table3Points;

    const internshipPointsMet =
      table1Points >= 10 && table2Points >= 15 && table1Points + table2Points >= 25;
    const fullTimePointsMet =
      table1Points >= 10 &&
      table2Points >= 15 &&
      table3Points >= 25 &&
      table1Points + table2Points + table3Points >= 50;

    const meetsTableMinimums =
      studentApplyingTrack === "INTERNSHIP" ? internshipPointsMet : fullTimePointsMet;

    const matchingDomainTracks = tracks.filter((t) => t.domain === studentTargetDomain);
    const internshipTrackObj = matchingDomainTracks.find((t) => t.track === "INTERNSHIP");
    const fullTimeTrackObj = matchingDomainTracks.find((t) => t.track !== "INTERNSHIP");

    const hasInternshipBadge = internshipTrackObj
      ? badges.some((b) => b.courseCode === internshipTrackObj.code && b.scorePct >= 75)
      : false;
    const hasFullTimeBadge = fullTimeTrackObj
      ? badges.some((b) => b.courseCode === fullTimeTrackObj.code && b.scorePct >= 75)
      : false;

    const domainTrackQuizPassed =
      studentApplyingTrack === "INTERNSHIP"
        ? hasInternshipBadge
        : studentApplyingTrack === "FULL_TIME"
        ? hasFullTimeBadge
        : hasInternshipBadge || hasFullTimeBadge;

    const eligibleForOneOnOne = l1Passed && l2Passed && l3PreSessionPassed && meetsTableMinimums;
    const studentEval = evaluations.find(
      (ev) => String(ev.studentRoll || "").trim().toUpperCase() === activeRollForPoints
    );
    const oneOnOneCleared = studentEval
      ? Boolean(studentEval.isPlacementReady)
      : l3OneOnOne.statusText === "Yes";
    const overallPlacementReady = eligibleForOneOnOne && domainTrackQuizPassed && oneOnOneCleared;

    return {
      l1Obt,
      l1Max,
      l1Pct,
      l1Passed,
      l2Obt,
      l2Max,
      l2Pct,
      l2Passed,
      l3PreSessionPassed,
      table1Points,
      table2Points,
      table3Points,
      earnedPointsForTrack,
      requiredTotalPoints,
      meetsTableMinimums,
      eligibleForOneOnOne,
      oneOnOneCleared,
      overallPlacementReady,
    };
  };

  const handleLogActivityPoint = (e: React.FormEvent) => {
    e.preventDefault();
    setActivityAlert(null);
    const parsedDrive = parseGoogleDriveLink(activityProofUrl);
    if (!parsedDrive.isValid) {
      setActivityAlert(
        "Invalid Google Drive Link: Please upload your PDF or JPG to Google Drive (@ds.study.iitm.ac.in), enable 'Anyone with the link can view', and paste the drive.google.com share URL."
      );
      return;
    }
    const item = ACTIVITY_CATALOG.find((a) => a.id === selectedActivityToLog);
    if (!item) return;

    const cleanLabel =
      activityEvidenceLabel.trim() ||
      `Google Drive • ${item.title} (${parsedDrive.fileId ? `ID: ${parsedDrive.fileId.slice(0, 8)}...` : "Shared File"})`;

    setActivitySubmissions((prev) => {
      const filtered = prev.filter((s) => s.activityId !== item.id);
      return [
        {
          id: `ACT-${Math.floor(205 + Math.random() * 790)}`,
          studentName: fullName || user?.name || "Student",
          studentEmail: user?.email || "student@ds.study.iitm.ac.in",
          activityId: item.id,
          evidenceFileName: cleanLabel,
          evidenceFileType: "GDRIVE",
          evidenceFileSize: "Google Drive",
          proofUrl: parsedDrive.viewUrl,
          completedDate: activityCompletedDate || "2026-11-15",
          reviewStatus: "PENDING_COORDINATOR",
        },
        ...filtered,
      ];
    });
    setActivityProofUrl("");
    setActivityEvidenceLabel("");
    appendAudit(
      user?.email || "student@ds.study.iitm.ac.in",
      user?.role || "STUDENT",
      "GDRIVE_EVIDENCE_SUBMITTED",
      `${item.title} -> Google Drive Link submitted for Training Coordinator review`,
      "SUCCESS"
    );
  };

  const handleCoordinatorReviewActivity = (
    submissionId: string,
    decision: "APPROVED" | "REJECTED",
    note?: string
  ) => {
    setActivitySubmissions((prev) =>
      prev.map((sub) =>
        sub.id === submissionId
          ? {
              ...sub,
              reviewStatus: decision,
              reviewerNote:
                note ||
                (decision === "APPROVED"
                  ? "Evidence verified by IIC Training Coordinator"
                  : "Evidence unclear or invalid — re-upload valid PDF/JPG"),
            }
          : sub
      )
    );
    appendAudit(
      user?.email || "coordinator@iitm.ac.in",
      "TRAINING_COORDINATOR",
      `ACTIVITY_${decision}`,
      `Submission ${submissionId} marked ${decision}`,
      "SUCCESS"
    );
  };

  const handleCoordinatorUpdateStageScore = (
    stageId: string,
    newMarksOrOutcome: string,
    incrementAttempt: boolean
  ) => {
    setCoordFeedback(null);
    const stage = trainingStages.find((s) => s.id === stageId);
    if (!stage || stage.evaluationType === "ONE_ON_ONE") return;

    if (incrementAttempt && stage.attemptsUsed >= stage.maxAttempts) {
      setCoordFeedback({
        type: "ERR",
        text: `Blocked: ${stage.id} (${stage.title}) has already used ${stage.maxAttempts}/${stage.maxAttempts} attempts.`,
      });
      return;
    }

    const nextAttempt = incrementAttempt
      ? Math.min(stage.maxAttempts, stage.attemptsUsed + 1)
      : Math.max(1, stage.attemptsUsed);

    if (stage.evaluationType === "MARKS") {
      const parsed = Number(newMarksOrOutcome);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > stage.maxMarks) {
        setCoordFeedback({
          type: "ERR",
          text: `Invalid marks for ${stage.id}: Enter a value between 0 and ${stage.maxMarks}.`,
        });
        return;
      }
      setTrainingStages((prev) =>
        prev.map((s) =>
          s.id === stageId
            ? {
                ...s,
                obtainedMarks: parsed,
                attemptsUsed: nextAttempt,
                statusText: parsed >= s.minRequired ? "PASSED" : "BELOW_CUTOFF",
              }
            : s
        )
      );
      setCoordFeedback({
        type: "OK",
        text: `Updated ${coordTargetRoll} • ${stage.id} (${stage.title}): ${parsed}/${stage.maxMarks} (Attempt ${nextAttempt}/${stage.maxAttempts}).`,
      });
      appendAudit(
        user?.email || "coordinator@iitm.ac.in",
        "TRAINING_COORDINATOR",
        "TRAINING_STAGE_UPDATED",
        `${coordTargetRoll} • ${stage.id}: ${parsed}/${stage.maxMarks} (Attempt ${nextAttempt}/2)`,
        "SUCCESS"
      );
    } else if (stage.evaluationType === "AI_MOCK") {
      const outcome = newMarksOrOutcome === "Hire" ? "Hire" : "No-Hire";
      setTrainingStages((prev) =>
        prev.map((s) =>
          s.id === stageId
            ? {
                ...s,
                attemptsUsed: nextAttempt,
                statusText: outcome,
              }
            : s
        )
      );
      setCoordFeedback({
        type: "OK",
        text: `Updated ${coordTargetRoll} • ${stage.id} (${stage.title}): ${outcome} (Attempt ${nextAttempt}/${stage.maxAttempts}).`,
      });
      appendAudit(
        user?.email || "coordinator@iitm.ac.in",
        "TRAINING_COORDINATOR",
        "AI_MOCK_OUTCOME_UPDATED",
        `${coordTargetRoll} • ${stage.id}: ${outcome} (Attempt ${nextAttempt}/2)`,
        "SUCCESS"
      );
    }
  };

  const handleDownloadSampleTrainingCsv = () => {
    const header = "roll_no,stage_id,attempt_no,score_or_outcome";
    const sampleRows = [
      `${coordTargetRoll},L1-S1,1,18`,
      `${coordTargetRoll},L1-S2,1,17`,
      `${coordTargetRoll},L1-S3,2,18`,
      `${coordTargetRoll},L1-S4,1,36`,
      `${coordTargetRoll},L1-S5,1,18`,
      `${coordTargetRoll},L2-S1,1,16`,
      `${coordTargetRoll},L2-S2,1,25`,
      `${coordTargetRoll},L2-S3,1,24`,
      `${coordTargetRoll},L3-S1,1,20`,
      `${coordTargetRoll},L3-S2,1,Hire`,
    ];
    const blob = new Blob([[header, ...sampleRows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iitm_training_scores_${coordTargetRoll}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchTrainingCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoordFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || "");
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        setCoordFeedback({ type: "ERR", text: "CSV file is empty. Include header and at least one score row." });
        return;
      }

      const updatesByRoll = new Map<string, Map<string, { attemptNo: number; rawVal: string }>>();
      const errors: string[] = [];
      let appliedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        if (cols.length < 4) {
          errors.push(`Row ${i + 1}: Expected 4 columns (roll_no,stage_id,attempt_no,score_or_outcome).`);
          continue;
        }
        const [rawRoll, stageId, attemptStr, rawVal] = cols;
        const rollNo = rawRoll.trim().toUpperCase();
        if (!rollNo) {
          errors.push(`Row ${i + 1}: Missing roll_no.`);
          continue;
        }
        const stage = INITIAL_TRAINING_STAGES.find((s) => s.id === stageId.toUpperCase());
        if (!stage || stage.evaluationType === "ONE_ON_ONE") {
          errors.push(`Row ${i + 1}: Unknown or Examiner-only stage '${stageId}'.`);
          continue;
        }
        const attemptNo = Number(attemptStr);
        if (![1, 2].includes(attemptNo)) {
          errors.push(`Row ${i + 1} (${rollNo}): Attempt ${attemptStr} violates max 2 attempts rule.`);
          continue;
        }
        if (stage.evaluationType === "MARKS") {
          const score = Number(rawVal);
          if (Number.isNaN(score) || score < 0 || score > stage.maxMarks) {
            errors.push(`Row ${i + 1} (${stage.id}): Score '${rawVal}' out of range 0-${stage.maxMarks}.`);
            continue;
          }
        }
        if (!updatesByRoll.has(rollNo)) {
          updatesByRoll.set(rollNo, new Map());
        }
        updatesByRoll.get(rollNo)!.set(stage.id, { attemptNo, rawVal });
        appliedCount++;
      }

      const applyStageUpdates = (
        baseStages: TrainingStageScore[],
        stageMap: Map<string, { attemptNo: number; rawVal: string }>
      ): TrainingStageScore[] =>
        baseStages.map((st) => {
          const upd = stageMap.get(st.id);
          if (!upd) return st;
          if (st.evaluationType === "MARKS") {
            const score = Number(upd.rawVal);
            return {
              ...st,
              attemptsUsed: upd.attemptNo,
              obtainedMarks: score,
              statusText: score >= st.minRequired ? "PASSED" : "BELOW_CUTOFF",
            };
          }
          const outcome = upd.rawVal.toLowerCase() === "hire" ? "Hire" : "No-Hire";
          return {
            ...st,
            attemptsUsed: upd.attemptNo,
            statusText: outcome,
          };
        });

      const activeCoordRoll = coordTargetRoll.trim().toUpperCase();
      const persistedRolls: string[] = [];
      for (const [rollNo, stageMap] of updatesByRoll.entries()) {
        try {
          const bootRes = await fetch(
            `${API_BASE_URL}/api/v1/portal-state/bootstrap?student_roll=${encodeURIComponent(rollNo)}&scope_student_only=true`
          );
          const bootData = bootRes.ok ? await bootRes.json() : {};
          const existingStages: TrainingStageScore[] =
            Array.isArray(bootData.trainingStages) && bootData.trainingStages.length > 0
              ? bootData.trainingStages
              : INITIAL_TRAINING_STAGES;
          const mergedStages = applyStageUpdates(existingStages, stageMap);

          if (rollNo === activeCoordRoll) {
            setTrainingStages(mergedStages);
          }

          const syncRes = await fetch(`${API_BASE_URL}/api/v1/portal-state/sync`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentRoll: rollNo,
              trainingStages: mergedStages,
            }),
          });
          if (!syncRes.ok) {
            const errTxt = await syncRes.text();
            errors.push(`Roll ${rollNo}: Backend sync failed (${syncRes.status} ${errTxt})`);
          } else {
            persistedRolls.push(rollNo);
          }
        } catch (err) {
          errors.push(`Roll ${rollNo}: Network error during sync`);
          if (rollNo === activeCoordRoll) {
            setTrainingStages((prev) => applyStageUpdates(prev, stageMap));
          }
        }
      }

      setTrainingStagesByRoll((prev) => {
        const next = { ...prev };
        for (const [rNo, sMap] of updatesByRoll.entries()) {
          const base = Array.isArray(next[rNo]) && next[rNo].length > 0 ? next[rNo] : INITIAL_TRAINING_STAGES;
          next[rNo] = applyStageUpdates(base, sMap);
        }
        return next;
      });
      const uploadedRolls = Array.from(updatesByRoll.keys());
      const focusRoll = uploadedRolls[uploadedRolls.length - 1];
      if (focusRoll && !updatesByRoll.has(activeCoordRoll)) {
        setCoordTargetRoll(focusRoll);
      }

      appendAudit(
        user?.email || "coordinator@iitm.ac.in",
        "TRAINING_COORDINATOR",
        "BATCH_TRAINING_CSV_UPLOADED",
        `Applied ${appliedCount} stage updates across ${updatesByRoll.size} student(s) (${errors.length} rejected)`,
        appliedCount > 0 ? "SUCCESS" : "BLOCKED"
      );

      if (appliedCount > 0) {
        setCoordFeedback({
          type: "OK",
          text: `Batch CSV processed: ${appliedCount} stage record(s) updated & persisted to PostgreSQL across ${updatesByRoll.size} student(s) (${Array.from(updatesByRoll.keys()).join(", ")}).${errors.length > 0 ? ` (${errors.length} row(s) skipped)` : ""}`,
        });
      } else {
        setCoordFeedback({
          type: "ERR",
          text: errors[0] || "No valid stage updates found in CSV.",
        });
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const handleAttemptTrainingStage = (stageId: string) => {
    setActivityAlert(null);
    setTrainingStages((prev) =>
      prev.map((st) => {
        if (st.id !== stageId) return st;
        if (st.attemptsUsed >= st.maxAttempts) return st;
        const nextAttempt = st.attemptsUsed + 1;
        if (st.evaluationType === "MARKS") {
          const improvedScore = Math.min(st.maxMarks, Math.max(st.minRequired + 1, st.obtainedMarks + 2));
          return {
            ...st,
            attemptsUsed: nextAttempt,
            obtainedMarks: improvedScore,
            statusText: improvedScore >= st.minRequired ? "PASSED" : "BELOW_CUTOFF",
          };
        }
        return {
          ...st,
          attemptsUsed: nextAttempt,
          statusText: "Hire",
        };
      })
    );
  };

  const handleSimulateOneOnOneSignoff = () => {
    const progress = computeTrainingAndActivityProgress();
    if (!progress.eligibleForOneOnOne) {
      setActivityAlert(
        `1-on-1 Session Blocked: Requires Level 1 (80%), Level 2 (60%), Level 3 Test + AI Mock Hire, and minimum ${progress.requiredTotalPoints} Activity Points (${progress.earnedPointsForTrack}/${progress.requiredTotalPoints} earned).`
      );
      return;
    }
    setTrainingStages((prev) =>
      prev.map((s) => (s.id === "L3-S3" ? { ...s, statusText: "Yes" } : s))
    );
    setEvaluations((prev) =>
      prev.length
        ? [{ ...prev[0], isPlacementReady: true }, ...prev.slice(1)]
        : [
            {
              id: `EVAL-${Date.now()}`,
              studentRoll: "22F3001234",
              examinerEmail: "examiner@iitm.ac.in",
              skillsets: ["Core Domain", "Problem Solving"],
              programmingRating: 4,
              dataScienceRating: 4,
              communicationRating: 4,
              isPlacementReady: true,
              performingExceptionallyGood: false,
              remedialTasks: [],
              notes: "Cleared 1-on-1 Examiner Readiness Viva.",
              evaluatedAt: new Date().toLocaleTimeString("en-IN", { hour12: false }),
            },
          ]
    );
    appendAudit(
      "examiner@iitm.ac.in",
      "EXAMINER",
      "ONE_ON_ONE_READINESS_APPROVED",
      `1-on-1 Session Readiness = Yes (${progress.earnedPointsForTrack} Activity Pts)`,
      "SUCCESS"
    );
  };

  const evaluateEligibilityForDrive = (job: JobDriveItem): { eligible: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    const parsedCgpa = parseFloat(cgpaInput) || 0;
    const latestEval = evaluations[0];
    const examinerReady = Boolean(latestEval && latestEval.isPlacementReady);
    const earnedSkillNames = new Set(badges.map((b) => b.skillName));

    if (isPlaced && job.roleType === "FULL_TIME") {
      reasons.push("BRULE-21: Student already holds an accepted full-time placement offer.");
    }
    if (parsedCgpa < job.minCgpa) {
      reasons.push(`BRULE-23: Minimum CGPA ${job.minCgpa.toFixed(2)} required (yours: ${parsedCgpa.toFixed(2)}).`);
    }
    if (activeBacklogs > job.maxBacklogs) {
      reasons.push(`BRULE-23: Max ${job.maxBacklogs} active backlogs allowed (yours: ${activeBacklogs}).`);
    }
    if (!job.allowedLevels.includes(programLevel)) {
      reasons.push(`BRULE-24: Requires level ${job.allowedLevels.join("/")} (yours: ${programLevel}).`);
    }
    if (studentApplyingTrack !== "BOTH" && job.roleType !== studentApplyingTrack) {
      reasons.push(`BRULE-22: Registered track is ${studentApplyingTrack}, not ${job.roleType}.`);
    }
    const trackDomainObj = tracks.find(
      (t) => t.domain === job.domain && t.track === job.roleType
    );
    const passedTrackQuiz = trackDomainObj
      ? badges.some((b) => b.courseCode === trackDomainObj.code && b.scorePct >= 75)
      : badges.some((b) => b.scorePct >= 75);
    if (!passedTrackQuiz) {
      reasons.push(
        `BRULE-25: Mandatory proctored 15-question ${job.domain.replace("_", " ")} (${job.roleType}) quiz (>= 75%) not yet passed.`
      );
    }
    if (!examinerReady) {
      reasons.push("BRULE-25: Requires 'Placement Ready' declaration by the Examiner after your 1-on-1 interview.");
    }
    const missingBadges = job.requiredSkillTags.filter((tag) => !earnedSkillNames.has(tag));
    if (missingBadges.length > 0) {
      reasons.push(`BRULE-25: Missing verified quiz badge: ${missingBadges.join(", ")}.`);
    }

    return { eligible: reasons.length === 0, reasons };
  };

  const handleApplyToDrive = (job: JobDriveItem) => {
    if (!user) return;
    if (applications.some((a) => a.jobId === job.id)) {
      setJobAlert({ type: "ERR", text: `You have already applied to ${job.companyName} (${job.jobCode}).` });
      return;
    }

    const elig = evaluateEligibilityForDrive(job);
    if (!elig.eligible) {
      setJobAlert({
        type: "ERR",
        text: `Application Blocked by Eligibility Engine: ${elig.reasons.join(" ")}`,
      });
      appendAudit(
        user.email,
        user.role,
        "APPLICATION_ELIGIBILITY_BLOCKED",
        `${job.jobCode} • ${elig.reasons.join(" | ")}`,
        "BLOCKED"
      );
      return;
    }

    const chosenResume =
      resumes.find((r) => r.id === selectedResumeIdForApply) || resumes[0];
    if (!chosenResume) {
      setJobAlert({ type: "ERR", text: "Upload at least one PDF resume in your vault before applying." });
      return;
    }

    const newApp: JobApplicationRecord = {
      id: `APP-${Math.floor(1000 + Math.random() * 9000)}`,
      jobId: job.id,
      jobCode: job.jobCode,
      companyName: job.companyName,
      jobTitle: job.title,
      roleType: job.roleType,
      studentRoll: user.name,
      studentName: fullName,
      studentCgpa: (parseFloat(cgpaInput) || 0).toFixed(2),
      resumeTitle: chosenResume.title,
      status: "APPLIED",
      appliedAt: new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST",
    };

    setApplications((prev) => [newApp, ...prev]);
    setJobAlert({
      type: "OK",
      text: `Application ${newApp.id} submitted to ${job.companyName} with ${chosenResume.title}.`,
    });
    appendAudit(
      user.email,
      user.role,
      "JOB_APPLICATION_SUBMITTED",
      `${job.jobCode} (${job.companyName}) • Resume: ${chosenResume.title}`,
      "SUCCESS"
    );
  };

  const handleJdPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setJobAlert({ type: "ERR", text: "Only PDF files (.pdf) are supported for JD upload." });
      e.target.value = "";
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setJobAlert({
        type: "ERR",
        text: "JD PDF must be 2.5 MB or smaller. Compress the PDF or paste the plain-text JD.",
      });
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setNewJdPdfName(file.name);
        setNewJdPdfDataUrl(reader.result);
        setJobAlert({ type: "OK", text: `Attached JD PDF: ${file.name}` });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCreateNewDrive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const code = newJobCode.trim().toUpperCase();
    if (!code || !newCompany.trim() || !newJobTitle.trim()) {
      setJobAlert({ type: "ERR", text: "Job Code, Company Name, and Title are required." });
      return;
    }
    if (!newJobDomain) {
      setJobAlert({
        type: "ERR",
        text: "Please select a Target Domain (Data Science or Software Development) before publishing.",
      });
      return;
    }
    const minCg = parseFloat(newMinCgpa);
    if (isNaN(minCg) || minCg < 0 || minCg > 10) {
      setJobAlert({ type: "ERR", text: "Minimum CGPA must be between 0.00 and 10.00." });
      return;
    }

    if (!newJdText.trim() && !newJdPdfDataUrl) {
      setJobAlert({
        type: "ERR",
        text: "Please either paste the Job Description (JD) text or upload a JD PDF before publishing.",
      });
      return;
    }

    const parsedSkills = newRequiredSkillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedOpenings = Math.max(1, parseInt(newOpeningsCount, 10) || 1);
    const parsedBacklogs = Math.max(0, parseInt(newMaxBacklogs, 10) || 0);
    const summaryExcerpt = newJdText.trim()
      ? newJdText.trim().slice(0, 170) + (newJdText.trim().length > 170 ? "..." : "")
      : `Official PDF Job Description attached (${newJdPdfName || "JD.pdf"}). Click View Full JD for complete role details.`;

    const created: JobDriveItem = {
      id: `job-${Date.now()}`,
      jobCode: code,
      companyName: newCompany.trim(),
      title: newJobTitle.trim(),
      roleType: newRoleType,
      domain: newJobDomain,
      location: newLocation.trim() || "Remote / India",
      workMode: newWorkMode,
      compensation: newCompensation.trim() || "Competitive",
      openingsCount: parsedOpenings,
      applicationDeadline: newApplicationDeadline || "2026-12-31",
      selectionRounds: newSelectionRounds.trim() || "Resume Shortlist → Technical Interview → HR",
      description: summaryExcerpt,
      jdText: newJdText.trim() || undefined,
      jdPdfName: newJdPdfName || undefined,
      jdPdfDataUrl: newJdPdfDataUrl || undefined,
      postedByEmail: user.email,
      postedAt: new Date().toLocaleDateString("en-IN"),
      minCgpa: minCg,
      maxBacklogs: parsedBacklogs,
      allowedLevels: newRoleType === "INTERNSHIP" ? ["DIPLOMA", "BSC", "BS"] : ["BSC", "BS"],
      requireExaminerReady: newRequireReady,
      requiredSkillTags: parsedSkills,
    };

    setJobs((prev) => [created, ...prev]);
    setNewJobDomain("");
    setNewJobCode(`DRV-2026-${Math.floor(100 + Math.random() * 899)}`);
    setNewJdText("");
    setNewJdPdfName("");
    setNewJdPdfDataUrl("");
    setJobAlert({
      type: "OK",
      text: `Published ${created.roleType === "INTERNSHIP" ? "Internship" : "Full-Time (FTE)"} Opportunity ${created.jobCode}: ${created.companyName} — ${created.title}. Live now on Student & Admin Opportunities tabs.`,
    });
    if (user.role === "RECRUITER") {
      setRecruiterWorkspaceView("MY_DRIVES");
    }
    appendAudit(
      user.email,
      user.role,
      "JOB_POSTING_CREATED",
      `${created.jobCode} (${created.companyName} • Min CGPA ${created.minCgpa.toFixed(2)})`,
      "SUCCESS"
    );
  };

  const handleUpdateApplicationStatus = (appId: string, nextStatus: AppStatusOption) => {
    if (!user) return;
    let targetApp: JobApplicationRecord | undefined;
    setApplications((prev) =>
      prev.map((a) => {
        if (a.id !== appId) return a;
        targetApp = { ...a, status: nextStatus };
        return targetApp;
      })
    );

    if (targetApp && nextStatus === "OFFER_ACCEPTED" && targetApp.roleType === "FULL_TIME") {
      setIsPlaced(true);
    }

    if (targetApp) {
      appendAudit(
        user.email,
        user.role,
        "APPLICATION_STATUS_UPDATED",
        `${targetApp.id} (${targetApp.companyName}) -> ${nextStatus}${
          nextStatus === "OFFER_ACCEPTED" && targetApp.roleType === "FULL_TIME"
            ? " [BRULE-21 Placement Lock Activated]"
            : ""
        }`,
        "SUCCESS"
      );
    }
  };

  if (!user) {
    if (onboardingStep === "STUDENT_FORM") {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
                  <GraduationCap className="w-4 h-4" />
                  Step 1 of 2 • Student Registration & Eligibility Verification
                </div>
                <h1 className="text-xl font-bold text-white">New Student Registration</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  All fields marked with <span className="text-rose-400 font-bold">*</span> are
                  mandatory. Your domain & degree eligibility will be verified upon submission.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetStudentDraft();
                  setOnboardingStep("AUTH");
                  setAuthMode("SIGN_IN");
                  setAuthError(null);
                  setEligibilityVerdict(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-slate-700"
              >
                ← Back to Sign In
              </button>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {eligibilityVerdict && !eligibilityVerdict.eligible && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs space-y-1.5">
                <div className="font-semibold flex items-center gap-2 text-amber-300">
                  <XCircle className="w-4 h-4 shrink-0" />
                  Eligibility Requirement Not Met
                </div>
                <p>{eligibilityVerdict.message}</p>
                <p className="text-[11px] text-amber-300/80">
                  Rule: Internship requires minimum 1 Diploma in the exact chosen domain (Diploma in
                  Data Science for Data Science; Diploma in Programming for Software Development).
                  Full-Time placement requires minimum BSc Pass.
                </p>
              </div>
            )}

            <form onSubmit={handleStudentRegistrationSubmit} autoComplete="off" className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentDraft.fullName}
                    onChange={(e) => setStudentDraft({ ...studentDraft, fullName: e.target.value })}
                    placeholder="e.g., Ananya Krishnan"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    IITM Student Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={studentDraft.email}
                    onChange={(e) => setStudentDraft({ ...studentDraft, email: e.target.value })}
                    placeholder="23f1002345@ds.study.iitm.ac.in"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Create Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={4}
                    value={studentDraft.password}
                    onChange={(e) => setStudentDraft({ ...studentDraft, password: e.target.value })}
                    placeholder="Minimum 4 characters"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Personal Email ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={studentDraft.personalEmail}
                    onChange={(e) =>
                      setStudentDraft({ ...studentDraft, personalEmail: e.target.value })
                    }
                    placeholder="ananya.personal@gmail.com"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Mobile Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={studentDraft.mobileNumber}
                    onChange={(e) =>
                      setStudentDraft({ ...studentDraft, mobileNumber: e.target.value })
                    }
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Current CGPA <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    max="10"
                    value={studentDraft.cgpa}
                    onChange={(e) => setStudentDraft({ ...studentDraft, cgpa: e.target.value })}
                    placeholder="e.g., 8.45"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Active Backlogs <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="10"
                    value={studentDraft.activeBacklogs}
                    onChange={(e) =>
                      setStudentDraft({ ...studentDraft, activeBacklogs: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Gender <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={studentDraft.gender}
                    onChange={(e) => setStudentDraft({ ...studentDraft, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    State <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={studentDraft.stateName}
                    onChange={(e) => setStudentDraft({ ...studentDraft, stateName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={studentDraft.category}
                    onChange={(e) =>
                      setStudentDraft({ ...studentDraft, category: e.target.value as CategoryOption })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="GENERAL">General</option>
                    <option value="GENERAL_EWS">General-EWS</option>
                    <option value="OBC">OBC</option>
                    <option value="OBC_NCL">OBC-NCL</option>
                    <option value="SC_ST">SC/ST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Degree Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={studentDraft.degreeType}
                    onChange={(e) =>
                      setStudentDraft({
                        ...studentDraft,
                        degreeType: e.target.value as DegreeTypeOption,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="STANDALONE">Standalone</option>
                    <option value="DUAL_DEGREE">Dual Degree</option>
                  </select>
                </div>
              </div>

              {/* Academic Standing, Diplomas & Placement Track (Used for Mandatory Eligibility Gate) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3">
                <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  Academic Qualification & Track Eligibility <span className="text-rose-400">*</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Current Program Level <span className="text-rose-400">*</span>
                    </label>
                    <select
                      required
                      value={studentDraft.programLevel}
                      onChange={(e) => {
                        const nextLevel = e.target.value as ProgramLevelOption;
                        const isDegree = nextLevel === "BSC" || nextLevel === "BS";
                        setStudentDraft({
                          ...studentDraft,
                          programLevel: nextLevel,
                          hasDiplomaDataScience: isDegree ? true : studentDraft.hasDiplomaDataScience,
                          hasDiplomaProgramming: isDegree ? true : studentDraft.hasDiplomaProgramming,
                          applyingTrack:
                            !isDegree &&
                            (studentDraft.applyingTrack === "FULL_TIME" ||
                              studentDraft.applyingTrack === "BOTH")
                              ? "INTERNSHIP"
                              : studentDraft.applyingTrack,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                    >
                      <option value="FOUNDATION">Foundation</option>
                      <option value="DIPLOMA">Diploma</option>
                      <option value="BSC">BSc Pass</option>
                      <option value="BS">BS Level</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Applying For <span className="text-rose-400">*</span>
                    </label>
                    <select
                      required
                      value={studentDraft.applyingTrack}
                      onChange={(e) =>
                        setStudentDraft({
                          ...studentDraft,
                          applyingTrack: e.target.value as StudentTrackOption,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                    >
                      <option value="INTERNSHIP">Internship (Min 1 Domain Diploma)</option>
                      <option
                        value="FULL_TIME"
                        disabled={studentDraft.programLevel !== "BSC" && studentDraft.programLevel !== "BS"}
                      >
                        Full-Time Placement (Min BSc Pass)
                      </option>
                      <option
                        value="BOTH"
                        disabled={studentDraft.programLevel !== "BSC" && studentDraft.programLevel !== "BS"}
                      >
                        Both — Internship &amp; Full-Time Placement (Min BSc Pass)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Target Domain <span className="text-rose-400">*</span>
                    </label>
                    <select
                      required
                      value={studentDraft.targetDomain}
                      onChange={(e) =>
                        setStudentDraft({
                          ...studentDraft,
                          targetDomain: e.target.value as QuizDomainOption,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                    >
                      <option value="DATA_SCIENCE">Data Science</option>
                      <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                    </select>
                  </div>
                </div>

                {studentDraft.programLevel === "BSC" || studentDraft.programLevel === "BS" ? (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>Both IITM Diplomas Automatically Verified:</strong> {studentDraft.programLevel} level confirms completion of both Diploma in Data Science and Diploma in Programming (eligible for Internship, Full-Time, or Both).
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">
                      Completed IITM Diplomas <span className="text-rose-400">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40">
                        <input
                          type="checkbox"
                          checked={studentDraft.hasDiplomaDataScience}
                          onChange={(e) =>
                            setStudentDraft({
                              ...studentDraft,
                              hasDiplomaDataScience: e.target.checked,
                            })
                          }
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-slate-200">Diploma in Data Science Completed</span>
                      </label>
                      <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40">
                        <input
                          type="checkbox"
                          checked={studentDraft.hasDiplomaProgramming}
                          onChange={(e) =>
                            setStudentDraft({
                              ...studentDraft,
                              hasDiplomaProgramming: e.target.checked,
                            })
                          }
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-slate-200">Diploma in Programming Completed</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Working Professional Mandatory Section */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    Working Professional? <span className="text-rose-400">*</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStudentDraft({ ...studentDraft, isWorkingProf: true })}
                      className={`px-3 py-1 rounded-lg font-semibold border transition ${
                        studentDraft.isWorkingProf
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentDraft({ ...studentDraft, isWorkingProf: false })}
                      className={`px-3 py-1 rounded-lg font-semibold border transition ${
                        !studentDraft.isWorkingProf
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {studentDraft.isWorkingProf && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1">
                          Years of Experience <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          step="0.5"
                          min="0.5"
                          max="40"
                          value={studentDraft.yearsExp}
                          onChange={(e) =>
                            setStudentDraft({ ...studentDraft, yearsExp: e.target.value })
                          }
                          placeholder="e.g., 2.5"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">
                          Work Domain <span className="text-rose-400">*</span>
                        </label>
                        <select
                          required
                          value={studentDraft.workDomain}
                          onChange={(e) =>
                            setStudentDraft({
                              ...studentDraft,
                              workDomain: e.target.value as WorkDomainOption,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        >
                          <option value="DATA_SCIENCE">Data Science</option>
                          <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                          <option value="OTHERS">Others</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">
                          Present Company <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={studentDraft.presentCompany}
                          onChange={(e) =>
                            setStudentDraft({ ...studentDraft, presentCompany: e.target.value })
                          }
                          placeholder="e.g., TCS / Fractal / Zoho"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1">
                          Work Location <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={studentDraft.workLocation}
                          onChange={(e) =>
                            setStudentDraft({ ...studentDraft, workLocation: e.target.value })
                          }
                          placeholder="e.g., Bengaluru / Chennai / Remote"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">
                          Current CTC (LPA) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          step="0.1"
                          min="0"
                          max="500"
                          value={studentDraft.currentCtc}
                          onChange={(e) =>
                            setStudentDraft({ ...studentDraft, currentCtc: e.target.value })
                          }
                          placeholder="e.g., 12.5"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Verify Eligibility & Proceed to Payment
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (onboardingStep === "PAYMENT") {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
                  <BadgeCheck className="w-4 h-4" />
                  Step 2 of 2 • Eligibility Verified
                </div>
                <h1 className="text-xl font-bold text-white">Placement Portal Registration Fee</h1>
              </div>
              <button
                type="button"
                onClick={() => setOnboardingStep("STUDENT_FORM")}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-slate-700"
              >
                ← Edit Form
              </button>
            </div>

            {eligibilityVerdict && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-300">Eligibility Check Passed</p>
                  <p className="mt-0.5">{eligibilityVerdict.message}</p>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Candidate Name</span>
                <span className="text-white font-semibold">{studentDraft.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">IITM Email</span>
                <span className="text-slate-200">{studentDraft.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Selected Track & Domain</span>
                <span className="text-indigo-300 font-semibold">
                  {studentDraft.applyingTrack} •{" "}
                  {studentDraft.targetDomain === "DATA_SCIENCE"
                    ? "Data Science"
                    : "Software Development"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Program Level / CGPA</span>
                <span className="text-slate-200">
                  {studentDraft.programLevel} • {studentDraft.cgpa} CGPA
                </span>
              </div>
            </div>

            {/* Payment Gateway Placeholder */}
            <div className="p-5 rounded-xl bg-indigo-950/30 border border-dashed border-indigo-500/40 text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Payment Gateway Integration Placeholder
              </p>
              <p className="text-xs text-slate-400">
                Official IITM Payment Gateway link will be embedded here. Click below to confirm
                payment and submit your verified registration for Placement Admin approval.
              </p>
            </div>

            <button
              type="button"
              disabled={paymentProcessing}
              onClick={handleConfirmPaymentAndEnterDashboard}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {paymentProcessing
                ? "Confirming Payment..."
                : "Confirm Payment & Submit for Admin Approval"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <ShieldCheck className="w-4 h-4" />
            IITM Career OS • Placement & Governance Portal
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            IITM Placement & Career Portal
          </h1>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Select Role Context
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {(["STUDENT", "RECRUITER", "EXAMINER", "TRAINING_COORDINATOR", "ADMIN"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r);
                      setAuthError(null);
                      setAuthNotice(null);
                      if (r === "ADMIN") {
                        setAuthMode("SIGN_IN");
                      }
                    }}
                    className={`py-2 px-2 rounded-lg text-[11px] font-semibold border transition truncate ${
                      selectedRole === r
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {r === "TRAINING_COORDINATOR" ? "COORDINATOR" : r}
                  </button>
                ))}
              </div>
            </div>

            {selectedRole !== "ADMIN" ? (
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("SIGN_IN");
                    setAuthError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold transition ${
                    authMode === "SIGN_IN"
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setAuthNotice(null);
                    setEligibilityVerdict(null);
                    if (selectedRole === "STUDENT") {
                      resetStudentDraft();
                      setOnboardingStep("STUDENT_FORM");
                    } else {
                      setAuthMode("SIGN_UP");
                    }
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold transition ${
                    authMode === "SIGN_UP"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Register (Sign Up)
                </button>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Administrator Access</span>
                <span className="text-indigo-300 font-semibold">Sign In Only (Pre-Provisioned)</span>
              </div>
            )}

            <form
              onSubmit={authMode === "SIGN_UP" && selectedRole !== "ADMIN" ? handleRegister : handleLogin}
              className="space-y-3.5"
            >
              {authMode === "SIGN_UP" && selectedRole !== "ADMIN" && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder={
                      selectedRole === "STUDENT"
                        ? "e.g., Rohan Deshmukh"
                        : selectedRole === "RECRUITER"
                        ? "e.g., Priya Nair"
                        : "e.g., Dr. Karthik Narayanan"
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                  {selectedRole === "RECRUITER" ? "Corporate Work Email" : "Institutional Email"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    selectedRole === "STUDENT"
                      ? "22f3001013@ds.study.iitm.ac.in"
                      : selectedRole === "RECRUITER"
                      ? "lalit@iit.in"
                      : selectedRole === "EXAMINER"
                      ? "shyam@ds.iitm.ac.in"
                      : selectedRole === "TRAINING_COORDINATOR"
                      ? "coordinator@study.iitm.ac.in"
                      : "placement.admin@iitm.ac.in"
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {selectedRole === "STUDENT" && (
                    <>
                      Allowed student domains: <span className="text-slate-300">@ds.study.iitm.ac.in</span>,{" "}
                      <span className="text-slate-300">@es.study.iitm.ac.in</span>
                    </>
                  )}
                  {selectedRole === "RECRUITER" && (
                    <>Corporate domains only (public Gmail/Yahoo/Outlook addresses blocked).</>
                  )}
                  {selectedRole === "EXAMINER" && (
                    <>Faculty / industry viva panelists require Placement Admin approval before login.</>
                  )}
                  {selectedRole === "ADMIN" && (
                    <>Sign in as Admin to review and approve pending Student, Recruiter & Examiner registrations.</>
                  )}
                </p>
              </div>

              {authMode === "SIGN_UP" && selectedRole === "EXAMINER" && (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-300">
                      Examiner Credentials &amp; Viva Calibration
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      Level 3 Stage 3 Panel
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Examiner Category *
                      </label>
                      <select
                        value={examinerDraft.category}
                        onChange={(e) =>
                          setExaminerDraft((prev) => ({
                            ...prev,
                            category: e.target.value as ExaminerOnboardingDetails["category"],
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="INDUSTRY_MENTOR">Industry Mentor / Senior Engineer</option>
                        <option value="IITM_FACULTY">IITM Faculty / Instructor</option>
                        <option value="IITM_RESEARCH_TA">IITM PhD / MS Scholar / TA</option>
                        <option value="IITM_ALUMNI">IITM BS Alumni (Placed)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Mobile / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={examinerDraft.mobileNumber}
                        onChange={(e) =>
                          setExaminerDraft((prev) => ({ ...prev, mobileNumber: e.target.value }))
                        }
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Current Organization / Institution *
                      </label>
                      <input
                        type="text"
                        required
                        value={examinerDraft.organization}
                        onChange={(e) =>
                          setExaminerDraft((prev) => ({ ...prev, organization: e.target.value }))
                        }
                        placeholder="e.g., IIT Madras / Google / Ricoh"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Current Designation / Role *
                      </label>
                      <input
                        type="text"
                        required
                        value={examinerDraft.designation}
                        onChange={(e) =>
                          setExaminerDraft((prev) => ({ ...prev, designation: e.target.value }))
                        }
                        placeholder="e.g., Senior ML Engineer / Instructor"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Total Experience (Years) *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="50"
                        required
                        value={examinerDraft.yearsExperience}
                        onChange={(e) =>
                          setExaminerDraft((prev) => ({ ...prev, yearsExperience: e.target.value }))
                        }
                        placeholder="e.g., 4.5"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Primary Evaluation Domain *
                      </label>
                      <select
                        value={examinerDraft.evaluationDomain}
                        onChange={(e) =>
                          setExaminerDraft((prev) => ({
                            ...prev,
                            evaluationDomain: e.target.value as ExaminerOnboardingDetails["evaluationDomain"],
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="BOTH">Both (Data Science + Software Eng)</option>
                        <option value="DATA_SCIENCE">Data Science &amp; Machine Learning</option>
                        <option value="SOFTWARE_DEVELOPMENT">Software Development &amp; Systems</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Core Technical Specializations *
                    </label>
                    <input
                      type="text"
                      required
                      value={examinerDraft.specializations}
                      onChange={(e) =>
                        setExaminerDraft((prev) => ({ ...prev, specializations: e.target.value }))
                      }
                      placeholder="e.g., Python, SQL, FastAPI, NLP, Deep Learning, System Design"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        LinkedIn Profile URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={examinerDraft.linkedinUrl}
                        onChange={(e) =>
                          setExaminerDraft((prev) => ({ ...prev, linkedinUrl: e.target.value }))
                        }
                        placeholder="https://www.linkedin.com/in/your-profile"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        GitHub / Google Scholar (Optional)
                      </label>
                      <input
                        type="url"
                        value={examinerDraft.portfolioOrScholarUrl || ""}
                        onChange={(e) =>
                          setExaminerDraft((prev) => ({
                            ...prev,
                            portfolioOrScholarUrl: e.target.value,
                          }))
                        }
                        placeholder="https://github.com/username"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Weekly 1-on-1 Viva Capacity *
                      </label>
                      <select
                        value={examinerDraft.weeklyVivaCapacity}
                        onChange={(e) =>
                          setExaminerDraft((prev) => ({
                            ...prev,
                            weeklyVivaCapacity: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value={3}>3 sessions / week</option>
                        <option value={5}>5 sessions / week</option>
                        <option value={8}>8 sessions / week</option>
                        <option value={10}>10+ sessions / week</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Preferred Viva Window *
                      </label>
                      <select
                        value={examinerDraft.preferredTimeWindow}
                        onChange={(e) =>
                          setExaminerDraft((prev) => ({
                            ...prev,
                            preferredTimeWindow: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Weekday Evenings (6 PM – 9 PM IST)">
                          Weekday Evenings (6 PM – 9 PM IST)
                        </option>
                        <option value="Weekends (10 AM – 6 PM IST)">
                          Weekends (10 AM – 6 PM IST)
                        </option>
                        <option value="Flexible (Weekdays & Weekends)">
                          Flexible (Weekdays &amp; Weekends)
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      CV / Faculty ID Proof — Google Drive Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={examinerDraft.cvDriveUrl || ""}
                      onChange={(e) =>
                        setExaminerDraft((prev) => ({ ...prev, cvDriveUrl: e.target.value }))
                      }
                      placeholder="https://drive.google.com/file/d/.../view (Anyone with link can view)"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <label className="flex items-start gap-2 pt-1 cursor-pointer text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={examinerDraft.coiAccepted}
                      onChange={(e) =>
                        setExaminerDraft((prev) => ({ ...prev, coiAccepted: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-500"
                    />
                    <span>
                      I confirm objectivity in 1-on-1 viva evaluations, agree to maintain strict
                      confidentiality of student resumes/scorecards, and will disclose any conflict
                      of interest. *
                    </span>
                  </label>
                </div>
              )}

              {authMode === "SIGN_UP" && selectedRole === "RECRUITER" && (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-300">
                      Corporate Organization &amp; Recruiter Verification
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Employer Onboarding
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Company / Organization Legal Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={recruiterDraft.companyName}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({ ...prev, companyName: e.target.value }))
                        }
                        placeholder="e.g., Razorpay Software Pvt Ltd"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Organization Category *
                      </label>
                      <select
                        value={recruiterDraft.companyType}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({
                            ...prev,
                            companyType: e.target.value as RecruiterOnboardingDetails["companyType"],
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="PRODUCT">Product Engineering Company</option>
                        <option value="MNC_ENTERPRISE">MNC / Global Enterprise</option>
                        <option value="STARTUP">High-Growth Startup</option>
                        <option value="CONSULTING_ANALYTICS">Consulting &amp; Data Analytics</option>
                        <option value="RESEARCH_PSU">R&amp;D Lab / Public Sector</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Company Size *
                      </label>
                      <select
                        value={recruiterDraft.companySize}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({ ...prev, companySize: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="1–50 employees">1–50 employees</option>
                        <option value="51–250 employees">51–250 employees</option>
                        <option value="251–1,000 employees">251–1,000 employees</option>
                        <option value="1,001–10,000 employees">1,001–10,000 employees</option>
                        <option value="10,000+ Enterprise">10,000+ Enterprise</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Year Founded (Optional)
                      </label>
                      <input
                        type="text"
                        value={recruiterDraft.foundedYear || ""}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({ ...prev, foundedYear: e.target.value }))
                        }
                        placeholder="e.g., 1998"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Work Mode Policy *
                      </label>
                      <select
                        value={recruiterDraft.workMode}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({
                            ...prev,
                            workMode: e.target.value as RecruiterOnboardingDetails["workMode"],
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="HYBRID">Hybrid (Office + WFH)</option>
                        <option value="ONSITE">On-Site / In-Office</option>
                        <option value="REMOTE">Remote (India-wide)</option>
                        <option value="FLEXIBLE">Flexible / Role-Dependent</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Headquarters City &amp; Country *
                      </label>
                      <input
                        type="text"
                        required
                        value={recruiterDraft.headquartersLocation}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({
                            ...prev,
                            headquartersLocation: e.target.value,
                          }))
                        }
                        placeholder="e.g., Kolkata / Bengaluru, India"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Hiring / Job Location(s) *
                      </label>
                      <input
                        type="text"
                        required
                        value={recruiterDraft.hiringLocations}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({
                            ...prev,
                            hiringLocations: e.target.value,
                          }))
                        }
                        placeholder="e.g., Bengaluru, Chennai, Hyderabad, Pune"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Corporate Website URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={recruiterDraft.companyWebsite}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({ ...prev, companyWebsite: e.target.value }))
                        }
                        placeholder="https://company.com"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Company LinkedIn Page (Optional)
                      </label>
                      <input
                        type="url"
                        value={recruiterDraft.companyLinkedinUrl || ""}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({
                            ...prev,
                            companyLinkedinUrl: e.target.value,
                          }))
                        }
                        placeholder="https://www.linkedin.com/company/..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      About the Company, Products &amp; Engineering Teams *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={recruiterDraft.companyOverview}
                      onChange={(e) =>
                        setRecruiterDraft((prev) => ({ ...prev, companyOverview: e.target.value }))
                      }
                      placeholder="Describe your company's core business, technology stack, and teams hiring IITM BS students..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Your Designation / Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={recruiterDraft.designation}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({ ...prev, designation: e.target.value }))
                        }
                        placeholder="e.g., University Talent Partner / EM"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Direct Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={recruiterDraft.mobileNumber}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({ ...prev, mobileNumber: e.target.value }))
                        }
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Recruiter LinkedIn Profile URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={recruiterDraft.linkedinUrl}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({ ...prev, linkedinUrl: e.target.value }))
                        }
                        placeholder="https://www.linkedin.com/in/your-profile"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        CIN / GSTIN / Reg ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={recruiterDraft.cinOrGstNumber || ""}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({ ...prev, cinOrGstNumber: e.target.value }))
                        }
                        placeholder="e.g., 29AABCR1234F1Z5"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Hiring Engagement Track *
                      </label>
                      <select
                        value={recruiterDraft.hiringMode}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({
                            ...prev,
                            hiringMode: e.target.value as RecruiterOnboardingDetails["hiringMode"],
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="BOTH">Internship + PPO + Full-Time</option>
                        <option value="FULL_TIME">Full-Time Roles Only (FTE)</option>
                        <option value="INTERNSHIP">Summer / Term Internships Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Expected Hiring Volume *
                      </label>
                      <select
                        value={recruiterDraft.expectedHeadcount}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({
                            ...prev,
                            expectedHeadcount: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="1–5 hires">1–5 hires</option>
                        <option value="5–15 hires">5–15 hires</option>
                        <option value="15–30 hires">15–30 hires</option>
                        <option value="30+ hires">30+ hires</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Target Roles *
                      </label>
                      <input
                        type="text"
                        required
                        value={recruiterDraft.targetRoles}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({ ...prev, targetRoles: e.target.value }))
                        }
                        placeholder="e.g., Data Scientist, SDE-1, ML Intern"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        CTC / Monthly Stipend Band *
                      </label>
                      <input
                        type="text"
                        required
                        value={recruiterDraft.compensationRange}
                        onChange={(e) =>
                          setRecruiterDraft((prev) => ({
                            ...prev,
                            compensationRange: e.target.value,
                          }))
                        }
                        placeholder="e.g., ₹14–18 LPA / ₹45k/mo Stipend"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2 pt-1 cursor-pointer text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={recruiterDraft.policyAccepted}
                      onChange={(e) =>
                        setRecruiterDraft((prev) => ({ ...prev, policyAccepted: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-500"
                    />
                    <span>
                      I confirm I am an authorized hiring representative of this organization and
                      agree to abide by IITM BS Placement Cell offer-letter, compensation, and
                      interview schedule policies. *
                    </span>
                  </label>
                </div>
              )}

              {authMode === "SIGN_UP" && selectedRole === "STUDENT" && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                    {selectedRole === "STUDENT"
                      ? "Program & Roll Number"
                      : selectedRole === "RECRUITER"
                      ? "Company & Designation"
                      : "Department / Viva Panel Specialization"}
                  </label>
                  <input
                    type="text"
                    value={regOrgOrDept}
                    onChange={(e) => setRegOrgOrDept(e.target.value)}
                    placeholder={
                      selectedRole === "STUDENT"
                        ? "BS Data Science • Roll 23F1004512"
                        : selectedRole === "RECRUITER"
                        ? "Google India • University Talent Partner"
                        : "Machine Learning & Systems Viva Panel"
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (default: 123456)"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {authNotice && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authNotice}</span>
                </div>
              )}

              {authError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {authMode === "SIGN_UP" && selectedRole !== "ADMIN"
                  ? `Submit ${selectedRole} Registration for Admin Approval`
                  : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const activePoolSize = questionBank.filter(
    (q) => q.domain === activeTrack.domain && q.track === activeTrack.track
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">IITM Career & Placement OS</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Inc 1 • Inc 2 • Inc 3 Live • {dbSyncStatus === "SYNCED" ? "PostgreSQL Synced" : dbSyncStatus === "SYNCING" ? "Syncing DB..." : "Local Mode"}
                </span>
                {isPlaced && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                    PLACED (BRULE-21)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user.role === "ADMIN" ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs font-bold tracking-wide">
                  SUPER ADMIN • FULL CRUD &amp; OVERSIGHT
                </span>
              </div>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 border border-indigo-500/40 text-indigo-300">
                {user.role} PORTAL
              </span>
            )}
            <button
              onClick={() => {
                setIsQuizActive(false);
                setUser(null);
              }}
              className="ml-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Module Navigation */}
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap gap-2 border-t border-slate-800/70 pt-2 pb-2">
          {user.role === "STUDENT" ? (
            <>
              <button
                disabled={isQuizActive}
                onClick={() => setActiveTab("IDENTITY")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "IDENTITY"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200 disabled:opacity-40"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                My Profile, Scorecard & Resumes ({resumes.length}/3)
              </button>

              <button
                onClick={() => setActiveTab("TRAINING")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "TRAINING"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Training & Readiness Progress
                {badges.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                    {badges.length} Badges
                  </span>
                )}
              </button>

              <button
                disabled={isQuizActive}
                onClick={() => setActiveTab("RECRUITMENT")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "RECRUITMENT"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200 disabled:opacity-40"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Opportunities ({jobs.filter((j) => j.domain === studentTargetDomain && (studentApplyingTrack === "BOTH" || j.roleType === studentApplyingTrack)).length} Open • {applications.length} Applied)
              </button>
            </>
          ) : user.role === "TRAINING_COORDINATOR" ? (
            <>
              <button
                onClick={() => setActiveTab("TRAINING")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "TRAINING"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Activity Evidence Verification & 3-Level Progress (
                {activitySubmissions.filter((s) => s.reviewStatus === "PENDING_COORDINATOR").length} Pending)
              </button>
            </>
          ) : user.role === "EXAMINER" ? (
            <>
              <button
                onClick={() => setActiveTab("TRAINING")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "TRAINING"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                1-on-1 Viva &amp; Student Readiness Evaluation
              </button>
            </>
          ) : user.role === "RECRUITER" ? (
            <>
              <button
                onClick={() => setActiveTab("RECRUITER_COMPANY")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "RECRUITER_COMPANY"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Company Profile &amp; Hiring Charter
              </button>

              <button
                onClick={() => setActiveTab("RECRUITER_DRIVES")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "RECRUITER_DRIVES"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                {(() => {
                  if (user.role !== "RECRUITER") {
                    return `Job Drives & Candidate Shortlisting (${jobs.length} Drives • ${applications.length} ${applications.length === 1 ? "Applicant" : "Applicants"})`;
                  }
                  const matchedReg = registrations.find(
                    (r) => r.email.toLowerCase() === user.email.toLowerCase() && r.role === "RECRUITER"
                  );
                  const myCo = (
                    matchedReg?.recruiterProfileDetails?.companyName ||
                    matchedReg?.orgOrDept?.split("•")[0]?.split("(")[0] ||
                    newCompany ||
                    ""
                  ).trim().toLowerCase();
                  const myJobs = jobs.filter(
                    (j) =>
                      j.postedByEmail?.toLowerCase() === user.email.toLowerCase() ||
                      (myCo && j.companyName.toLowerCase().includes(myCo))
                  );
                  const myJobIds = new Set(myJobs.map((j) => j.id));
                  const myAppsCount = applications.filter((a) => myJobIds.has(a.jobId)).length;
                  return `Job Drives & Candidate Shortlisting (${myJobs.length} ${myJobs.length === 1 ? "Drive" : "Drives"} • ${myAppsCount} ${myAppsCount === 1 ? "Applicant" : "Applicants"})`;
                })()}
              </button>

              <button
                onClick={() => setActiveTab("PLACEMENT")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "PLACEMENT"
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {(() => {
                  if (user.role !== "RECRUITER") {
                    return `Interviews & Offer Rollout (${interviews.length + offers.length})`;
                  }
                  const matchedReg = registrations.find(
                    (r) => r.email.toLowerCase() === user.email.toLowerCase() && r.role === "RECRUITER"
                  );
                  const myCo = (
                    matchedReg?.recruiterProfileDetails?.companyName ||
                    matchedReg?.orgOrDept?.split("•")[0]?.split("(")[0] ||
                    newCompany ||
                    ""
                  ).trim().toLowerCase();
                  const myIvCount = interviews.filter((iv) => myCo && iv.companyName.toLowerCase().includes(myCo)).length;
                  const myOfferCount = offers.filter((o) => myCo && o.companyName.toLowerCase().includes(myCo)).length;
                  return `Interviews & Offer Rollout (${myIvCount + myOfferCount})`;
                })()}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab("GOVERNANCE")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "GOVERNANCE"
                    ? "bg-indigo-600/25 text-indigo-200 border border-indigo-500/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Executive Command, CRUD &amp; Exports ({registrations.length} Users)
              </button>

              <button
                onClick={() => setActiveTab("TRAINING")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "TRAINING"
                    ? "bg-indigo-600/25 text-indigo-200 border border-indigo-500/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Examiner Viva &amp; Coordinator Question Banks (
                {activitySubmissions.filter((s) => s.reviewStatus === "PENDING_COORDINATOR").length} Pending)
              </button>

              <button
                onClick={() => setActiveTab("RECRUITMENT")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "RECRUITMENT"
                    ? "bg-indigo-600/25 text-indigo-200 border border-indigo-500/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                All Job Drives &amp; Shortlisting ({jobs.length} Drives • {applications.length} Apps)
              </button>

              <button
                onClick={() => setActiveTab("PLACEMENT")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === "PLACEMENT"
                    ? "bg-indigo-600/25 text-indigo-200 border border-indigo-500/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Interviews, Offers &amp; Analytics ({interviews.length + offers.length})
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab("HELPDESK")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === "HELPDESK"
                ? "bg-indigo-600/25 text-indigo-200 border border-indigo-500/50"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Helpdesk &amp; Support ({helpdeskTickets.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED").length} Open)
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === "RECRUITER_COMPANY" && user.role === "RECRUITER" && (() => {
          const matchedRecReg = registrations.find(
            (r) => r.email.toLowerCase() === user.email.toLowerCase() && r.role === "RECRUITER"
          );
          const companyInfo: RecruiterOnboardingDetails = matchedRecReg?.recruiterProfileDetails || {
            mobileNumber: "+91 98765 43210",
            companyName: matchedRecReg?.orgOrDept?.split("(")[0]?.trim() || user.name,
            companyType: "PRODUCT",
            companySize: "251–1,000 employees",
            foundedYear: "2015",
            companyWebsite: "https://company.com",
            companyLinkedinUrl: "https://www.linkedin.com",
            cinOrGstNumber: "",
            headquartersLocation: "Bengaluru, India",
            hiringLocations: "Bengaluru, Chennai, Hyderabad, Pune",
            workMode: "HYBRID",
            companyOverview: "Partner employer hiring IITM BS Data Science & Electronic Systems graduates for software, ML, and analytics roles.",
            designation: "University Talent Partner",
            linkedinUrl: "https://www.linkedin.com",
            hiringMode: "BOTH",
            targetRoles: "Data Scientist, SDE-1, ML Engineer",
            expectedHeadcount: "5–15 hires",
            compensationRange: "₹12–18 LPA / ₹45,000/mo Stipend",
            policyAccepted: true,
          };

          const activeDraft = recruiterEditDraft || companyInfo;

          return (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                        Verified Employer Dossier • IITM BS Placement Cell
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                        {matchedRecReg?.status === "APPROVED" ? "Approved Employer" : "Active Recruiter"}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white mt-1">
                      {companyInfo.companyName}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {companyInfo.designation} • {user.name} ({user.email}) • {companyInfo.mobileNumber}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingRecruiterProfile) {
                          setRecruiterEditDraft({ ...companyInfo });
                          setEditingRecruiterProfile(true);
                        } else {
                          setEditingRecruiterProfile(false);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200"
                    >
                      {editingRecruiterProfile ? "Cancel Editing" : "Edit Company & Location Profile"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("RECRUITER_DRIVES")}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                    >
                      Manage Job Drives &amp; Shortlists →
                    </button>
                  </div>
                </div>

                {!editingRecruiterProfile ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Headquarters</span>
                        <span className="font-semibold text-slate-100 mt-0.5 block">
                          {companyInfo.headquartersLocation}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Hiring / Job Locations</span>
                        <span className="font-semibold text-cyan-300 mt-0.5 block">
                          {companyInfo.hiringLocations}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Work Mode &amp; Company Size</span>
                        <span className="font-semibold text-slate-100 mt-0.5 block">
                          {companyInfo.workMode} • {companyInfo.companySize}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Compensation &amp; Headcount</span>
                        <span className="font-semibold text-emerald-300 mt-0.5 block">
                          {companyInfo.compensationRange} ({companyInfo.expectedHeadcount})
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        About {companyInfo.companyName}
                      </div>
                      <p className="text-slate-200 leading-relaxed">
                        {companyInfo.companyOverview}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px]">
                        <span className="text-slate-400">
                          Target Roles: <strong className="text-slate-200">{companyInfo.targetRoles}</strong>
                        </span>
                        {companyInfo.foundedYear && (
                          <span className="text-slate-400">
                            Founded: <strong className="text-slate-200">{companyInfo.foundedYear}</strong>
                          </span>
                        )}
                        {companyInfo.cinOrGstNumber && (
                          <span className="font-mono text-slate-400">
                            CIN/GST: <strong className="text-slate-200">{companyInfo.cinOrGstNumber}</strong>
                          </span>
                        )}
                        <a
                          href={companyInfo.companyWebsite}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Company Website ↗
                        </a>
                        {companyInfo.companyLinkedinUrl && (
                          <a
                            href={companyInfo.companyLinkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:text-sky-300 underline"
                          >
                            Company LinkedIn ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!recruiterEditDraft) return;
                      setRegistrations((prev) =>
                        prev.map((reg) =>
                          reg.email.toLowerCase() === user.email.toLowerCase() && reg.role === "RECRUITER"
                            ? {
                                ...reg,
                                orgOrDept: `${recruiterEditDraft.companyName} • HQ: ${recruiterEditDraft.headquartersLocation} • Hiring: ${recruiterEditDraft.hiringLocations} (${recruiterEditDraft.workMode}) • ${recruiterEditDraft.designation}`,
                                recruiterProfileDetails: { ...recruiterEditDraft },
                              }
                            : reg
                        )
                      );
                      appendAudit(
                        user.email,
                        "RECRUITER",
                        "RECRUITER_COMPANY_PROFILE_UPDATED",
                        `${recruiterEditDraft.companyName} (${recruiterEditDraft.hiringLocations})`,
                        "SUCCESS"
                      );
                      setEditingRecruiterProfile(false);
                    }}
                    className="space-y-3 text-xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Company Name</label>
                        <input
                          type="text"
                          required
                          value={activeDraft.companyName}
                          onChange={(e) =>
                            setRecruiterEditDraft({ ...activeDraft, companyName: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Headquarters City</label>
                        <input
                          type="text"
                          required
                          value={activeDraft.headquartersLocation}
                          onChange={(e) =>
                            setRecruiterEditDraft({
                              ...activeDraft,
                              headquartersLocation: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Hiring / Job Locations</label>
                        <input
                          type="text"
                          required
                          value={activeDraft.hiringLocations}
                          onChange={(e) =>
                            setRecruiterEditDraft({
                              ...activeDraft,
                              hiringLocations: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Work Mode</label>
                        <select
                          value={activeDraft.workMode}
                          onChange={(e) =>
                            setRecruiterEditDraft({
                              ...activeDraft,
                              workMode: e.target.value as RecruiterOnboardingDetails["workMode"],
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                        >
                          <option value="HYBRID">Hybrid</option>
                          <option value="ONSITE">On-Site</option>
                          <option value="REMOTE">Remote</option>
                          <option value="FLEXIBLE">Flexible</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Target Roles</label>
                        <input
                          type="text"
                          required
                          value={activeDraft.targetRoles}
                          onChange={(e) =>
                            setRecruiterEditDraft({ ...activeDraft, targetRoles: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Compensation / Stipend Band</label>
                        <input
                          type="text"
                          required
                          value={activeDraft.compensationRange}
                          onChange={(e) =>
                            setRecruiterEditDraft({
                              ...activeDraft,
                              compensationRange: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">About the Company</label>
                      <textarea
                        rows={2}
                        required
                        value={activeDraft.companyOverview}
                        onChange={(e) =>
                          setRecruiterEditDraft({ ...activeDraft, companyOverview: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        Save Company Profile
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          );
        })()}

        {(activeTab === "RECRUITMENT" || activeTab === "RECRUITER_DRIVES") && (
          <div className="space-y-8">
            {/* Live Student Eligibility Context Strip (Student View Only) */}
            {user.role === "STUDENT" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Candidate</span>
                  <span className="font-semibold text-white">
                    {fullName} ({user.name})
                  </span>
                </div>
                <div className="h-7 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block">CGPA / Backlogs</span>
                  <span className="font-semibold text-white">
                    {parseFloat(cgpaInput || "0").toFixed(2)} / {activeBacklogs} Backlogs
                  </span>
                </div>
                <div className="h-7 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block">Program Level</span>
                  <span className="font-semibold text-indigo-300">{programLevel}</span>
                </div>
                <div className="h-7 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block">Examiner Readiness</span>
                  <span
                    className={`font-semibold ${
                      evaluations[0]?.isPlacementReady ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {evaluations[0]?.isPlacementReady ? "READY (Verified)" : "Pending Viva Sign-off"}
                  </span>
                </div>
                <div className="h-7 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block">Verified Quiz Badges</span>
                  <span className="font-semibold text-emerald-300">{badges.length} Earned</span>
                </div>
              </div>

              {user.role === "STUDENT" && resumes.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Apply with Resume:</span>
                  <select
                    value={selectedResumeIdForApply}
                    onChange={(e) => setSelectedResumeIdForApply(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.targetRole})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            )}

            {jobAlert && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  jobAlert.type === "OK"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                <div className="flex items-start gap-2">
                  {jobAlert.type === "OK" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{jobAlert.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setJobAlert(null)}
                  className="px-2 py-0.5 rounded bg-slate-900/70 hover:bg-slate-800 text-slate-300 text-[11px] shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Clean Recruiter Workspace Navigation Bar (Prevents Cluttered Stacked Screens) */}
            {user.role === "RECRUITER" && (() => {
              const matchedReg = registrations.find(
                (r) => r.email.toLowerCase() === user.email.toLowerCase() && r.role === "RECRUITER"
              );
              const myCompanyName = (
                matchedReg?.recruiterProfileDetails?.companyName ||
                matchedReg?.orgOrDept?.split("(")[0] ||
                newCompany ||
                ""
              ).trim();
              const myCompanyJobs = jobs.filter(
                (j) =>
                  j.postedByEmail?.toLowerCase() === user.email.toLowerCase() ||
                  (myCompanyName && j.companyName.toLowerCase().includes(myCompanyName.toLowerCase()))
              );
              const scopedJobsCount = recruiterShowAllDrives ? jobs.length : myCompanyJobs.length;
              const scopedJobIds = new Set((recruiterShowAllDrives ? jobs : myCompanyJobs).map((j) => j.id));
              const scopedAppsCount = applications.filter((a) => scopedJobIds.has(a.jobId)).length;

              return (
                <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setRecruiterWorkspaceView("MY_DRIVES")}
                      className={`px-3.5 py-2 rounded-xl font-semibold transition ${
                        recruiterWorkspaceView === "MY_DRIVES"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      My Posted Drives ({scopedJobsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecruiterWorkspaceView("POST_DRIVE")}
                      className={`px-3.5 py-2 rounded-xl font-semibold transition ${
                        recruiterWorkspaceView === "POST_DRIVE"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-950 border border-slate-800 text-emerald-300 hover:bg-slate-800"
                      }`}
                    >
                      + Post New Drive
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecruiterWorkspaceView("ATS_PIPELINE")}
                      className={`px-3.5 py-2 rounded-xl font-semibold transition ${
                        recruiterWorkspaceView === "ATS_PIPELINE"
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-950 border border-slate-800 text-cyan-300 hover:bg-slate-800"
                      }`}
                    >
                      Candidate ATS Pipeline ({scopedAppsCount})
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Recruiter / Admin Job Drive Publisher */}
            {(user.role === "ADMIN" || (user.role === "RECRUITER" && recruiterWorkspaceView === "POST_DRIVE")) && (
              <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-semibold text-white">
                      Recruiter Portal — Publish New Placement / Internship Drive
                    </h2>
                  </div>
                  {user.role === "RECRUITER" && (
                    <button
                      type="button"
                      onClick={() => {
                        const matched = registrations.find(
                          (r) => r.email.toLowerCase() === user.email.toLowerCase() && r.role === "RECRUITER"
                        );
                        if (matched?.recruiterProfileDetails) {
                          setNewCompany(matched.recruiterProfileDetails.companyName);
                          setNewLocation(
                            `${matched.recruiterProfileDetails.hiringLocations} (${matched.recruiterProfileDetails.workMode})`
                          );
                          setNewCompensation(matched.recruiterProfileDetails.compensationRange);
                        } else if (matched?.orgOrDept) {
                          setNewCompany(matched.orgOrDept.split("(")[0].trim());
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-[11px] font-semibold text-indigo-200"
                    >
                      Auto-Fill My Company &amp; Locations
                    </button>
                  )}
                </div>
                <form onSubmit={handleCreateNewDrive} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Drive Code</label>
                    <input
                      type="text"
                      value={newJobCode}
                      onChange={(e) => setNewJobCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1">Role Title</label>
                    <input
                      type="text"
                      value={newJobTitle}
                      onChange={(e) => setNewJobTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Role Type</label>
                    <select
                      value={newRoleType}
                      onChange={(e) => setNewRoleType(e.target.value as JobRoleTypeOption)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    >
                      <option value="INTERNSHIP">Internship</option>
                      <option value="FULL_TIME">Full-Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Target Domain <span className="text-rose-400">*</span>
                    </label>
                    <select
                      required
                      value={newJobDomain}
                      onChange={(e) => setNewJobDomain(e.target.value as QuizDomainOption | "")}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    >
                      <option value="">Select Domain (Required)...</option>
                      <option value="DATA_SCIENCE">Data Science</option>
                      <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Compensation / Stipend</label>
                    <input
                      type="text"
                      value={newCompensation}
                      onChange={(e) => setNewCompensation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Min CGPA Cutoff</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={newMinCgpa}
                      onChange={(e) => setNewMinCgpa(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Work Mode</label>
                    <select
                      value={newWorkMode}
                      onChange={(e) => setNewWorkMode(e.target.value as "HYBRID" | "ONSITE" | "REMOTE")}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    >
                      <option value="HYBRID">Hybrid</option>
                      <option value="ONSITE">On-Site</option>
                      <option value="REMOTE">Remote</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Location(s)</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="Bengaluru / Chennai / Remote"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">No. of Openings</label>
                    <input
                      type="number"
                      min="1"
                      value={newOpeningsCount}
                      onChange={(e) => setNewOpeningsCount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Application Deadline</label>
                    <input
                      type="date"
                      value={newApplicationDeadline}
                      onChange={(e) => setNewApplicationDeadline(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Max Active Backlogs</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={newMaxBacklogs}
                      onChange={(e) => setNewMaxBacklogs(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1">Required Skillsets (comma-separated)</label>
                    <input
                      type="text"
                      value={newRequiredSkillsInput}
                      onChange={(e) => setNewRequiredSkillsInput(e.target.value)}
                      placeholder="Python, SQL, Machine Learning, React"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Selection Rounds</label>
                    <input
                      type="text"
                      value={newSelectionRounds}
                      onChange={(e) => setNewSelectionRounds(e.target.value)}
                      placeholder="OA → Tech Round → HR"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                    />
                  </div>

                  {/* Dual-Mode Job Description: Plain Text OR PDF Upload */}
                  <div className="sm:col-span-4 grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-800/80">
                    <div className="lg:col-span-8">
                      <label className="block text-slate-300 font-semibold mb-1">
                        Job Description (JD) — Paste Plain Text
                      </label>
                      <textarea
                        rows={4}
                        value={newJdText}
                        onChange={(e) => setNewJdText(e.target.value)}
                        placeholder="Paste complete role responsibilities, required qualifications, stipend/CTC breakdown, and bond/duration details..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 leading-relaxed"
                      />
                    </div>
                    <div className="lg:col-span-4 flex flex-col justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="space-y-1.5">
                        <span className="block text-slate-300 font-semibold">
                          Or Upload Official JD PDF
                        </span>
                        <p className="text-[11px] text-slate-400">
                          Attach a PDF brochure/JD (max 2.5 MB). Students and Admins can view &amp; download it directly inside Opportunities.
                        </p>
                      </div>
                      <div className="space-y-2 pt-3">
                        <label className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-indigo-500/40 text-indigo-300 font-semibold text-center cursor-pointer block">
                          {newJdPdfName ? "Replace JD PDF" : "Upload JD PDF (.pdf)"}
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={handleJdPdfUpload}
                            className="hidden"
                          />
                        </label>
                        {newJdPdfName && (
                          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300">
                            <span className="truncate">{newJdPdfName}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setNewJdPdfName("");
                                setNewJdPdfDataUrl("");
                              }}
                              className="text-rose-300 hover:text-rose-200 font-semibold shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-3 flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="req-examiner-ready"
                      checked={newRequireReady}
                      onChange={(e) => setNewRequireReady(e.target.checked)}
                      className="accent-indigo-500 w-4 h-4"
                    />
                    <label htmlFor="req-examiner-ready" className="text-slate-300">
                      Require Examiner Ready Sign-off (Recommended for IITM BS Placement Drives)
                    </label>
                  </div>
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                    >
                      Publish Opportunity &amp; JD
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Opportunities Segregated by Internship & Full-Time Employment (FTE) */}
            {(user.role !== "RECRUITER" || recruiterWorkspaceView === "MY_DRIVES") && (() => {
              const matchedReg =
                user.role === "RECRUITER"
                  ? registrations.find(
                      (r) => r.email.toLowerCase() === user.email.toLowerCase() && r.role === "RECRUITER"
                    )
                  : undefined;
              const myCompanyName = (
                matchedReg?.recruiterProfileDetails?.companyName ||
                matchedReg?.orgOrDept?.split("(")[0] ||
                newCompany ||
                ""
              ).trim();

              const baseJobs =
                user.role === "STUDENT"
                  ? jobs.filter(
                      (j) =>
                        j.domain === studentTargetDomain &&
                        (studentApplyingTrack === "BOTH" || j.roleType === studentApplyingTrack)
                    )
                  : user.role === "RECRUITER" && !recruiterShowAllDrives
                  ? jobs.filter(
                      (j) =>
                        j.postedByEmail?.toLowerCase() === user.email.toLowerCase() ||
                        (myCompanyName && j.companyName.toLowerCase().includes(myCompanyName.toLowerCase()))
                    )
                  : jobs;

              const effectiveTrackFilter =
                user.role === "STUDENT"
                  ? studentApplyingTrack === "BOTH"
                    ? "ALL"
                    : studentApplyingTrack
                  : opportunityTrackFilter;
              const effectiveDomainFilter =
                user.role === "STUDENT" ? studentTargetDomain : opportunityDomainFilter;

              const q = opportunitySearchQuery.trim().toLowerCase();
              const matchingJobs = baseJobs.filter((job) => {
                if (effectiveTrackFilter !== "ALL" && job.roleType !== effectiveTrackFilter) return false;
                if (effectiveDomainFilter !== "ALL" && job.domain !== effectiveDomainFilter) return false;
                if (!q) return true;
                return (
                  job.title.toLowerCase().includes(q) ||
                  job.companyName.toLowerCase().includes(q) ||
                  job.jobCode.toLowerCase().includes(q) ||
                  job.location.toLowerCase().includes(q) ||
                  (job.jdText || "").toLowerCase().includes(q) ||
                  job.requiredSkillTags.some((t) => t.toLowerCase().includes(q))
                );
              });
              const internshipJobs = matchingJobs.filter((j) => j.roleType === "INTERNSHIP");
              const fteJobs = matchingJobs.filter((j) => j.roleType === "FULL_TIME");

              const renderOpportunityCard = (job: JobDriveItem) => {
                const elig = evaluateEligibilityForDrive(job);
                const existingApp = applications.find((a) => a.jobId === job.id);

                return (
                  <div
                    key={job.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-indigo-400">{job.jobCode}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                              {job.roleType === "INTERNSHIP" ? "INTERNSHIP" : "FULL-TIME"}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white mt-1">
                            {job.companyName} — {job.title}
                          </h3>
                        </div>
                        <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg shrink-0">
                          {job.compensation}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400">{job.description}</p>

                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          Domain: {job.domain === "DATA_SCIENCE" ? "Data Science" : "Software Dev"}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          Min CGPA: {job.minCgpa.toFixed(2)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {job.location}{job.workMode ? ` (${job.workMode})` : ""}
                        </span>
                        {job.openingsCount && (
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                            {job.openingsCount} Openings
                          </span>
                        )}
                        {job.applicationDeadline && (
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300">
                            Deadline: {job.applicationDeadline}
                          </span>
                        )}
                        {job.requireExaminerReady && (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                            Examiner Viva Ready Required
                          </span>
                        )}
                      </div>

                      {job.requiredSkillTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          {job.requiredSkillTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveJdModalJob(job)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-indigo-300 flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View Full JD {job.jdPdfName ? "(PDF + Details)" : "(Text + Details)"}
                        </button>
                        {job.jdPdfDataUrl && (
                          <a
                            href={job.jdPdfDataUrl}
                            download={job.jdPdfName || `${job.jobCode}_JD.pdf`}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300"
                          >
                            Download JD PDF
                          </a>
                        )}
                      </div>

                      {user.role === "STUDENT" ? (
                        /* Real-Time Rule Evaluation Box (Student View Only) */
                        <div
                          className={`p-3 rounded-xl border text-xs ${
                            elig.eligible
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                          }`}
                        >
                          {elig.eligible ? (
                            <div className="flex items-center gap-2 font-semibold">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span>Eligible (All BRULE-21 to BRULE-25 Checks Passed)</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-semibold">
                                <XCircle className="w-4 h-4 shrink-0" />
                                <span>Not Eligible — Rule Guard Triggered:</span>
                              </div>
                              <ul className="list-disc list-inside text-[11px] space-y-0.5 text-rose-200/90">
                                {elig.reasons.map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Employer / Admin Drive Pipeline Summary */
                        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs flex items-center justify-between gap-2">
                          <span className="text-slate-400">
                            Drive Status:{" "}
                            <strong className="text-emerald-300">Active &amp; Open to Verified IITM BS Talent</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-semibold">
                            {applications.filter((a) => a.jobId === job.id).length} Applicants
                          </span>
                        </div>
                      )}
                    </div>

                    {user.role === "STUDENT" && (
                      <div className="pt-2">
                        {existingApp ? (
                          <div className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center justify-between">
                            <span>Applied ({existingApp.id})</span>
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200">
                              {existingApp.status}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!elig.eligible}
                            onClick={() => elig.eligible && handleApplyToDrive(job)}
                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                              elig.eligible
                                ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                                : "bg-slate-800/70 border border-slate-700 text-slate-500 cursor-not-allowed"
                            }`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            {elig.eligible
                              ? "1-Click Apply with Selected Resume"
                              : "Locked — Requires Examiner 1-on-1 'Placement Ready' Sign-Off"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div className="space-y-6">
                  {/* Segregated Track Filter Header (Internships vs Full-Time FTE) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                    {user.role === "STUDENT" ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 font-semibold">
                          Registered Cohort:{" "}
                          {studentTargetDomain === "DATA_SCIENCE" ? "Data Science" : "Software Development"} •{" "}
                          {studentApplyingTrack === "BOTH" ? "Combined Internship + Full-Time Plan" : studentApplyingTrack === "INTERNSHIP" ? "Internship Plan" : "Full-Time Placement Plan"}
                        </span>
                        <span className="text-slate-400">
                          Showing {baseJobs.length} matching {studentApplyingTrack === "INTERNSHIP" ? "Internship" : "Full-Time"} drive(s)
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setOpportunityTrackFilter("ALL")}
                          className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
                            opportunityTrackFilter === "ALL"
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                          }`}
                        >
                          All Opportunities ({baseJobs.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpportunityTrackFilter("INTERNSHIP")}
                          className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
                            opportunityTrackFilter === "INTERNSHIP"
                              ? "bg-cyan-600 text-white"
                              : "bg-slate-950 border border-slate-800 text-cyan-300 hover:bg-slate-800"
                          }`}
                        >
                          Internships ({baseJobs.filter((j) => j.roleType === "INTERNSHIP").length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpportunityTrackFilter("FULL_TIME")}
                          className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
                            opportunityTrackFilter === "FULL_TIME"
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-950 border border-slate-800 text-emerald-300 hover:bg-slate-800"
                          }`}
                        >
                          Full-Time Employment / FTE ({baseJobs.filter((j) => j.roleType === "FULL_TIME").length})
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {user.role !== "STUDENT" && (
                        <select
                          value={opportunityDomainFilter}
                          onChange={(e) => setOpportunityDomainFilter(e.target.value as "ALL" | QuizDomainOption)}
                          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                        >
                          <option value="ALL">All Domains</option>
                          <option value="DATA_SCIENCE">Data Science</option>
                          <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                        </select>
                      )}
                      <input
                        type="text"
                        value={opportunitySearchQuery}
                        onChange={(e) => setOpportunitySearchQuery(e.target.value)}
                        placeholder="Search company, role, skill..."
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 w-52"
                      />
                    </div>
                  </div>

                  {/* Section A: Internship Opportunities */}
                  {(effectiveTrackFilter === "ALL" || effectiveTrackFilter === "INTERNSHIP") && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          Internship Opportunities ({internshipJobs.length})
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          6-Month &amp; Summer Industry Internships
                        </span>
                      </div>
                      {internshipJobs.length === 0 ? (
                        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                          No Internship opportunities match the current filter.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {internshipJobs.map(renderOpportunityCard)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section B: Full-Time Employment (FTE) Opportunities */}
                  {(effectiveTrackFilter === "ALL" || effectiveTrackFilter === "FULL_TIME") && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Full-Time Employment (FTE) Opportunities ({fteJobs.length})
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          Graduate Full-Time Roles (BSc / BS)
                        </span>
                      </div>
                      {fteJobs.length === 0 ? (
                        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                          No Full-Time Employment (FTE) opportunities match the current filter.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {fteJobs.map(renderOpportunityCard)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full Job Description (Plain Text + Embedded PDF Viewer) Modal */}
                  {activeJdModalJob && (
                    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-indigo-400">{activeJdModalJob.jobCode}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                  activeJdModalJob.roleType === "INTERNSHIP"
                                    ? "bg-cyan-500/20 text-cyan-300"
                                    : "bg-emerald-500/20 text-emerald-300"
                                }`}
                              >
                                {activeJdModalJob.roleType === "INTERNSHIP" ? "INTERNSHIP" : "FULL-TIME (FTE)"}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white mt-1">
                              {activeJdModalJob.companyName} — {activeJdModalJob.title}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {activeJdModalJob.location} {activeJdModalJob.workMode ? `• ${activeJdModalJob.workMode}` : ""} • {activeJdModalJob.compensation}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveJdModalJob(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                          >
                            Close ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                            <span className="text-[11px] text-slate-400 block">Min CGPA</span>
                            <span className="font-bold text-white">{activeJdModalJob.minCgpa.toFixed(2)}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                            <span className="text-[11px] text-slate-400 block">Openings</span>
                            <span className="font-bold text-cyan-300">{activeJdModalJob.openingsCount || "Multiple"}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                            <span className="text-[11px] text-slate-400 block">Deadline</span>
                            <span className="font-bold text-amber-300">{activeJdModalJob.applicationDeadline || "Rolling"}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                            <span className="text-[11px] text-slate-400 block">Allowed Levels</span>
                            <span className="font-bold text-slate-200">{activeJdModalJob.allowedLevels.join(", ")}</span>
                          </div>
                        </div>

                        {activeJdModalJob.selectionRounds && (
                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                            <span className="text-slate-400 font-semibold">Selection Process: </span>
                            <span className="text-slate-200">{activeJdModalJob.selectionRounds}</span>
                          </div>
                        )}

                        {activeJdModalJob.jdText && (
                          <div className="space-y-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 block">
                              Detailed Job Description
                            </span>
                            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                              {activeJdModalJob.jdText}
                            </div>
                          </div>
                        )}

                        {activeJdModalJob.jdPdfDataUrl && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                                Attached JD Document ({activeJdModalJob.jdPdfName || "JD.pdf"})
                              </span>
                              <a
                                href={activeJdModalJob.jdPdfDataUrl}
                                download={activeJdModalJob.jdPdfName || `${activeJdModalJob.jobCode}_JD.pdf`}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                              >
                                Download PDF
                              </a>
                            </div>
                            <iframe
                              src={activeJdModalJob.jdPdfDataUrl}
                              title="Job Description PDF Preview"
                              className="w-full h-96 rounded-xl border border-slate-800 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Student "My Applications" Live Tracker OR Recruiter/Admin ATS Pipeline */}
            {user.role === "STUDENT" ? (() => {
              const myApps = applications.filter(
                (a) =>
                  a.studentRoll.toLowerCase() === user.name.toLowerCase() ||
                  a.studentName.toLowerCase() === fullName.toLowerCase()
              );
              const shortlistedCount = myApps.filter((a) => a.status === "SHORTLISTED").length;
              const interviewCount = myApps.filter(
                (a) =>
                  a.status === "INTERVIEW_SCHEDULED" ||
                  interviews.some((iv) => iv.applicationId === a.id)
              ).length;
              const offeredCount = myApps.filter(
                (a) => a.status === "OFFERED" || offers.some((o) => o.applicationId === a.id)
              ).length;

              const stageRank = (status: AppStatusOption, hasInterview: boolean, hasOffer: boolean) => {
                if (hasOffer || status === "OFFERED") return 4;
                if (hasInterview || status === "INTERVIEW_SCHEDULED") return 3;
                if (status === "SHORTLISTED") return 2;
                if (status === "APPLIED") return 1;
                return 0;
              };

              return (
                <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                        My Applications &amp; Live Recruitment Tracker ({myApps.length})
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Track every submitted Internship &amp; FTE application, the exact resume used, and real-time recruiter shortlisting, interview rounds, and offer updates.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-semibold">
                        Applied: {myApps.length}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold">
                        Shortlisted: {shortlistedCount}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
                        Interviews: {interviewCount}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
                        Offers: {offeredCount}
                      </span>
                    </div>
                  </div>

                  {myApps.length === 0 ? (
                    <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                      You have not applied to any Internship or Full-Time (FTE) opportunities yet. Select your preferred resume at the top and click <strong className="text-slate-200">1-Click Apply</strong> on any eligible opportunity above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {myApps.map((app) => {
                        const matchedJob = jobs.find((j) => j.id === app.jobId);
                        const appInterviews = interviews.filter((iv) => iv.applicationId === app.id);
                        const appOffer = offers.find((o) => o.applicationId === app.id);
                        const currentRank = stageRank(
                          app.status,
                          appInterviews.length > 0,
                          Boolean(appOffer)
                        );
                        const isRejected = app.status === "REJECTED";
                        const isWithdrawn = app.status === "WITHDRAWN";

                        const steps = [
                          { num: 1, label: "Applied" },
                          { num: 2, label: "Shortlisted" },
                          { num: 3, label: "Interview" },
                          { num: 4, label: "Offer" },
                        ];

                        return (
                          <div
                            key={app.id}
                            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 transition space-y-3.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-mono text-indigo-400">
                                    {app.id} • {app.jobCode}
                                  </span>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                      app.roleType === "INTERNSHIP"
                                        ? "bg-cyan-500/20 text-cyan-300"
                                        : "bg-emerald-500/20 text-emerald-300"
                                    }`}
                                  >
                                    {app.roleType === "INTERNSHIP" ? "INTERNSHIP" : "FULL-TIME (FTE)"}
                                  </span>
                                </div>
                                <h3 className="text-sm font-bold text-white mt-1">
                                  {app.companyName} — {app.jobTitle}
                                </h3>
                              </div>

                              <span
                                className={`text-[11px] px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                                  app.status === "OFFERED" || appOffer
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    : app.status === "INTERVIEW_SCHEDULED" || appInterviews.length > 0
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                    : app.status === "SHORTLISTED"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                    : isRejected
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                    : isWithdrawn
                                    ? "bg-slate-800 text-slate-400 border border-slate-700"
                                    : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                                }`}
                              >
                                {appOffer ? "OFFER EXTENDED" : app.status.replace("_", " ")}
                              </span>
                            </div>

                            {/* Resume Used & Submission Metadata */}
                            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 text-[11px]">
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span>Resume Used:</span>
                                <strong className="text-indigo-200">{app.resumeTitle}</strong>
                              </div>
                              <span className="text-slate-400">Submitted: {app.appliedAt}</span>
                            </div>

                            {/* 4-Stage Visual Pipeline Stepper */}
                            {isRejected || isWithdrawn ? (
                              <div
                                className={`p-2.5 rounded-xl border text-xs font-medium ${
                                  isRejected
                                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                    : "bg-slate-900 border-slate-700 text-slate-400"
                                }`}
                              >
                                {isRejected
                                  ? "Application closed by recruiter after evaluation."
                                  : "Application withdrawn by candidate."}
                              </div>
                            ) : (
                              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                                {steps.map((st) => {
                                  const reached = currentRank >= st.num;
                                  return (
                                    <div
                                      key={st.num}
                                      className={`p-2 rounded-lg border text-center transition ${
                                        reached
                                          ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                                          : "bg-slate-900/60 border-slate-800 text-slate-500"
                                      }`}
                                    >
                                      <span className="block text-[10px] font-bold">
                                        {reached ? "✓" : `0${st.num}`}
                                      </span>
                                      <span className="text-[11px] font-semibold">{st.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Live Scheduled Interview Round Details (Synced from Recruiter/Admin Scheduler) */}
                            {appInterviews.length > 0 && (
                              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs">
                                <div className="font-semibold text-amber-300 flex items-center justify-between">
                                  <span>Scheduled Interview Round ({appInterviews.length})</span>
                                  <span className="text-[10px] uppercase">{appInterviews[0].status}</span>
                                </div>
                                {appInterviews.map((iv) => (
                                  <div
                                    key={iv.id}
                                    className="text-[11px] text-slate-200 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-500/20"
                                  >
                                    <span>
                                      <strong>Round {iv.roundNumber}</strong> ({iv.roundType.replace("_", " ")}) •{" "}
                                      {iv.scheduledAt} • Panel: {iv.panelistName}
                                    </span>
                                    {iv.meetingLink && (
                                      <a
                                        href={iv.meetingLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-semibold hover:bg-amber-500/30"
                                      >
                                        Join Link ↗
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Live Offer Letter Callout */}
                            {appOffer && (
                              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-emerald-300 block">
                                    Offer Issued ({appOffer.offerCode}) — ₹{appOffer.ctcLpa} LPA
                                  </span>
                                  <span className="text-[11px] text-slate-300">
                                    Joining: {appOffer.joiningDate} • Expires: {appOffer.expiresAt}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("PLACEMENT")}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold"
                                >
                                  Review Offer →
                                </button>
                              </div>
                            )}

                            {/* Card Footer Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                              {matchedJob ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveJdModalJob(matchedJob)}
                                  className="text-indigo-300 hover:text-indigo-200 font-semibold"
                                >
                                  View Job Description (JD)
                                </button>
                              ) : (
                                <span className="text-slate-500">Drive ID: {app.jobId}</span>
                              )}
                              {app.status === "APPLIED" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateApplicationStatus(app.id, "WITHDRAWN")}
                                  className="text-rose-300 hover:text-rose-200 font-semibold"
                                >
                                  Withdraw Application
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })() : user.role === "RECRUITER" && recruiterWorkspaceView !== "ATS_PIPELINE" ? null : (() => {
              const matchedReg =
                user.role === "RECRUITER"
                  ? registrations.find(
                      (r) => r.email.toLowerCase() === user.email.toLowerCase() && r.role === "RECRUITER"
                    )
                  : undefined;
              const myCompanyName = (
                matchedReg?.recruiterProfileDetails?.companyName ||
                matchedReg?.orgOrDept?.split("(")[0] ||
                newCompany ||
                ""
              ).trim();
              const myCompanyJobIds = new Set(
                jobs
                  .filter(
                    (j) =>
                      j.postedByEmail?.toLowerCase() === user.email.toLowerCase() ||
                      (myCompanyName && j.companyName.toLowerCase().includes(myCompanyName.toLowerCase()))
                  )
                  .map((j) => j.id)
              );
              const visibleApplications =
                user.role === "RECRUITER" && !recruiterShowAllDrives
                  ? applications.filter((a) => myCompanyJobIds.has(a.jobId))
                  : applications;

              return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-semibold text-white">
                    {user.role === "RECRUITER" && !recruiterShowAllDrives
                      ? `My Company Candidate ATS Pipeline (${visibleApplications.length})`
                      : `Applications & Recruiter ATS Pipeline (${visibleApplications.length})`}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Shortlist candidates, schedule interviews, extend offers, or trigger BRULE-21 placement lock.
                  </p>
                </div>
              </div>

              {visibleApplications.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl p-4">
                  {user.role === "RECRUITER" && !recruiterShowAllDrives
                    ? "No candidates have applied to your company's posted drives yet. Toggle 'Show All Portal Drives' above to inspect cross-portal demo applications."
                    : "No applications submitted yet. Apply to an eligible drive above to populate the ATS pipeline."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 pr-3">App ID</th>
                        <th className="py-2.5 px-3">Drive & Company</th>
                        <th className="py-2.5 px-3">Candidate & Resume</th>
                        <th className="py-2.5 px-3">Stage</th>
                        <th className="py-2.5 pl-3">Recruiter Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {visibleApplications.map((app) => (
                        <tr key={app.id}>
                          <td className="py-3 pr-3 font-mono text-slate-300">{app.id}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-white block">{app.companyName}</span>
                            <span className="text-slate-400">{app.jobTitle}</span>
                          </td>
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => handleOpenRecruiterCandidateDossier(app.studentRoll, app.studentName)}
                              className="text-left group"
                            >
                              <span className="text-indigo-300 group-hover:text-indigo-200 underline decoration-indigo-400/60 font-semibold block">
                                {app.studentName} ({app.studentRoll}) • CGPA {app.studentCgpa}
                              </span>
                              <span className="text-slate-400 text-[11px] block">
                                Applied Resume: <span className="text-slate-200">{app.resumeTitle}</span>
                              </span>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-[10px] font-semibold">
                                View Scorecard, Drive Links &amp; Inline Resume ↗
                              </span>
                            </button>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                              {app.status}
                            </span>
                          </td>
                            <td className="py-3 pl-3">
                              <select
                                value={app.status}
                                onChange={(e) =>
                                  handleUpdateApplicationStatus(
                                    app.id,
                                    e.target.value as AppStatusOption
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                              >
                                <option value="APPLIED">APPLIED</option>
                                <option value="SHORTLISTED">SHORTLISTED</option>
                                <option value="INTERVIEW_SCHEDULED">INTERVIEW_SCHEDULED</option>
                                <option value="OFFERED">OFFERED</option>
                                <option value="OFFER_ACCEPTED">OFFER_ACCEPTED</option>
                                <option value="REJECTED">REJECTED</option>
                              </select>
                            </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
              );
            })()}
          </div>
        )}

        {activeTab === "IDENTITY" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Complete Student Registration Dossier */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-semibold text-white">Student Registration Dossier</h2>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono">
                    Roll: {user.email.split("@")[0].toUpperCase()}
                  </span>
                </div>

                {(() => {
                  const meta = resolveStudentRegMeta(user.email);
                  const effLevel = meta?.details.programLevel || programLevel;
                  const effTrack = meta?.details.applyingTrack || studentApplyingTrack;
                  const effDomain = meta?.details.targetDomain || studentTargetDomain;
                  const isDeg = effLevel === "BSC" || effLevel === "BS";
                  const dsDip = isDeg || Boolean(meta?.details.hasDiplomaDataScience);
                  const progDip = isDeg || Boolean(meta?.details.hasDiplomaProgramming);
                  return (
                    <div className="mb-4 p-3.5 rounded-xl bg-indigo-950/35 border border-indigo-500/30 text-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-indigo-200 uppercase tracking-wider text-[11px]">
                          Verified Registration &amp; Track Eligibility
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                          {meta?.reg.status || "VERIFIED"} • {meta?.reg.paymentStatus || "PAID"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">
                          Program: <strong>{effLevel}</strong> ({degreeType.replace("_", " ")})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-200">
                          Opted Track: <strong>{effTrack === "BOTH" ? "BOTH (Internship + Full-Time)" : effTrack}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-200">
                          Domain: <strong>{effDomain === "DATA_SCIENCE" ? "Data Science" : "Software Development"}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-200">
                          Diplomas: {dsDip ? "Data Science ✓" : "DS ✗"} • {progDip ? "Programming ✓" : "Prog ✗"}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {regAlert && (
                  <div
                    className={`mb-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      regAlert.type === "OK"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    {regAlert.type === "OK" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{regAlert.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveRegistration} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Student Email ID (IITM)</label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Personal Email ID</label>
                      <input
                        type="email"
                        value={personalEmail}
                        onChange={(e) => setPersonalEmail(e.target.value)}
                        placeholder="personal@gmail.com"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Current CGPA</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={cgpaInput}
                        onChange={(e) => setCgpaInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Program Level</label>
                      <select
                        value={programLevel}
                        onChange={(e) => setProgramLevel(e.target.value as ProgramLevelOption)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      >
                        <option value="FOUNDATION">Foundation</option>
                        <option value="DIPLOMA">Diploma</option>
                        <option value="BSC">BSc</option>
                        <option value="BS">BS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Active Backlogs</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={activeBacklogs}
                        onChange={(e) => setActiveBacklogs(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">State</label>
                      <select
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      >
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as CategoryOption)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      >
                        <option value="GENERAL">General</option>
                    <option value="GENERAL_EWS">General-EWS</option>
                        <option value="OBC">OBC</option>
                        <option value="OBC_NCL">OBC-NCL</option>
                        <option value="SC_ST">SC/ST</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Degree Type</label>
                      <select
                        value={degreeType}
                        onChange={(e) => setDegreeType(e.target.value as DegreeTypeOption)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      >
                        <option value="STANDALONE">Standalone</option>
                        <option value="DUAL_DEGREE">Dual Degree</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-indigo-400" />
                        Working Professional?
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsWorkingProf(true)}
                          className={`px-3 py-1 rounded-lg font-semibold border transition ${
                            isWorkingProf
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsWorkingProf(false)}
                          className={`px-3 py-1 rounded-lg font-semibold border transition ${
                            !isWorkingProf
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {isWorkingProf && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                        <div>
                          <label className="block text-slate-400 mb-1">Years of Experience</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="40"
                            value={yearsExp}
                            onChange={(e) => setYearsExp(e.target.value)}
                            placeholder="e.g., 2.5"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Domain</label>
                          <select
                            value={workDomain}
                            onChange={(e) => setWorkDomain(e.target.value as WorkDomainOption)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          >
                            <option value="DATA_SCIENCE">Data Science</option>
                            <option value="SOFTWARE_DEVELOPMENT">Software Development</option>
                            <option value="OTHERS">Others</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Present Company</label>
                          <input
                            type="text"
                            value={presentCompany}
                            onChange={(e) => setPresentCompany(e.target.value)}
                            placeholder="e.g., TCS / Fractal / Zoho"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Work Location</label>
                          <input
                            type="text"
                            value={workLocation}
                            onChange={(e) => setWorkLocation(e.target.value)}
                            placeholder="e.g., Bengaluru / Chennai"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Current CTC (LPA)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="500"
                            value={currentCtc}
                            onChange={(e) => setCurrentCtc(e.target.value)}
                            placeholder="e.g., 12.5"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
                  >
                    Save Student Registration Dossier
                  </button>
                </form>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="font-semibold text-white mb-3">
                  LinkedIn, GitHub & Kaggle Handles
                </h2>
                {handlesSavedBanner && (
                  <div className="mb-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{handlesSavedBanner}</span>
                  </div>
                )}
                <form onSubmit={handleSaveHandles} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">LinkedIn User ID</label>
                      <input
                        type="text"
                        value={linkedinId}
                        onChange={(e) => {
                          setLinkedinId(e.target.value);
                          setHandlesSavedBanner(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">GitHub Username</label>
                      <input
                        type="text"
                        value={githubUsername}
                        onChange={(e) => {
                          setGithubUsername(e.target.value);
                          setHandlesSavedBanner(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Kaggle Username</label>
                      <input
                        type="text"
                        value={kaggleUsername}
                        onChange={(e) => {
                          setKaggleUsername(e.target.value);
                          setHandlesSavedBanner(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold transition"
                  >
                    Save Developer & LinkedIn Handles
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: BS Marksheet & Resume Vault */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-semibold text-white">IITM BS Official Scorecard (Google Drive)</h2>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      marksheet
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-slate-950 text-slate-400 border-slate-800"
                    }`}
                  >
                    {marksheet ? "Linked" : "Pending Drive Link"}
                  </span>
                </div>

                {marksheet && (
                  <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-emerald-200">{marksheet.fileName}</p>
                      <p className="text-slate-400 mt-0.5">
                        CGPA: <span className="text-white font-semibold">{marksheet.cgpa}</span> •{" "}
                        {marksheet.uploadedAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {marksheet.driveUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setDriveDocPreview({
                              title: marksheet.fileName,
                              subtitle: `IITM BS Portal Scorecard • CGPA ${marksheet.cgpa}`,
                              url: marksheet.driveUrl,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 font-semibold"
                        >
                          Inline Preview
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {marksheetAlert && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{marksheetAlert}</span>
                  </div>
                )}

                {user.role === "STUDENT" && (
                  <form onSubmit={handleUploadMarksheet} className="space-y-3">
                    <div>
                      <input
                        type="url"
                        required
                        value={marksheetDriveUrl}
                        onChange={(e) => setMarksheetDriveUrl(e.target.value)}
                        placeholder="Paste Google Drive link to BS Portal Scorecard PDF (Anyone with link can view)"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Save BS Scorecard Drive Link
                    </button>
                  </form>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-semibold text-white">3-Resume Vault — Google Drive (BRULE-55)</h2>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      resumes.length >= 3
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "bg-slate-950 text-slate-300 border-slate-800"
                    }`}
                  >
                    {resumes.length} / 3 Active
                  </span>
                </div>

                <div className="space-y-2.5 mb-5">
                  {resumes.map((res) => (
                    <div
                      key={res.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-100 truncate">{res.title}</p>
                          {res.isPrimary && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 shrink-0">
                              PRIMARY
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {res.targetRole} • {res.updatedAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {res.driveUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setDriveDocPreview({
                                title: res.title,
                                subtitle: `Target Role: ${res.targetRole}`,
                                url: res.driveUrl,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold"
                          >
                            Inline Preview
                          </button>
                        )}
                        {user.role === "STUDENT" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteResume(res.id, res.title)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Archive Resume"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {vaultAlert && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{vaultAlert}</span>
                  </div>
                )}

                {user.role === "STUDENT" && (
                  <form onSubmit={handleAddResume} className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                        placeholder="Target Role (e.g., Data Scientist, SDE)"
                        className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                      <input
                        type="text"
                        value={newResumeTitle}
                        onChange={(e) => setNewResumeTitle(e.target.value)}
                        placeholder="Resume Label (optional, e.g., DS_Resume.pdf)"
                        className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        value={newResumeDriveUrl}
                        onChange={(e) => setNewResumeDriveUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        Add Drive Resume
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "TRAINING" && (
          <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading Training & Vetting Workspace...</div>}>
            <TrainingAndVettingPortal ctx={{ activePoolSize, activeTrack, examinerSlots, setExaminerSlots, registrations, ingestParsedSlotRows, activityAlert, activityCompletedDate, activityProofUrl, activitySubmissions, badges, bulkImporting, bulkQDomain, bulkQMode, bulkQStatus, bulkQTrack, bulkSheetUrl, commRating, computeTrainingAndActivityProgress, coordCsvInputRef, coordFeedback, coordTargetRoll, drawnQuestions, dsRating, evalBanner, evalSkillsets, evaluations, examinerNotes, examinerSlotScope, formatTimer, handleAddQuestionToBank, handleCreateQuestionDirect, handleUpdateQuestionInBank, handleDeleteQuestionFromBank, handleDownloadQuestionBankCsv, handleAddSingleSlot, handleAttemptTrainingStage, handleBatchTrainingCsvUpload, handleCoordinatorReviewActivity, handleCoordinatorUpdateStageScore, handleDownloadSampleQuestionCsv, handleDownloadSampleSlotsCsv, handleDownloadSampleTrainingCsv, handleDownloadFullTrainingReportCsv, trainingStagesByRoll, handleLogActivityPoint, handlePasteSlotRowsSubmit, handleQuestionBankFileUpload, handleQuestionBankSheetUrlImport, handleSaveExaminerEvaluation, handleSimulateOneOnOneSignoff, handleSpreadsheetSlotFileUpload, handleStartRandomQuiz, handleSubmitQuiz, isPlacementReady, isQuizActive, manualSlotDate, manualSlotEmail, manualSlotInstructor, manualSlotName, manualSlotTime, marksheet, oneOnOneSlots, performingExceptionallyGood, progRating, qbBanner, qbCorrectIdx, qbDomain, qbOpt0, qbOpt1, qbOpt2, qbOpt3, qbPrompt, qbTrack, questionBank, quizAnswers, quizBanner, remedialTasksText, resolveActiveStudentRoll, resumes, secondsLeft, selectedActivityToLog, selectedSlotIdForEval, setActiveTrackId, setActivityCompletedDate, setActivityProofUrl, setBulkQDomain, setBulkQMode, setBulkQStatus, setBulkQTrack, setBulkSheetUrl, setCommRating, setCoordTargetRoll, setDrawnQuestions, setDriveDocPreview, setDsRating, setEvalSkillsets, setExaminerNotes, setExaminerSlotScope, setIsPlacementReady, setManualSlotDate, setManualSlotEmail, setManualSlotInstructor, setManualSlotName, setManualSlotTime, setPerformingExceptionallyGood, setPreviewSubmission, setProgRating, setQbCorrectIdx, setQbDomain, setQbOpt0, setQbOpt1, setQbOpt2, setQbOpt3, setQbPrompt, setQbTrack, setQuizAnswers, setQuizBanner, setRemedialTasksText, setSelectedActivityToLog, setSelectedSlotIdForEval, setSlotPasteText, setSlotProgressFilter, setSlotUploadAlert, slotPasteText, slotProgressFilter, slotUploadAlert, studentApplyingTrack, studentTargetDomain, toggleModuleComplete, tracks, trainingStages, user }} />
          </Suspense>
        )}

        {activeTab === "PLACEMENT" && (user.role as Role) !== "STUDENT" && (() => {
          const matchedRecReg =
            user.role === "RECRUITER"
              ? registrations.find(
                  (r) => r.email.toLowerCase() === user.email.toLowerCase() && r.role === "RECRUITER"
                )
              : undefined;
          const myRecCompany = (
            matchedRecReg?.recruiterProfileDetails?.companyName ||
            matchedRecReg?.orgOrDept?.split("•")[0]?.split("(")[0] ||
            newCompany ||
            ""
          ).trim();
          const myRecCompanyLower = myRecCompany.toLowerCase();
          const scopedJobsForPlacement =
            user.role === "RECRUITER"
              ? jobs.filter(
                  (j) =>
                    j.postedByEmail?.toLowerCase() === user.email.toLowerCase() ||
                    (myRecCompanyLower && j.companyName.toLowerCase().includes(myRecCompanyLower))
                )
              : jobs;
          const scopedJobIdsForPlacement = new Set(scopedJobsForPlacement.map((j) => j.id));
          const scopedAppsForPlacement =
            user.role === "RECRUITER"
              ? applications.filter((a) => scopedJobIdsForPlacement.has(a.jobId))
              : applications;
          const scopedOffersForPlacement =
            user.role === "RECRUITER"
              ? offers.filter((o) => myRecCompanyLower && o.companyName.toLowerCase().includes(myRecCompanyLower))
              : offers;
          const scopedInterviewsForPlacement =
            user.role === "RECRUITER"
              ? interviews.filter((iv) => myRecCompanyLower && iv.companyName.toLowerCase().includes(myRecCompanyLower))
              : interviews;
          const acceptedOffers = scopedOffersForPlacement.filter((o) => o.status === "ACCEPTED");
          const ftOffers = scopedOffersForPlacement.filter((o) => o.roleType === "FULL_TIME");
          const avgCtc = ftOffers.length
            ? (ftOffers.reduce((acc, o) => acc + o.ctcLpa, 0) / ftOffers.length).toFixed(2)
            : user.role === "RECRUITER"
            ? "0.00"
            : "16.50";
          const maxCtc = ftOffers.length
            ? Math.max(...ftOffers.map((o) => o.ctcLpa)).toFixed(2)
            : user.role === "RECRUITER"
            ? "0.00"
            : "22.00";

          return (
            <div className="space-y-8">
              {placementAlert && (
                <div
                  className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    placementAlert.type === "OK"
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
                      : "bg-rose-950/60 border-rose-500/40 text-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {placementAlert.type === "OK" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{placementAlert.text}</span>
                  </div>
                  <button
                    onClick={() => setPlacementAlert(null)}
                    className="text-slate-400 hover:text-white text-[11px] underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Placement Cell Executive KPIs */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-400" />
                      {user.role === "RECRUITER" ? `${myRecCompany || "Company"} Hiring Funnel & Offer Telemetry` : "IITM BS Placement Analytics & Cohort Telemetry"}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Live conversion funnel across drives, interviews, issued offers, and BRULE-35 locked acceptances.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                    2026-27 Placement Season
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400">Active Drives</div>
                    <div className="text-xl font-bold text-white mt-1">{scopedJobsForPlacement.length}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400">Applications</div>
                    <div className="text-xl font-bold text-sky-300 mt-1">{scopedAppsForPlacement.length}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400">Interviews</div>
                    <div className="text-xl font-bold text-amber-300 mt-1">{scopedInterviewsForPlacement.length}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400">Offers Issued</div>
                    <div className="text-xl font-bold text-purple-300 mt-1">{scopedOffersForPlacement.length}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400">Offers Accepted</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">{acceptedOffers.length}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400">Avg / Max FT CTC</div>
                    <div className="text-base font-bold text-emerald-300 mt-1">
                      ₹{avgCtc} / ₹{maxCtc} LPA
                    </div>
                  </div>
                </div>
              </div>

              {/* Offer Letters Desk (BRULE-35 Single Full-Time Offer Lock) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-emerald-400" />
                      Official Offer Letters ({scopedOffersForPlacement.length})
                    </h3>
                    <span className="text-[11px] text-slate-400">BRULE-35 Single FT Lock Active</span>
                  </div>

                  <div className="space-y-3">
                    {scopedOffersForPlacement.length === 0 ? (
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                        No formal offer letters issued yet{user.role === "RECRUITER" && myRecCompany ? ` for ${myRecCompany}` : ""}.
                      </div>
                    ) : (
                      scopedOffersForPlacement.map((ofr) => (
                      <div
                        key={ofr.id}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-indigo-300">{ofr.offerCode}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300">
                              {ofr.roleType}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ofr.status === "ACCEPTED"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : ofr.status === "DECLINED"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {ofr.status}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-white">
                            {ofr.companyName} — {ofr.roleTitle}
                          </div>
                          <div className="text-xs text-slate-400">
                            Candidate: <span className="text-slate-200">{ofr.studentName}</span> ({ofr.studentRoll}) ·{" "}
                            <span className="text-emerald-300 font-semibold">₹{ofr.ctcLpa.toFixed(2)} LPA</span> · Joins{" "}
                            {ofr.joiningDate} (Expires {ofr.expiresAt})
                          </div>
                          {ofr.remarks && (
                            <div className="text-[11px] text-slate-500 italic">{ofr.remarks}</div>
                          )}
                        </div>

                        {user?.role === "STUDENT" && ofr.status === "ISSUED" && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleRespondToOffer(ofr.id, "ACCEPTED")}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                            >
                              Accept Offer
                            </button>
                            <button
                              onClick={() => handleRespondToOffer(ofr.id, "DECLINED")}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs font-semibold transition"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                    )}
                  </div>
                </div>

                {/* Recruiter / Admin Offer Issuance Form */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    Issue Formal Offer Letter
                  </h3>
                  <form onSubmit={handleIssueOfferLetter} className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Target Application</label>
                      <select
                        value={ofrAppId}
                        onChange={(e) => setOfrAppId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      >
                        {scopedAppsForPlacement.length === 0 ? (
                          <option value="">No applicants for {myRecCompany || "your company"} drives yet</option>
                        ) : (
                          scopedAppsForPlacement.map((app) => (
                            <option key={app.id} value={app.id}>
                              {app.studentName} — {app.companyName} ({app.jobTitle})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Annualized CTC (LPA)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={ofrCtcLpa}
                          onChange={(e) => setOfrCtcLpa(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Joining Date</label>
                        <input
                          type="date"
                          value={ofrJoiningDate}
                          onChange={(e) => setOfrJoiningDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Offer Response Deadline</label>
                      <input
                        type="date"
                        value={ofrExpiresAt}
                        onChange={(e) => setOfrExpiresAt(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={user?.role === "STUDENT" || scopedAppsForPlacement.length === 0}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold transition"
                    >
                      {user?.role === "STUDENT" ? "Switch to Recruiter / Admin to Issue Offers" : "Generate & Issue Offer Letter"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Interview Schedule & BRULE-31 Conflict-Free Slot Engine */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-400" />
                      Scheduled Interview Panels ({scopedInterviewsForPlacement.length})
                    </h3>
                    <span className="text-[11px] text-slate-400">BRULE-31 45-Min Conflict Guard</span>
                  </div>

                  <div className="space-y-3">
                    {scopedInterviewsForPlacement.length === 0 ? (
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                        No interview panels scheduled yet{user.role === "RECRUITER" && myRecCompany ? ` for ${myRecCompany}` : ""}.
                      </div>
                    ) : (
                      scopedInterviewsForPlacement.map((iv) => (
                      <div
                        key={iv.id}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-sky-300">{iv.id}</span>
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                              Round {iv.roundNumber} · {iv.roundType}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                iv.status === "PASSED" || iv.status === "CONFIRMED"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : iv.status === "FAILED"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {iv.status}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-white">
                            {iv.companyName} — {iv.jobTitle}
                          </div>
                          <div className="text-xs text-slate-400">
                            Candidate: <span className="text-slate-200">{iv.studentName}</span> · Slot:{" "}
                            <span className="text-sky-300 font-medium">{iv.scheduledAt.replace("T", " ")} IST</span> · Panelist:{" "}
                            {iv.panelistName}
                          </div>
                          <div className="text-[11px] text-indigo-400 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5" />
                            <span>{iv.meetingLink}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {user?.role === "STUDENT" && iv.status === "SCHEDULED" && (
                            <button
                              onClick={() => handleUpdateInterviewStatus(iv.id, "CONFIRMED")}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition"
                            >
                              Confirm Slot
                            </button>
                          )}
                          {user?.role !== "STUDENT" && (iv.status === "SCHEDULED" || iv.status === "CONFIRMED") && (
                            <>
                              <button
                                onClick={() => handleUpdateInterviewStatus(iv.id, "PASSED")}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                              >
                                Pass Round
                              </button>
                              <button
                                onClick={() => handleUpdateInterviewStatus(iv.id, "FAILED")}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold transition"
                              >
                                Fail
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                    )}
                  </div>
                </div>

                {/* Recruiter / Admin Interview Slot Scheduler */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Schedule Interview Slot
                  </h3>
                  <form onSubmit={handleScheduleInterview} className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Candidate Application</label>
                      <select
                        value={ivAppId}
                        onChange={(e) => setIvAppId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      >
                        {scopedAppsForPlacement.length === 0 ? (
                          <option value="">No applicants for {myRecCompany || "your company"} drives yet</option>
                        ) : (
                          scopedAppsForPlacement.map((app) => (
                            <option key={app.id} value={app.id}>
                              {app.studentName} — {app.companyName} ({app.jobTitle})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Interview Round</label>
                        <select
                          value={ivRoundType}
                          onChange={(e) => setIvRoundType(e.target.value as InterviewRoundOption)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                        >
                          <option value="TECHNICAL_1">TECHNICAL_1</option>
                          <option value="TECHNICAL_2">TECHNICAL_2</option>
                          <option value="MANAGERIAL">MANAGERIAL</option>
                          <option value="HR_FINAL">HR_FINAL</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Mode</label>
                        <select
                          value={ivMode}
                          onChange={(e) => setIvMode(e.target.value as "ONLINE_MEET" | "IN_PERSON")}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                        >
                          <option value="ONLINE_MEET">ONLINE_MEET</option>
                          <option value="IN_PERSON">IN_PERSON</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Date & Time (IST)</label>
                      <input
                        type="datetime-local"
                        value={ivDateTime}
                        onChange={(e) => setIvDateTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Panelist Name & Title</label>
                      <input
                        type="text"
                        value={ivPanelist}
                        onChange={(e) => setIvPanelist(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Meeting Link / Campus Room</label>
                      <input
                        type="text"
                        value={ivMeetingLink}
                        onChange={(e) => setIvMeetingLink(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={user?.role === "STUDENT" || scopedAppsForPlacement.length === 0}
                      className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-semibold transition"
                    >
                      {user?.role === "STUDENT" ? "Switch to Recruiter / Admin to Schedule" : "Schedule Interview Slot"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === "GOVERNANCE" && user.role === "ADMIN" && (
          <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading Executive Command Center...</div>}>
            <AdminGovernancePortal
              ctx={{
                questionBank,
                handleCreateQuestionDirect,
                handleUpdateQuestionInBank,
                handleDeleteQuestionFromBank,
                handleDownloadQuestionBankCsv,
                registrations,
                evaluations,
                applications,
                offers,
                handleRegistrationDecision,
                handleAdminDownloadRosterCsv,
                handleDownloadFullTrainingReportCsv,
                trainingStages,
                trainingStagesByRoll,
                activitySubmissions,
                oneOnOneSlots,
                badges,
                setDriveDocPreview,
                auditLogs,
                jobs,
                adminDirectoryRoleFilter,
                setAdminDirectoryRoleFilter,
                adminDirectorySearch,
                setAdminDirectorySearch,
                adminNewFullName,
                setAdminNewFullName,
                adminNewEmail,
                setAdminNewEmail,
                adminNewRole,
                setAdminNewRole,
                adminNewOrgOrDept,
                setAdminNewOrgOrDept,
                adminNewStatus,
                setAdminNewStatus,
                adminCommandAlert,
                setAdminCommandAlert,
                editingRegId,
                setEditingRegId,
                editRegDraft,
                setEditRegDraft,
                editingJobId,
                setEditingJobId,
                editJobDraft,
                setEditJobDraft,
                handleAdminCreateUser,
                handleAdminStartEditUser,
                handleAdminSaveEditUser,
                handleAdminDeleteUser,
                handleAdminStartEditJob,
                handleAdminSaveEditJob,
                handleAdminDeleteJob,
                setActiveTab,
              }}
            />
          </Suspense>
        )}

        {previewSubmission && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">Activity Submission Evidence ({previewSubmission.id})</h3>
                  <p className="text-xs text-slate-400">{previewSubmission.studentName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewSubmission(null)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Close ✕
                </button>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                {previewSubmission.studentName !== undefined && previewSubmission.studentName !== "" && (
                  <div><span className="text-slate-400">studentName: </span><span className="text-slate-200">{String(previewSubmission.studentName)}</span></div>
                )}
                {previewSubmission.studentEmail !== undefined && previewSubmission.studentEmail !== "" && (
                  <div><span className="text-slate-400">studentEmail: </span><span className="text-slate-200">{String(previewSubmission.studentEmail)}</span></div>
                )}
                {previewSubmission.activityId !== undefined && previewSubmission.activityId !== "" && (
                  <div><span className="text-slate-400">activityId: </span><span className="text-slate-200">{String(previewSubmission.activityId)}</span></div>
                )}
                {previewSubmission.evidenceFileName !== undefined && previewSubmission.evidenceFileName !== "" && (
                  <div><span className="text-slate-400">evidenceFileName: </span><span className="text-slate-200">{String(previewSubmission.evidenceFileName)}</span></div>
                )}
                {previewSubmission.evidenceFileType !== undefined && previewSubmission.evidenceFileType !== "" && (
                  <div><span className="text-slate-400">evidenceFileType: </span><span className="text-slate-200">{String(previewSubmission.evidenceFileType)}</span></div>
                )}
                {previewSubmission.evidenceFileSize !== undefined && previewSubmission.evidenceFileSize !== "" && (
                  <div><span className="text-slate-400">evidenceFileSize: </span><span className="text-slate-200">{String(previewSubmission.evidenceFileSize)}</span></div>
                )}
                {previewSubmission.proofUrl && (
                  <div><span className="text-slate-400">proofUrl: </span><a href={String(previewSubmission.proofUrl)} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline break-all font-mono">{String(previewSubmission.proofUrl)}</a></div>
                )}
                {previewSubmission.completedDate !== undefined && previewSubmission.completedDate !== "" && (
                  <div><span className="text-slate-400">completedDate: </span><span className="text-slate-200">{String(previewSubmission.completedDate)}</span></div>
                )}
                {previewSubmission.reviewStatus && (
                  <div><span className="text-slate-400">reviewStatus: </span><span className="text-slate-200">{String(previewSubmission.reviewStatus)}</span></div>
                )}
                {previewSubmission.reviewerNote !== undefined && previewSubmission.reviewerNote !== "" && (
                  <div><span className="text-slate-400">reviewerNote: </span><span className="text-slate-200">{String(previewSubmission.reviewerNote)}</span></div>
                )}
              </div>
            </div>
          </div>
        )}
        {driveDocPreview && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">{driveDocPreview.title}</h3>
                  <p className="text-xs text-slate-400">{driveDocPreview.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDriveDocPreview(null)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Close ✕
                </button>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="text-slate-400">Verified Document Link:</p>
                <a
                  href={driveDocPreview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline break-all font-mono"
                >
                  {driveDocPreview.url}
                </a>
              </div>
            </div>
          </div>
        )}
        {activeTab === "HELPDESK" && (() => {
          const isStaff = user.role === "ADMIN" || user.role === "TRAINING_COORDINATOR";
          const visibleTickets = helpdeskTickets
            .filter((t) =>
              isStaff ? true : t.raisedByEmail.toLowerCase() === user.email.toLowerCase()
            )
            .filter((t) => (hdFilterStatus === "ALL" ? true : t.status === hdFilterStatus));

          const handleCreateTicket = (e: React.FormEvent) => {
            e.preventDefault();
            if (!hdSubject.trim() || !hdDescription.trim()) return;
            const nowIso = new Date().toISOString();
            const newTicket: HelpdeskTicketRecord = {
              id: `TKT-${Date.now()}`,
              ticketNumber: `HD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}${Math.floor(10 + Math.random() * 90)}`,
              raisedByEmail: user.email,
              raisedByName: user.name || fullName || user.email.split("@")[0],
              raisedByRole: user.role,
              category: hdCategory,
              priority: hdPriority,
              subject: hdSubject.trim(),
              description: hdDescription.trim(),
              status: "OPEN",
              assignedTo: null,
              escalationCount: 0,
              comments: [],
              createdAt: nowIso,
            };
            setHelpdeskTickets((prev) => [newTicket, ...prev]);
            setHdSubject("");
            setHdDescription("");
          };

          const handleAddReply = (ticketId: string) => {
            const draft = (hdReplyDrafts[ticketId] || "").trim();
            if (!draft) return;
            setHelpdeskTickets((prev) =>
              prev.map((t) =>
                t.id === ticketId
                  ? {
                      ...t,
                      status: t.status === "OPEN" ? "IN_PROGRESS" : t.status,
                      comments: [
                        ...(t.comments || []),
                        {
                          author: user.name || user.email,
                          role: user.role,
                          text: draft,
                          createdAt: new Date().toISOString(),
                        },
                      ],
                    }
                  : t
              )
            );
            setHdReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
          };

          const handleEscalateTicket = (ticketId: string) => {
            setHelpdeskTickets((prev) =>
              prev.map((t) =>
                t.id === ticketId
                  ? {
                      ...t,
                      status: "ESCALATED",
                      priority: "URGENT",
                      escalationCount: (t.escalationCount || 0) + 1,
                    }
                  : t
              )
            );
          };

          const handleResolveTicket = (ticketId: string) => {
            setHelpdeskTickets((prev) =>
              prev.map((t) =>
                t.id === ticketId
                  ? {
                      ...t,
                      status: "RESOLVED",
                      assignedTo: t.assignedTo || user.email,
                    }
                  : t
              )
            );
          };

          return (
            <div className="space-y-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-indigo-400" />
                      Placement &amp; Training Helpdesk Desk
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Raise support queries, track coordinator resolutions, and sync ticket threads directly to PostgreSQL.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold">
                      Total: {visibleTickets.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                      Open/Active: {visibleTickets.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED").length}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleCreateTicket} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Category
                    </label>
                    <select
                      value={hdCategory}
                      onChange={(e) => setHdCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                    >
                      <option value="PLACEMENT">Placement &amp; Drives</option>
                      <option value="OFFER_VERIFICATION">Offer Letter Verification</option>
                      <option value="TRAINING">Training &amp; Activity Points</option>
                      <option value="EVALUATION">1-on-1 Viva &amp; Evaluation</option>
                      <option value="TECHNICAL">Portal Technical Issue</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Priority
                    </label>
                    <select
                      value={hdPriority}
                      onChange={(e) => setHdPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={hdSubject}
                      onChange={(e) => setHdSubject(e.target.value)}
                      placeholder="e.g., Requesting CGPA verification update before shortlist freeze"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Detailed Description
                    </label>
                    <input
                      type="text"
                      required
                      value={hdDescription}
                      onChange={(e) => setHdDescription(e.target.value)}
                      placeholder="Include roll number, drive code, or slot ID for faster resolution..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Raise Ticket
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-white">
                    {isStaff ? "All Support Tickets Queue" : "My Support Tickets"}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {["ALL", "OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED"].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setHdFilterStatus(st)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                          hdFilterStatus === st
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {visibleTickets.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-400">
                    No helpdesk tickets match the selected filter.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visibleTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-indigo-400">
                                {ticket.ticketNumber}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                                {ticket.category}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  ticket.priority === "URGENT" || ticket.priority === "HIGH"
                                    ? "bg-rose-500/20 text-rose-300"
                                    : "bg-slate-800 text-slate-300"
                                }`}
                              >
                                {ticket.priority}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  ticket.status === "RESOLVED"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : ticket.status === "ESCALATED"
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-indigo-500/20 text-indigo-300"
                                }`}
                              >
                                {ticket.status}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white mt-1.5">{ticket.subject}</h4>
                            <p className="text-xs text-slate-300 mt-1">{ticket.description}</p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Raised by {ticket.raisedByName} ({ticket.raisedByEmail}) • Escalations: {ticket.escalationCount || 0}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {ticket.status !== "RESOLVED" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEscalateTicket(ticket.id)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold"
                                >
                                  Escalate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResolveTicket(ticket.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold"
                                >
                                  Mark Resolved
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {(ticket.comments || []).length > 0 && (
                          <div className="pl-3 border-l-2 border-slate-800 space-y-2">
                            {ticket.comments.map((c, idx) => (
                              <div key={idx} className="text-xs bg-slate-900/90 rounded-lg p-2.5">
                                <span className="font-semibold text-indigo-300">{c.author}</span>{" "}
                                <span className="text-[10px] text-slate-500">({c.role})</span>
                                <p className="text-slate-300 mt-0.5">{c.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {ticket.status !== "RESOLVED" && (
                          <div className="flex gap-2 pt-1">
                            <input
                              type="text"
                              value={hdReplyDrafts[ticket.id] || ""}
                              onChange={(e) =>
                                setHdReplyDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                              }
                              placeholder="Write an update or coordinator note..."
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddReply(ticket.id)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                            >
                              <Send className="w-3 h-3" />
                              Reply
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}