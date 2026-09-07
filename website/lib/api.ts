export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://saksham-api-82mn.onrender.com";

export interface AdminStats {
  totals: {
    sessions: number;
    beneficiaries: number;
    recommendations: number;
    lowBandwidthSessions: number;
    applications: number;
  };
  funnel: {
    suggested: number;
    viewed: number;
    interested: number;
    applied: number;
    enrolled: number;
    conversionRate: number;
  };
  byLanguage: { language: string; _count: number }[];
  byStatus: { status: string; _count: number }[];
  topSkills: { normalizedSkill: string; _count: number }[];
  /** most-matched NSQF qualifications, named */
  topQualifications: { name: string; count: number }[];
  /** most-recommended PM-AJAY courses, named */
  topCourses: { name: string; count: number }[];
  /** postings people actually applied to, named */
  topJobs: { name: string; count: number }[];
}

export interface SessionRow {
  id: string;
  channel: string;
  language: string;
  rawTranscript: string | null;
  detectedSkills: string[];
  bandwidthKbps: number | null;
  state: string | null;
  district: string | null;
  createdAt: string;
  user: { id: string; name: string | null; phone: string | null; district: string | null } | null;
  mappings: {
    id: string;
    normalizedSkill: string;
    confidence: number;
    nsqfQualification: { qpCode: string; title: string; nsqfLevel: number } | null;
  }[];
  recommendations: {
    id: string;
    score: number;
    status: string;
    /** Exactly one of these is set — the live pipeline recommends real
     *  PM-AJAY courses (pmajayCourse); trainingProgram is only for the
     *  illustrative rows the admin Training Programs page manages. */
    trainingProgram: { name: string; district: string | null } | null;
    pmajayCourse: { subCourseName: string; courseName: string } | null;
  }[];
}

/** The display name for a recommendation regardless of which of the two
 *  mutually-exclusive links (trainingProgram | pmajayCourse) is set. */
export function recommendationName(r: { trainingProgram: { name: string } | null; pmajayCourse: { subCourseName: string } | null }): string {
  return r.trainingProgram?.name ?? r.pmajayCourse?.subCourseName ?? "(untitled)";
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Thrown when the backend rejects a token as invalid/expired — callers
 *  should clear the stored token and send the user back to login, rather
 *  than showing a generic "could not load" error forever. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Session expired");
    this.name = "UnauthorizedError";
  }
}

function throwIfUnauthorized(res: Response) {
  if (res.status === 401 || res.status === 403) throw new UnauthorizedError();
}

export async function login(phone: string, password: string): Promise<{ token: string; user: unknown }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function getStats(token: string): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/api/admin/stats`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`stats ${res.status}`);
  return res.json();
}

export async function getSessions(
  token: string,
  params: { take?: number; skip?: number; state?: string; language?: string } = {},
): Promise<{ total: number; items: SessionRow[] }> {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
  );
  const res = await fetch(`${API_BASE}/api/admin/sessions?${qs}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`sessions ${res.status}`);
  return res.json();
}

export interface Program {
  id: string;
  name: string;
  nameHindi: string | null;
  scheme: string;
  component: string | null;
  sector: string | null;
  nsqfLevel: number | null;
  mode: string;
  durationWeeks: number | null;
  stipend: boolean;
  state: string | null;
  district: string | null;
  seatsAvailable: number | null;
  contactPhone: string | null;
}

export async function getPrograms(): Promise<Program[]> {
  const res = await fetch(`${API_BASE}/api/programs`, { cache: "no-store" });
  if (!res.ok) throw new Error(`programs ${res.status}`);
  const data = await res.json();
  // the API returns a bare array in some deployments and a paginated
  // { items, total, ... } envelope in others — accept either.
  return Array.isArray(data) ? data : (data?.items ?? []);
}

export interface NsqfQualificationSummary {
  id: string;
  qpCode: string;
  title: string;
  titleHindi: string | null;
}

export interface JobPosting {
  id: string;
  title: string;
  titleHindi: string | null;
  employerName: string;
  skillTokens: string[];
  nsqfQualificationId: string | null;
  nsqfQualification: NsqfQualificationSummary | null;
  sector: string | null;
  nsqfLevel: number | null;
  state: string | null;
  district: string | null;
  wageMin: number | null;
  wageMax: number | null;
  positions: number | null;
  contactPhone: string | null;
  description: string | null;
  source: "SAMPLE" | "EMPLOYER" | "NCS";
  active: boolean;
  /** how many beneficiaries have applied through the app */
  applicationCount?: number;
  postedAt: string;
}

export interface JobPostingInput {
  title: string;
  titleHindi?: string;
  employerName: string;
  skillTokens: string[];
  nsqfQualificationId?: string;
  sector?: string;
  nsqfLevel?: number;
  state?: string;
  district?: string;
  wageMin?: number;
  wageMax?: number;
  positions?: number;
  contactPhone?: string;
  description?: string;
  active?: boolean;
}

export interface JobPostingSuggestion {
  qualifications: { id: string; qpCode: string; title: string; sector: string; nsqfLevel: number }[];
  suggestedTitles: string[];
  sectors: string[];
  schemes: { scheme: string; component: string | null; sector: string | null }[];
  pmajayCourses: { courseName: string; subCourseName: string; sector: string; courseLevel: string }[];
}

/** Search the public NSQF catalogue by title — used to link a job posting to
 *  a specific qualification in the admin form. */
export async function searchNsqf(query: string): Promise<NsqfQualificationSummary[]> {
  const qs = new URLSearchParams({ q: query, pageSize: "15" });
  const res = await fetch(`${API_BASE}/api/nsqf?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`nsqf search ${res.status}`);
  const data = await res.json();
  return (data.items ?? []) as NsqfQualificationSummary[];
}

/** The full normalized-skill vocabulary the voice pipeline understands — a
 *  posting can only be matched to a beneficiary if it uses one of these. */
export async function getSkillTokens(token: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/admin/skill-tokens`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`skill-tokens ${res.status}`);
  return res.json();
}

/** Recommendations for a given skill token: the real NSQF qualifications it
 *  maps to, the job titles those lead to, and the PM-AJAY scheme/sector
 *  context — surfaced while an admin fills in a job posting. */
export async function suggestForSkillToken(token: string, skillToken: string): Promise<JobPostingSuggestion> {
  const qs = new URLSearchParams({ skillToken });
  const res = await fetch(`${API_BASE}/api/admin/job-postings/suggest?${qs}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`suggest ${res.status}`);
  return res.json();
}

export async function getJobPostings(token: string): Promise<JobPosting[]> {
  const res = await fetch(`${API_BASE}/api/admin/job-postings`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`job-postings ${res.status}`);
  return res.json();
}

export interface JobApplicationRow {
  id: string;
  status: "APPLIED" | "CONTACTED" | "SHORTLISTED" | "PLACED" | "REJECTED";
  matchedQpCode: string | null;
  matchedTitle: string | null;
  adminNote: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    age: number | null;
    gender: string | null;
    education: string | null;
    experienceYears: number | null;
    workPreference: string | null;
    preferredLocation: string | null;
    state: string | null;
    district: string | null;
  };
}

/** Who applied to one posting, with enough profile for staff to call them. */
export async function getJobApplications(token: string, jobId: string): Promise<JobApplicationRow[]> {
  const res = await fetch(`${API_BASE}/api/admin/job-postings/${jobId}/applications`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`applications ${res.status}`);
  return res.json();
}

/** Move an application along the funnel, or attach a note after a phone call. */
export async function updateJobApplication(
  token: string,
  applicationId: string,
  input: { status?: JobApplicationRow["status"]; adminNote?: string },
): Promise<JobApplicationRow> {
  const res = await fetch(`${API_BASE}/api/admin/applications/${applicationId}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`update application ${res.status}`);
  return res.json();
}

export async function createJobPosting(token: string, input: JobPostingInput): Promise<JobPosting> {
  const res = await fetch(`${API_BASE}/api/admin/job-postings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`create job posting ${res.status}`);
  return res.json();
}

export async function updateJobPosting(token: string, id: string, input: Partial<JobPostingInput>): Promise<JobPosting> {
  const res = await fetch(`${API_BASE}/api/admin/job-postings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`update job posting ${res.status}`);
  return res.json();
}

export async function deleteJobPosting(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/job-postings/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  throwIfUnauthorized(res);
  if (!res.ok && res.status !== 204) throw new Error(`delete job posting ${res.status}`);
}

export async function mapSkill(text: string) {
  const res = await fetch(`${API_BASE}/api/nsqf/map`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`map ${res.status}`);
  return res.json() as Promise<
    {
      normalizedSkill: string;
      qpCode: string | null;
      title: string | null;
      sector: string | null;
      nsqfLevel: number | null;
      confidence: number;
    }[]
  >;
}

// ---------------------------------------------------------------------------
// Training Programs
// ---------------------------------------------------------------------------

export interface TrainingProgram {
  id: string;
  name: string;
  nameHindi: string | null;
  scheme: string;
  component: string | null;
  providerName: string | null;
  nsqfQualificationId: string | null;
  sector: string | null;
  nsqfLevel: number | null;
  mode: string;
  durationWeeks: number | null;
  stipend: boolean;
  certification: string | null;
  state: string | null;
  district: string | null;
  address: string | null;
  contactPhone: string | null;
  seatsTotal: number | null;
  seatsAvailable: number | null;
  eligibilityNote: string | null;
  active: boolean;
  createdAt: string;
}

export type TrainingProgramInput = Omit<TrainingProgram, "id" | "createdAt" | "active"> & { active?: boolean };

export async function getPrograms_admin(token: string): Promise<TrainingProgram[]> {
  const res = await fetch(`${API_BASE}/api/admin/programs`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`programs ${res.status}`);
  return res.json();
}

export async function createProgram(token: string, input: Partial<TrainingProgramInput>): Promise<TrainingProgram> {
  const res = await fetch(`${API_BASE}/api/admin/programs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`create program ${res.status}`);
  return res.json();
}

export async function updateProgram(token: string, id: string, input: Partial<TrainingProgramInput>): Promise<TrainingProgram> {
  const res = await fetch(`${API_BASE}/api/admin/programs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`update program ${res.status}`);
  return res.json();
}

export async function deleteProgram(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/programs/${id}`, { method: "DELETE", headers: authHeaders(token) });
  throwIfUnauthorized(res);
  if (!res.ok && res.status !== 204) throw new Error(`delete program ${res.status}`);
}

// ---------------------------------------------------------------------------
// Knowledge base
// ---------------------------------------------------------------------------

export interface KnowledgeChunk {
  id: string;
  documentTitle: string;
  sourceUrl: string;
  page: number;
  chunkIndex: number;
  text: string;
}

export async function getKnowledge(token: string): Promise<KnowledgeChunk[]> {
  const res = await fetch(`${API_BASE}/api/admin/knowledge`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`knowledge ${res.status}`);
  return res.json();
}

export async function createKnowledge(token: string, input: Omit<KnowledgeChunk, "id">): Promise<KnowledgeChunk> {
  const res = await fetch(`${API_BASE}/api/admin/knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`create knowledge ${res.status}`);
  return res.json();
}

export async function updateKnowledge(token: string, id: string, input: Partial<Omit<KnowledgeChunk, "id">>): Promise<KnowledgeChunk> {
  const res = await fetch(`${API_BASE}/api/admin/knowledge/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`update knowledge ${res.status}`);
  return res.json();
}

export async function deleteKnowledge(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/knowledge/${id}`, { method: "DELETE", headers: authHeaders(token) });
  throwIfUnauthorized(res);
  if (!res.ok && res.status !== 204) throw new Error(`delete knowledge ${res.status}`);
}

// ---------------------------------------------------------------------------
// Recommendation status, user moderation
// ---------------------------------------------------------------------------

export async function updateRecommendationStatus(token: string, id: string, status: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/recommendations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ status }),
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`update recommendation ${res.status}`);
}

export async function moderateUser(
  token: string,
  id: string,
  input: { suspended?: boolean; adminNote?: string },
): Promise<{ id: string; suspended: boolean; adminNote: string | null }> {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}/moderation`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`moderate user ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Consent dashboard, admin accounts, audit log, OTP activity
// ---------------------------------------------------------------------------

export interface ConsentSummary {
  totalBeneficiaries: number;
  locationConsented: number;
  deletionRequests: { id: string; name: string | null; phone: string | null; deletionRequestedAt: string }[];
}

export async function getConsentSummary(token: string): Promise<ConsentSummary> {
  const res = await fetch(`${API_BASE}/api/admin/consent`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`consent ${res.status}`);
  return res.json();
}

export interface AdminAccount {
  id: string;
  name: string | null;
  phone: string | null;
  role: "ADMIN" | "VIEWER";
  createdAt: string;
}

export async function getAdmins(token: string): Promise<AdminAccount[]> {
  const res = await fetch(`${API_BASE}/api/admin/admins`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`admins ${res.status}`);
  return res.json();
}

export async function createAdmin(
  token: string,
  input: { phone: string; name: string; password: string; role?: "ADMIN" | "VIEWER" },
): Promise<AdminAccount> {
  const res = await fetch(`${API_BASE}/api/admin/admins`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  throwIfUnauthorized(res);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `create admin ${res.status}`);
  }
  return res.json();
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: unknown;
  createdAt: string;
  admin: { id: string; name: string | null; phone: string | null };
}

export async function getAuditLog(token: string): Promise<AuditLogEntry[]> {
  const res = await fetch(`${API_BASE}/api/admin/audit-log`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`audit-log ${res.status}`);
  return res.json();
}

export interface OtpActivityRow {
  phone: string;
  attempts: number;
  expiresAt: string;
  createdAt: string;
}

export async function getOtpActivity(token: string): Promise<OtpActivityRow[]> {
  const res = await fetch(`${API_BASE}/api/admin/otp-activity`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`otp-activity ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Analytics: leaderboard, geo, coverage gaps
// ---------------------------------------------------------------------------

export interface Leaderboard {
  districts: { district: string; suggested: number; enrolled: number; conversionRate: number }[];
  languageCounts: { language: string; _count: number }[];
}

export async function getLeaderboard(token: string): Promise<Leaderboard> {
  const res = await fetch(`${API_BASE}/api/admin/leaderboard`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`leaderboard ${res.status}`);
  return res.json();
}

export async function getGeo(token: string): Promise<{ state: string; _count: number }[]> {
  const res = await fetch(`${API_BASE}/api/admin/geo`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`geo ${res.status}`);
  return res.json();
}

export interface CoverageGaps {
  postingsWithoutQualification: { id: string; title: string; sector: string | null; employerName: string }[];
  sectorsWithNoPostings: { sector: string; qualificationCount: number }[];
}

export async function getCoverageGaps(token: string): Promise<CoverageGaps> {
  const res = await fetch(`${API_BASE}/api/admin/coverage-gaps`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`coverage-gaps ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Needs-review, per-session detail, config status
// ---------------------------------------------------------------------------

export interface NeedsReviewRow {
  id: string;
  rawSkillText: string;
  normalizedSkill: string;
  confidence: number;
  createdAt: string;
  session: { id: string; createdAt: string; language: string; rawTranscript: string | null };
}

export async function getNeedsReview(token: string): Promise<NeedsReviewRow[]> {
  const res = await fetch(`${API_BASE}/api/admin/needs-review`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`needs-review ${res.status}`);
  return res.json();
}

export interface SessionDetail extends SessionRow {
  user: (SessionRow["user"] & { state: string | null }) | null;
}

export async function getSessionDetail(token: string, id: string): Promise<SessionDetail> {
  const res = await fetch(`${API_BASE}/api/admin/sessions/${id}`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`session detail ${res.status}`);
  return res.json();
}

export interface ConfigStatus {
  llm: boolean;
  sarvamSpeech: boolean;
  groq: boolean;
  bhashini: boolean;
  sms: boolean;
  twilioWhatsapp: boolean;
  stitch: boolean;
  otpMode: string;
}

export async function getConfigStatus(token: string): Promise<ConfigStatus> {
  const res = await fetch(`${API_BASE}/api/admin/config-status`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`config-status ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// NSQF / PM-AJAY catalogue browsing
// ---------------------------------------------------------------------------

export interface NsqfQualificationFull {
  id: string;
  qpCode: string;
  title: string;
  titleHindi: string | null;
  sector: string;
  nsqfLevel: number;
  keywords: string[];
  expired: boolean;
  description: string | null;
  proposedOccupations: string[];
}

export async function searchNsqfFull(
  query: string,
  page = 1,
  sector?: string,
): Promise<{ items: NsqfQualificationFull[]; total: number; totalPages: number }> {
  const qs = new URLSearchParams({ q: query, page: String(page), pageSize: "20" });
  if (sector) qs.set("sector", sector);
  const res = await fetch(`${API_BASE}/api/nsqf?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`nsqf ${res.status}`);
  return res.json();
}

export async function getNsqfSectors(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/nsqf/filters`, { cache: "no-store" });
  if (!res.ok) throw new Error(`nsqf filters ${res.status}`);
  const data = await res.json();
  return [...new Set(data.sectors as string[])].sort();
}

export async function updateNsqf(
  token: string,
  id: string,
  input: { keywords?: string[]; expired?: boolean; description?: string },
): Promise<NsqfQualificationFull> {
  const res = await fetch(`${API_BASE}/api/admin/nsqf/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`update nsqf ${res.status}`);
  return res.json();
}

export interface PmajayCourseRow {
  id: string;
  courseLevel: string;
  sector: string;
  subSector: string;
  courseName: string;
  subCourseCode: string;
  subCourseName: string;
}

export async function searchPmajayCourses(
  query: string,
  page = 1,
  sector?: string,
): Promise<{ items: PmajayCourseRow[]; total: number; totalPages: number }> {
  const qs = new URLSearchParams({ q: query, page: String(page), pageSize: "20" });
  if (sector) qs.set("sector", sector);
  const res = await fetch(`${API_BASE}/api/pmajay-courses?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`pmajay-courses ${res.status}`);
  return res.json();
}

export async function getPmajaySectors(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/pmajay-courses/filters`, { cache: "no-store" });
  if (!res.ok) throw new Error(`pmajay filters ${res.status}`);
  const data = await res.json();
  return [...new Set(data.sectors as string[])].sort();
}
