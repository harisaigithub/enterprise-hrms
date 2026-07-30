

export const goalStatusMeta = {
  Draft: { label: "Draft", color: "#64748b", bg: "#f1f5f9" },
  "Pending Approval": { label: "Pending Approval", color: "#d97706", bg: "#fffbeb" },
  Locked: { label: "Locked", color: "#0284c7", bg: "#f0f9ff" },
  "Revision Requested": { label: "Revision Requested", color: "#dc2626", bg: "#fef2f2" },
};

export const reviewPhaseMeta = {
  "Goal Setting": { color: "#0284c7", bg: "#f0f9ff" },
  "Continuous Feedback": { color: "#7c3aed", bg: "#f5f3ff" },
  "Self-Assessment": { color: "#d97706", bg: "#fffbeb" },
  "Manager Review": { color: "#d97706", bg: "#fffbeb" },
  Calibration: { color: "#dc2626", bg: "#fef2f2" },
  Completed: { color: "#16a34a", bg: "#f0fdf4" },
};

export const feedbackTypeMeta = {
  Praise: { color: "#16a34a", bg: "#f0fdf4" },
  Constructive: { color: "#d97706", bg: "#fffbeb" },
  General: { color: "#0284c7", bg: "#f0f9ff" },
};

export const colleagues = [
  { id: "EMP002", name: "vijay mudgal", role: "Product Manager" },
  { id: "EMP003", name: "Vikas Agarwal", role: "UX Designer" },
  { id: "EMP004", name: "Gary Chen", role: "DevOps Engineer" },
  { id: "EMP005", name: "Alice Quinn", role: "Engineering Manager" },
  { id: "EMP006", name: "James Sullivan", role: "Data Analyst" },
];

let goals = [
  {
    id: "g1",
    employeeId: "EMP001",
    cycle: "Q3 2026",
    title: "Improve API response times across core services",
    category: "Technical",
    keyResults: [
      { id: "kr1", text: "Reduce p95 latency on /employees endpoint to <200ms", progress: 70 },
      { id: "kr2", text: "Add caching layer for payroll queries", progress: 40 },
    ],
    status: "Locked",
    createdAt: "2026-07-02",
  },
  {
    id: "g2",
    employeeId: "EMP001",
    cycle: "Q3 2026",
    title: "Mentor two junior engineers",
    category: "Leadership",
    keyResults: [
      { id: "kr3", text: "Weekly 1:1s with 2 mentees", progress: 85 },
      { id: "kr4", text: "Pair on at least 4 features together", progress: 50 },
    ],
    status: "Locked",
    createdAt: "2026-07-02",
  },
  {
    id: "g3",
    employeeId: "EMP001",
    cycle: "Q3 2026",
    title: "Own the migration to the new deployment pipeline",
    category: "Technical",
    keyResults: [
      { id: "kr5", text: "Draft migration plan and get manager sign-off", progress: 100 },
      { id: "kr6", text: "Migrate 3 services to the new pipeline", progress: 20 },
    ],
    status: "Pending Approval",
    createdAt: "2026-07-20",
  },
];

let reviewCycle = {
  id: "rc-q3-2026",
  name: "Q3 2026 Performance Review",
  // Goal Setting -> Continuous Feedback -> Self-Assessment -> Manager Review -> Calibration -> Completed
  phase: "Manager Review",
  goalSettingWindow: { start: "2026-07-01", end: "2026-07-10" },
  selfAssessmentWindow: { start: "2026-09-15", end: "2026-09-22" },
  managerReviewWindow: { start: "2026-09-23", end: "2026-09-30" },
  is360Enabled: true,
  peerReviewersNominated: 3,
  peerResponsesReceived: 2,
};

let selfAssessment = {
  submitted: true,
  submittedAt: "2026-09-20",
  responses: [
    { goalId: "g1", rating: 4, comments: "Made strong progress on latency work; caching layer is in progress and on track." },
    { goalId: "g2", rating: 5, comments: "Both mentees shipped their first independent features this quarter." },
  ],
};

// Manager review can only exist once self-assessment is submitted (see validation rules).
let managerReview = {
  submitted: false,
  submittedAt: null,
  responses: [],
};

let feedbackEntries = [
  {
    id: "f1",
    fromId: "EMP005",
    fromName: "Alice Quinn",
    toId: "EMP001",
    toName: "Matsya Singh",
    type: "Praise",
    goalTag: "Improve API response times across core services",
    message: "Great debugging work isolating the payroll query bottleneck — saved the team real time this sprint.",
    private: false,
    createdAt: "2026-07-18",
  },
  {
    id: "f2",
    fromId: "EMP004",
    fromName: "Gary Chen",
    toId: "EMP001",
    toName: "Matsya Singh",
    type: "Constructive",
    goalTag: null,
    message: "Would help to get PR descriptions a bit more detailed for the deployment pipeline changes.",
    private: false,
    createdAt: "2026-07-22",
  },
  {
    id: "f3",
    fromId: "EMP001",
    fromName: "Matsya Singh",
    toId: "EMP005",
    toName: "Alice Quinn",
    type: "General",
    goalTag: null,
    message: "Thanks for the quick unblock on staging environment access yesterday.",
    private: false,
    createdAt: "2026-07-25",
  },
];

let oneOnOnes = [
  {
    id: "o1",
    withName: "Alice Quinn",
    withRole: "Engineering Manager",
    date: "2026-07-15",
    agenda: ["Migration plan review", "Career growth check-in"],
    actionItems: [
      { id: "a1", text: "Share migration doc with platform team", done: true },
      { id: "a2", text: "Look into staff-engineer track requirements", done: false },
    ],
    notes: "Discussed the deployment migration timeline and agreed to prioritize service A and B first.",
  },
  {
    id: "o2",
    withName: "Alice Quinn",
    withRole: "Engineering Manager",
    date: "2026-07-01",
    agenda: ["Q3 goal setting", "Mentee pairing"],
    actionItems: [{ id: "a3", text: "Finalize Q3 OKRs", done: true }],
    notes: "Set final Q3 goals; agreed on mentoring two junior engineers this quarter.",
  },
];

// finalRating is the calibration-adjusted value; originalManagerRating is retained separately
// and never overwritten, per the calibration audit requirement.
let ratingsHistory = [
  {
    cycle: "Q1 2026",
    selfRating: 4,
    originalManagerRating: 4,
    finalRating: 4,
    calibrationAdjusted: false,
    increment: "8%",
    promotion: false,
    appraisalLetterUrl: "#",
    releasedOn: "2026-04-15",
  },
  {
    cycle: "Q4 2025",
    selfRating: 5,
    originalManagerRating: 3,
    finalRating: 4,
    calibrationAdjusted: true,
    increment: "6%",
    promotion: false,
    appraisalLetterUrl: "#",
    releasedOn: "2026-01-15",
  },
];

export function _getGoals(employeeId) {
  return goals.filter((g) => g.employeeId === employeeId);
}
export function _addGoal(goal) {
  goals = [goal, ...goals];
  return goal;
}
export function _getReviewCycle() {
  return reviewCycle;
}
export function _getSelfAssessment() {
  return selfAssessment;
}
export function _submitSelfAssessment(responses) {
  selfAssessment = { submitted: true, submittedAt: new Date().toISOString().slice(0, 10), responses };
  return selfAssessment;
}
export function _getManagerReview() {
  return managerReview;
}
export function _getFeedback(employeeId) {
  return feedbackEntries.filter((f) => f.toId === employeeId || f.fromId === employeeId);
}
export function _addFeedback(entry) {
  feedbackEntries = [entry, ...feedbackEntries];
  return entry;
}
export function _getOneOnOnes() {
  return oneOnOnes;
}
export function _addOneOnOne(note) {
  oneOnOnes = [note, ...oneOnOnes];
  return note;
}
export function _getRatingsHistory() {
  return ratingsHistory;
}