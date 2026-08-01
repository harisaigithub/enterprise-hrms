/**
 * Mock data — Recruitment / ATS (Module 5)
 */

export const requisitionStatusMeta = {
  Draft: { color: "#64748b", bg: "#f1f5f9" },
  "Pending Approval": { color: "#d97706", bg: "#fffbeb" },
  Approved: { color: "#0284c7", bg: "#f0f9ff" },
  Open: { color: "#16a34a", bg: "#f0fdf4" },
  Closed: { color: "#64748b", bg: "#f1f5f9" },
  Rejected: { color: "#dc2626", bg: "#fef2f2" },
};

export const PIPELINE_STAGES = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"];

 
export const stageMeta = {
  Applied: { color: "#0284c7", bg: "#f0f9ff" },
  Screening: { color: "#7c3aed", bg: "#f5f3ff" },
  Interview: { color: "#d97706", bg: "#fffbeb" },
  Offer: { color: "#0891b2", bg: "#ecfeff" },
  Hired: { color: "#16a34a", bg: "#f0fdf4" },
  Rejected: { color: "#dc2626", bg: "#fef2f2" },
};

export const interviewStatusMeta = {
  Scheduled: { color: "#0284c7", bg: "#f0f9ff" },
  "Feedback Pending": { color: "#d97706", bg: "#fffbeb" },
  Completed: { color: "#16a34a", bg: "#f0fdf4" },
};

export const offerStatusMeta = {
  Draft: { color: "#64748b", bg: "#f1f5f9" },
  "Salary Approval Pending": { color: "#d97706", bg: "#fffbeb" },
  Approved: { color: "#0284c7", bg: "#f0f9ff" },
  "Background Verification": { color: "#7c3aed", bg: "#f5f3ff" },
  "Sent — Awaiting Signature": { color: "#d97706", bg: "#fffbeb" },
  Accepted: { color: "#16a34a", bg: "#f0fdf4" },
  Declined: { color: "#dc2626", bg: "#fef2f2" },
  Expired: { color: "#64748b", bg: "#f1f5f9" },
};
export const colleagues = [
  { id: "EMP002", name: "Alice Quinn" },
  { id: "EMP003", name: "Viki Vance" },
  { id: "EMP004", name: "Gary Chen" },
  { id: "EMP005", name: "Priya Nair" },
  { id: "EMP006", name: "James Sullivan" },
];

let requisitions = [
  {
    id: "req1",
    title: "Senior Backend Engineer",
    department: "Engineering",
    grade: "L4",
    openings: 2,
    salaryMin: 1800000,
    salaryMax: 2400000,
    justification: "Scaling the payments platform team.",
    status: "Open",
    raisedBy: "Alice Quinn",
    createdAt: "2026-06-10",
  },
  {
    id: "req2",
    title: "Product Designer",
    department: "Design",
    grade: "L3",
    openings: 1,
    salaryMin: 1200000,
    salaryMax: 1600000,
    justification: "Backfill for departing designer.",
    status: "Open",
    raisedBy: "Viki Vance",
    createdAt: "2026-06-20",
  },
  {
    id: "req3",
    title: "HR Business Partner",
    department: "Human Resources",
    grade: "L4",
    openings: 1,
    salaryMin: 1500000,
    salaryMax: 1900000,
    justification: "New regional HRBP for the Delhi office.",
    status: "Pending Approval",
    raisedBy: "lewis hamilton",
    createdAt: "2026-07-25",
  },
];

let candidates = [
  {
    id: "c1",
    requisitionId: "req1",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    resumeSummary: "6 yrs backend, Node/Go, ex-fintech.",
    stage: "Interview",
    rating: 4,
    notes: "Strong system design round.",
    appliedOn: "2026-07-05",
  },
  {
    id: "c2",
    requisitionId: "req1",
    name: "Rahul Verma",
    email: "rahul.verma@example.com",
    resumeSummary: "4 yrs backend, Java, distributed systems.",
    stage: "Screening",
    rating: 3,
    notes: "",
    appliedOn: "2026-07-12",
  },
  {
    id: "c3",
    requisitionId: "req1",
    name: "Sneha Iyer",
    email: "sneha.iyer@example.com",
    resumeSummary: "8 yrs backend, ex-tech lead.",
    stage: "Offer",
    rating: 5,
    notes: "Top candidate — panel unanimous.",
    appliedOn: "2026-06-28",
  },
  {
    id: "c4",
    requisitionId: "req2",
    name: "Arjun Mehta",
    email: "arjun.mehta@example.com",
    resumeSummary: "5 yrs product design, B2B SaaS.",
    stage: "Applied",
    rating: 0,
    notes: "",
    appliedOn: "2026-07-24",
  },
  {
    id: "c5",
    requisitionId: "req1",
    name: "Karan Bose",
    email: "karan.bose@example.com",
    resumeSummary: "3 yrs backend.",
    stage: "Rejected",
    rating: 2,
    notes: "Not enough distributed-systems depth for the level.",
    appliedOn: "2026-07-01",
  },
];

let interviews = [
  {
    id: "i1",
    candidateId: "c1",
    round: "System Design",
    interviewers: ["Alice Quinn", "Gary Chen"],
    scheduledAt: "2026-07-28T15:00",
    status: "Feedback Pending",
    scorecards: [
      { interviewer: "Alice Quinn", submitted: true, rating: 4, notes: "Solid tradeoff discussion on caching." },
    ],
  },
  {
    id: "i2",
    candidateId: "c3",
    round: "Hiring Manager",
    interviewers: ["Alice Quinn"],
    scheduledAt: "2026-07-10T11:00",
    status: "Completed",
    scorecards: [
      { interviewer: "Alice Quinn", submitted: true, rating: 5, notes: "Ready to lead the payments squad from day one." },
    ],
  },
];

let offers = [
  {
    id: "o1",
    candidateId: "c3",
    requisitionId: "req1",
    proposedSalary: 2600000,
    status: "Salary Approval Pending",
    consentOnFile: false,
    financeOverride: false,
    overrideReason: "",
    sentAt: null,
  },
];

export function _getRequisitions() { return requisitions; }
export function _addRequisition(r) { requisitions = [r, ...requisitions]; return r; }

export function _getCandidates() { return candidates; }
export function _addCandidate(c) { candidates = [c, ...candidates]; return c; }
export function _moveCandidateStage(id, stage) {
  candidates = candidates.map((c) => (c.id === id ? { ...c, stage } : c));
  return candidates.find((c) => c.id === id);
}
export function _rateCandidate(id, rating, notes) {
  candidates = candidates.map((c) => (c.id === id ? { ...c, rating, notes } : c));
  return candidates.find((c) => c.id === id);
}

export function _getInterviews() { return interviews; }
export function _scheduleInterview(interview) { interviews = [interview, ...interviews]; return interview; }
export function _submitScorecard(interviewId, scorecard) {
  interviews = interviews.map((i) => {
    if (i.id !== interviewId) return i;
    const scorecards = [...i.scorecards, scorecard];
    const allSubmitted = scorecards.length >= i.interviewers.length;
    return { ...i, scorecards, status: allSubmitted ? "Completed" : "Feedback Pending" };
  });
  return interviews.find((i) => i.id === interviewId);
}

export function _getOffers() { return offers; }
export function _createOffer(offer) { offers = [offer, ...offers]; return offer; }
export function _updateOfferStatus(id, status, patch = {}) {
  offers = offers.map((o) => (o.id === id ? { ...o, status, ...patch } : o));
  return offers.find((o) => o.id === id);
}