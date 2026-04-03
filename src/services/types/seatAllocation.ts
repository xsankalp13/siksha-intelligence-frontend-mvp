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
  occupiedByStudentName?: string;
  occupiedPositions: ("LEFT" | "RIGHT" | "SINGLE")[];
}

export interface SeatAllocationResponseDTO {
  allocationId: number;
  studentName: string;
  enrollmentNumber: string;
  rollNo: number;
  seatLabel: string;
  position: "LEFT" | "RIGHT" | "SINGLE";
  seatId: number;
  studentId: string;
  roomName: string;
  rowNumber: number;
  columnNumber: number;
  startTime: string;
  endTime: string;
}

export interface SingleSeatAllocationRequestDTO {
  examScheduleId: number;
  studentId: string;
  roomId: string; // The UUID or ID type the backend expects
  seatId: number;
}

export interface BulkSeatAllocationRequestDTO {
  examScheduleId: number;
  roomId: string;
}
