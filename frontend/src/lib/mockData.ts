// Mock data for QueueWise MVP
export type Hospital = {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  departments: string[];
};

export type Doctor = {
  id: string;
  name: string;
  department: string;
  hospitalId: string;
  status: "on-duty" | "on-leave" | "unknown";
  schedule: string[]; // weekdays
  updatedAt: string;
};

export const HOSPITALS: Hospital[] = [
  {
    id: "gh-tvm",
    name: "Govt. General Hospital",
    city: "Thiruvananthapuram",
    address: "Vanchiyoor, Thiruvananthapuram, Kerala 695035",
    phone: "+91 471 2443870",
    departments: ["General OPD", "Cardiology", "Orthopaedics", "Paediatrics", "Gynaecology", "ENT", "Dermatology"],
  },
  {
    id: "mch-kottayam",
    name: "Govt. Medical College",
    city: "Kottayam",
    address: "Gandhi Nagar, Kottayam, Kerala 686008",
    phone: "+91 481 2597311",
    departments: ["General OPD", "Cardiology", "Orthopaedics", "Neurology", "Paediatrics", "ENT"],
  },
  {
    id: "mch-kozhikode",
    name: "Govt. Medical College",
    city: "Kozhikode",
    address: "Chevayur, Kozhikode, Kerala 673008",
    phone: "+91 495 2350216",
    departments: ["General OPD", "Cardiology", "Orthopaedics", "Paediatrics", "Gynaecology", "Dermatology"],
  },
  {
    id: "gh-eky",
    name: "Govt. General Hospital",
    city: "Ernakulam",
    address: "Hospital Rd, Ernakulam, Kerala 682011",
    phone: "+91 484 2360802",
    departments: ["General OPD", "Cardiology", "Orthopaedics", "Paediatrics", "ENT"],
  },
  {
    id: "mch-tcr",
    name: "Govt. Medical College",
    city: "Thrissur",
    address: "Mulamkunnathukavu, Thrissur, Kerala 680596",
    phone: "+91 487 2200310",
    departments: ["General OPD", "Cardiology", "Orthopaedics", "Paediatrics", "Gynaecology"],
  },
];

export const DOCTORS: Doctor[] = [
  { id: "d1", name: "Dr. Asha Menon", department: "General OPD", hospitalId: "gh-tvm", status: "on-duty", schedule: ["Mon", "Tue", "Wed", "Fri"], updatedAt: "8 min ago" },
  { id: "d2", name: "Dr. Rajeev Nair", department: "Cardiology", hospitalId: "gh-tvm", status: "on-duty", schedule: ["Mon", "Wed", "Fri"], updatedAt: "22 min ago" },
  { id: "d3", name: "Dr. Priya Pillai", department: "Paediatrics", hospitalId: "gh-tvm", status: "on-leave", schedule: ["Tue", "Thu"], updatedAt: "1 hr ago" },
  { id: "d4", name: "Dr. Suresh Kumar", department: "Orthopaedics", hospitalId: "gh-tvm", status: "unknown", schedule: ["Mon", "Thu"], updatedAt: "3 hr ago" },
  { id: "d5", name: "Dr. Lakshmi Iyer", department: "ENT", hospitalId: "gh-tvm", status: "on-duty", schedule: ["Tue", "Wed", "Fri"], updatedAt: "12 min ago" },
];

// 7 days x 12 hours (8am-8pm) intensity 0-5
export const HEATMAP: number[][] = [
  [1, 3, 5, 5, 4, 3, 2, 1, 1, 2, 2, 1], // Mon
  [1, 2, 4, 5, 4, 3, 2, 1, 1, 1, 2, 1], // Tue
  [2, 4, 5, 5, 5, 3, 2, 2, 1, 1, 1, 1], // Wed
  [1, 2, 3, 4, 4, 3, 2, 1, 1, 2, 2, 1], // Thu
  [2, 4, 5, 5, 5, 4, 3, 2, 2, 2, 1, 1], // Fri
  [3, 5, 5, 4, 3, 2, 1, 1, 1, 1, 1, 0], // Sat
  [0, 1, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0], // Sun
];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const HOURS = ["8a", "9a", "10a", "11a", "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p"];

export const LIVE_REPORTS = [
  { id: "r1", text: "3 users reported medium wait", ago: "12 min ago", level: "medium" as const },
  { id: "r2", text: "Queue moving faster than usual", ago: "28 min ago", level: "short" as const },
  { id: "r3", text: "1 user reported long wait (~2 hr)", ago: "45 min ago", level: "long" as const },
  { id: "r4", text: "5 users checked in this morning", ago: "1 hr ago", level: "medium" as const },
];

export const STATS = {
  patientsToday: 4218,
  predictionsThisWeek: 26540,
};
