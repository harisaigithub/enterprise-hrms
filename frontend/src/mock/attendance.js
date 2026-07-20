/**
 * Mock Attendance Data
 * Shape matches what the backend Attendance API will return.
 */

// Status values: Present | Late | WFH | Absent | Holiday | Weekend
export const attendanceRecords = [
  { id: 1, employeeId: "EMP001", date: "2026-07-01", checkIn: "09:02", checkOut: "18:05", status: "Present",  hoursWorked: 9.05 },
  { id: 2, employeeId: "EMP001", date: "2026-07-02", checkIn: "09:45", checkOut: "18:10", status: "Late",     hoursWorked: 8.42 },
  { id: 3, employeeId: "EMP001", date: "2026-07-03", checkIn: null,    checkOut: null,    status: "WFH",      hoursWorked: 8.0  },
  { id: 4, employeeId: "EMP001", date: "2026-07-04", checkIn: null,    checkOut: null,    status: "Holiday",  hoursWorked: 0    },
  { id: 5, employeeId: "EMP001", date: "2026-07-05", checkIn: "08:55", checkOut: "17:50", status: "Present",  hoursWorked: 8.92 },
  { id: 6, employeeId: "EMP001", date: "2026-07-06", checkIn: null,    checkOut: null,    status: "Weekend",  hoursWorked: 0    },
  { id: 7, employeeId: "EMP001", date: "2026-07-07", checkIn: null,    checkOut: null,    status: "Weekend",  hoursWorked: 0    },
  { id: 8, employeeId: "EMP001", date: "2026-07-08", checkIn: "09:10", checkOut: "18:00", status: "Present",  hoursWorked: 8.83 },
  { id: 9, employeeId: "EMP001", date: "2026-07-09", checkIn: null,    checkOut: null,    status: "Absent",   hoursWorked: 0    },
  { id: 10, employeeId: "EMP001", date: "2026-07-10", checkIn: "09:00", checkOut: "17:55", status: "Present", hoursWorked: 8.92 },
  { id: 11, employeeId: "EMP001", date: "2026-07-11", checkIn: "09:05", checkOut: "18:10", status: "Present", hoursWorked: 9.08 },
  { id: 12, employeeId: "EMP001", date: "2026-07-14", checkIn: "10:15", checkOut: "18:30", status: "Late",    hoursWorked: 8.25 },
  { id: 13, employeeId: "EMP001", date: "2026-07-15", checkIn: null,    checkOut: null,    status: "WFH",     hoursWorked: 8.0  },
  { id: 14, employeeId: "EMP001", date: "2026-07-16", checkIn: "09:00", checkOut: "18:00", status: "Present", hoursWorked: 9.0  },
  { id: 15, employeeId: "EMP001", date: "2026-07-17", checkIn: "09:02", checkOut: "17:45", status: "Present", hoursWorked: 8.72 },
  { id: 16, employeeId: "EMP001", date: "2026-07-18", checkIn: "08:50", checkOut: "18:05", status: "Present", hoursWorked: 9.25 },
  { id: 17, employeeId: "EMP001", date: "2026-07-21", checkIn: "09:30", checkOut: "18:00", status: "Late",    hoursWorked: 8.5  },
];

// Team-level attendance summary for dashboard / HR view
export const teamAttendanceSummary = {
  date: "2026-07-21",
  present: 42,
  late: 5,
  absent: 3,
  onLeave: 4,
  wfh: 8,
  total: 62,
};

export const attendanceStatusMeta = {
  Present:  { label: "Present",  color: "#16a34a", bg: "#f0fdf4" },
  Late:     { label: "Late",     color: "#d97706", bg: "#fffbeb" },
  Absent:   { label: "Absent",   color: "#dc2626", bg: "#fef2f2" },
  WFH:      { label: "WFH",      color: "#0284c7", bg: "#f0f9ff" },
  Holiday:  { label: "Holiday",  color: "#7c3aed", bg: "#f5f3ff" },
  Weekend:  { label: "Weekend",  color: "#94a3b8", bg: "#f8fafc" },
  "On Leave": { label: "On Leave", color: "#ea580c", bg: "#fff7ed" },
};
