export interface OccupiedByDTO {
  subjectName: string;
  className: string;
  count: number;
}

export interface OccupiedSlotDTO {
  positionIndex: number;
  positionLabel: string; // "LEFT" | "MIDDLE" | "RIGHT"
  subjectName: string;
  className: string;
  studentName: string;
}

export interface RoomAvailabilityDTO {
  roomId: number;
  roomUuid: string;
  roomName: string;
  totalSeats: number;

  /** totalSeats × maxStudentsPerSeat */
  totalCapacity: number;
  /** Number of active allocations in the time window */
  occupiedCapacity: number;
  /** totalCapacity - occupiedCapacity */
  availableCapacity: number;

  isFull: boolean;
  /** How many students each seat holds for this schedule */
  maxStudentsPerSeat: number;
  totalStudentsToSeat: number;
  floorNumber: number | null;
  mode?: "SINGLE" | "DOUBLE" | "TRIPLE";
  occupiedBy?: OccupiedByDTO[];

  // ── Backward-compatible aliases (serialized from backend) ──
  /** @deprecated Use occupiedCapacity */
  occupiedSeats: number;
  /** @deprecated Use availableCapacity */
  availableSeats: number;
}

export interface SeatAvailabilityDTO {
  seatId: number;
  label: string;
  rowNumber: number;
  columnNumber: number;

  /** Max students this seat can hold */
  capacity: number;
  /** Current allocation count */
  occupiedCount: number;
  /** capacity - occupiedCount */
  availableSlots: number;
  /** True if occupiedCount >= capacity */
  isFull: boolean;

  /** Backward compat: true if seat has capacity left */
  available: boolean;

  /** Rich per-slot info: positionIndex, subject, class, student */
  occupiedSlots: OccupiedSlotDTO[];
}

export interface SeatAllocationResponseDTO {
  allocationId: number;
  studentName: string;
  enrollmentNumber: string;
  rollNo: number;
  seatLabel: string;

  /** 0-based position index: 0=LEFT, 1=MIDDLE, 2=RIGHT */
  positionIndex: number;
  /** Human-readable: "LEFT" | "MIDDLE" | "RIGHT" | "" */
  positionLabel: string;

  seatId: number;
  studentId: string;
  roomName: string;
  rowNumber: number;
  columnNumber: number;
  startTime: string;
  endTime: string;

  /** Subject name for this allocation */
  subjectName: string;
  /** Class name for this allocation */
  className: string;
}

export interface SingleSeatAllocationRequestDTO {
  examScheduleId: number;
  studentId: string;
  roomId: string;
  seatId: number;
}

export interface BulkSeatAllocationRequestDTO {
  examScheduleId: number;
  roomId: string;
}
