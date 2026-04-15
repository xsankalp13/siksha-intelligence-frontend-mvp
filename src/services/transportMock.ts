// ──────────────────────────────────────────────────────────────────────────────
//  Transport Management — Mock Data & Types
//  All data is local. No backend calls.
// ──────────────────────────────────────────────────────────────────────────────

export type VehicleType = "Bus" | "Mini-Bus" | "Van";
export type VehicleStatus = "Active" | "Maintenance" | "Inactive";
export type FuelType = "Diesel" | "CNG" | "Electric";
export type DriverStatus = "Available" | "On-Duty" | "On-Leave";

export interface Stop {
  id: number;
  name: string;
  time: string; // e.g. "07:15 AM"
  studentsCount: number;
  distanceFromSchool: number; // km
}

export interface Route {
  id: number;
  name: string;
  distanceKm: number;
  durationMin: number;
  vehicleId: number | null;
  stops: Stop[];
  monthlyFee: number;
  studentsCount: number;
}

export interface Vehicle {
  id: number;
  vehicleNumber: string;
  type: VehicleType;
  capacity: number;
  seatsUsed: number;
  driverId: number | null;
  fuelType: FuelType;
  kmDriven: number;
  status: VehicleStatus;
  lastServiceDate: string;
  nextServiceKm: number;
  routeId: number | null;
  registrationExpiry: string;
}

export interface Driver {
  id: number;
  name: string;
  licenseNumber: string;
  phone: string;
  yearsExperience: number;
  assignedVehicleId: number | null;
  status: DriverStatus;
  address: string;
  joiningDate: string;
  photoInitials: string;
}

export interface StudentAssignment {
  id: number;
  studentId: number;
  studentName: string;
  className: string;
  section: string;
  routeId: number;
  stopId: number;
  monthlyFee: number;
  assignedDate: string;
}

// ── Seed Data ──────────────────────────────────────────────────────────────────

export const MOCK_DRIVERS: Driver[] = [
  {
    id: 1, name: "Rajesh Kumar", licenseNumber: "DL-0420110012345",
    phone: "9876543210", yearsExperience: 12, assignedVehicleId: 1,
    status: "On-Duty", address: "123, MG Road, Delhi", joiningDate: "2018-06-01",
    photoInitials: "RK",
  },
  {
    id: 2, name: "Suresh Pandey", licenseNumber: "UP-6520050067890",
    phone: "9812345678", yearsExperience: 8, assignedVehicleId: 2,
    status: "On-Duty", address: "45, Sector 7, Noida", joiningDate: "2021-01-15",
    photoInitials: "SP",
  },
  {
    id: 3, name: "Mohammed Arif", licenseNumber: "HR-2620190045678",
    phone: "9765432109", yearsExperience: 5, assignedVehicleId: 3,
    status: "Available", address: "78, Civil Lines, Gurugram", joiningDate: "2022-08-01",
    photoInitials: "MA",
  },
  {
    id: 4, name: "Balvinder Singh", licenseNumber: "PB-1020130078901",
    phone: "9898765432", yearsExperience: 15, assignedVehicleId: 4,
    status: "On-Leave", address: "22, Anand Vihar, Delhi", joiningDate: "2016-03-10",
    photoInitials: "BS",
  },
  {
    id: 5, name: "Ravi Sharma", licenseNumber: "DL-1220220098765",
    phone: "9845671230", yearsExperience: 3, assignedVehicleId: null,
    status: "Available", address: "11, Rohini Sector 5, Delhi", joiningDate: "2024-01-10",
    photoInitials: "RS",
  },
];

export const MOCK_ROUTES: Route[] = [
  {
    id: 1, name: "North Zone – Route A", distanceKm: 18, durationMin: 45,
    vehicleId: 1, monthlyFee: 1800, studentsCount: 38,
    stops: [
      { id: 101, name: "Green Park Metro", time: "06:50 AM", studentsCount: 8, distanceFromSchool: 18 },
      { id: 102, name: "Malviya Nagar Chowk", time: "07:05 AM", studentsCount: 12, distanceFromSchool: 14 },
      { id: 103, name: "Saket Main Road", time: "07:20 AM", studentsCount: 10, distanceFromSchool: 10 },
      { id: 104, name: "Lajpat Nagar", time: "07:32 AM", studentsCount: 8, distanceFromSchool: 5 },
    ],
  },
  {
    id: 2, name: "South Zone – Route B", distanceKm: 22, durationMin: 55,
    vehicleId: 2, monthlyFee: 2000, studentsCount: 42,
    stops: [
      { id: 201, name: "Sector 18 Bus Stand", time: "07:00 AM", studentsCount: 10, distanceFromSchool: 22 },
      { id: 202, name: "Botanical Garden Gate", time: "07:15 AM", studentsCount: 14, distanceFromSchool: 16 },
      { id: 203, name: "DLF Phase 2 Main", time: "07:28 AM", studentsCount: 10, distanceFromSchool: 9 },
      { id: 204, name: "Cyber Hub", time: "07:40 AM", studentsCount: 8, distanceFromSchool: 4 },
    ],
  },
  {
    id: 3, name: "East Zone – Route C", distanceKm: 14, durationMin: 35,
    vehicleId: 3, monthlyFee: 1500, studentsCount: 24,
    stops: [
      { id: 301, name: "Preet Vihar", time: "07:10 AM", studentsCount: 8, distanceFromSchool: 14 },
      { id: 302, name: "Pandav Nagar Chowk", time: "07:20 AM", studentsCount: 9, distanceFromSchool: 9 },
      { id: 303, name: "Mayur Vihar Phase 1", time: "07:30 AM", studentsCount: 7, distanceFromSchool: 5 },
    ],
  },
  {
    id: 4, name: "West Zone – Route D", distanceKm: 28, durationMin: 65,
    vehicleId: 4, monthlyFee: 2200, studentsCount: 30,
    stops: [
      { id: 401, name: "Dwarka Sector 10", time: "06:45 AM", studentsCount: 8, distanceFromSchool: 28 },
      { id: 402, name: "Uttam Nagar Main", time: "07:05 AM", studentsCount: 10, distanceFromSchool: 20 },
      { id: 403, name: "Rajouri Garden", time: "07:22 AM", studentsCount: 7, distanceFromSchool: 12 },
      { id: 404, name: "Punjabi Bagh Chowk", time: "07:35 AM", studentsCount: 5, distanceFromSchool: 6 },
    ],
  },
];

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 1, vehicleNumber: "DL 1A 7890", type: "Bus", capacity: 50,
    seatsUsed: 38, driverId: 1, fuelType: "Diesel", kmDriven: 48200,
    status: "Active", lastServiceDate: "2026-02-10", nextServiceKm: 50000,
    routeId: 1, registrationExpiry: "2027-08-15",
  },
  {
    id: 2, vehicleNumber: "UP 16 CB 4321", type: "Bus", capacity: 54,
    seatsUsed: 42, driverId: 2, fuelType: "CNG", kmDriven: 62100,
    status: "Active", lastServiceDate: "2026-01-20", nextServiceKm: 65000,
    routeId: 2, registrationExpiry: "2026-12-01",
  },
  {
    id: 3, vehicleNumber: "DL 3C 5610", type: "Mini-Bus", capacity: 30,
    seatsUsed: 24, driverId: 3, fuelType: "Diesel", kmDriven: 31450,
    status: "Active", lastServiceDate: "2026-03-01", nextServiceKm: 35000,
    routeId: 3, registrationExpiry: "2028-01-10",
  },
  {
    id: 4, vehicleNumber: "HR 26 AQ 9988", type: "Bus", capacity: 48,
    seatsUsed: 30, driverId: 4, fuelType: "Diesel", kmDriven: 89400,
    status: "Maintenance", lastServiceDate: "2025-11-15", nextServiceKm: 90000,
    routeId: 4, registrationExpiry: "2026-07-22",
  },
  {
    id: 5, vehicleNumber: "DL 8E 1122", type: "Van", capacity: 12,
    seatsUsed: 0, driverId: null, fuelType: "Electric", kmDriven: 8200,
    status: "Inactive", lastServiceDate: "2026-03-15", nextServiceKm: 15000,
    routeId: null, registrationExpiry: "2029-04-30",
  },
];

export const MOCK_STUDENT_ASSIGNMENTS: StudentAssignment[] = [
  { id: 1, studentId: 101, studentName: "Aarav Sharma", className: "10", section: "A", routeId: 1, stopId: 101, monthlyFee: 1800, assignedDate: "2025-06-01" },
  { id: 2, studentId: 102, studentName: "Ishita Verma", className: "8", section: "B", routeId: 1, stopId: 102, monthlyFee: 1800, assignedDate: "2025-06-01" },
  { id: 3, studentId: 103, studentName: "Riya Gupta", className: "9", section: "A", routeId: 1, stopId: 103, monthlyFee: 1800, assignedDate: "2025-06-01" },
  { id: 4, studentId: 104, studentName: "Kabir Mehta", className: "7", section: "C", routeId: 2, stopId: 201, monthlyFee: 2000, assignedDate: "2025-06-01" },
  { id: 5, studentId: 105, studentName: "Priya Nair", className: "11", section: "A", routeId: 2, stopId: 202, monthlyFee: 2000, assignedDate: "2025-06-01" },
  { id: 6, studentId: 106, studentName: "Arjun Singh", className: "6", section: "B", routeId: 2, stopId: 203, monthlyFee: 2000, assignedDate: "2025-06-01" },
  { id: 7, studentId: 107, studentName: "Meera Pillai", className: "10", section: "C", routeId: 3, stopId: 301, monthlyFee: 1500, assignedDate: "2025-06-01" },
  { id: 8, studentId: 108, studentName: "Rohan Das", className: "8", section: "A", routeId: 3, stopId: 302, monthlyFee: 1500, assignedDate: "2025-06-01" },
  { id: 9, studentId: 109, studentName: "Sneha Rao", className: "9", section: "B", routeId: 4, stopId: 401, monthlyFee: 2200, assignedDate: "2025-06-01" },
  { id: 10, studentId: 110, studentName: "Vikram Tiwari", className: "12", section: "A", routeId: 4, stopId: 402, monthlyFee: 2200, assignedDate: "2025-06-01" },
  { id: 11, studentId: 111, studentName: "Ananya Bose", className: "7", section: "A", routeId: 1, stopId: 104, monthlyFee: 1800, assignedDate: "2025-07-10" },
  { id: 12, studentId: 112, studentName: "Harsh Malhotra", className: "11", section: "B", routeId: 2, stopId: 204, monthlyFee: 2000, assignedDate: "2025-07-10" },
  { id: 13, studentId: 113, studentName: "Divya Joshi", className: "6", section: "C", routeId: 3, stopId: 303, monthlyFee: 1500, assignedDate: "2025-07-10" },
  { id: 14, studentId: 114, studentName: "Siddharth Khanna", className: "10", section: "B", routeId: 4, stopId: 403, monthlyFee: 2200, assignedDate: "2025-07-10" },
  { id: 15, studentId: 115, studentName: "Nisha Agarwal", className: "8", section: "C", routeId: 4, stopId: 404, monthlyFee: 2200, assignedDate: "2025-08-01" },
  { id: 16, studentId: 116, studentName: "Tejas Patil", className: "9", section: "C", routeId: 1, stopId: 101, monthlyFee: 1800, assignedDate: "2025-08-01" },
  { id: 17, studentId: 117, studentName: "Shruti Iyer", className: "7", section: "B", routeId: 2, stopId: 201, monthlyFee: 2000, assignedDate: "2025-08-01" },
  { id: 18, studentId: 118, studentName: "Aditya Saxena", className: "12", section: "B", routeId: 3, stopId: 301, monthlyFee: 1500, assignedDate: "2025-08-01" },
  { id: 19, studentId: 119, studentName: "Pooja Mishra", className: "6", section: "A", routeId: 4, stopId: 401, monthlyFee: 2200, assignedDate: "2025-09-01" },
  { id: 20, studentId: 120, studentName: "Karan Bajaj", className: "11", section: "C", routeId: 1, stopId: 102, monthlyFee: 1800, assignedDate: "2025-09-01" },
];

// ── Derived helpers ────────────────────────────────────────────────────────────

export const getDriverById = (id: number | null) =>
  MOCK_DRIVERS.find((d) => d.id === id) ?? null;

export const getRouteById = (id: number | null) =>
  MOCK_ROUTES.find((r) => r.id === id) ?? null;

export const getVehicleById = (id: number | null) =>
  MOCK_VEHICLES.find((v) => v.id === id) ?? null;

export const getStopById = (routeId: number, stopId: number) =>
  MOCK_ROUTES.find((r) => r.id === routeId)?.stops.find((s) => s.id === stopId) ?? null;
