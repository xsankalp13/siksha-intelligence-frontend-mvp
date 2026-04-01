export interface RoomAvailabilityDTO {
  roomId: number;
  roomUuid: string;
  roomName: string;
  totalSeats: number;
  occupiedSeats: number;
  availableSeats: number;
  isFull: boolean;
  totalStudentsToSeat: number;
}

export interface SeatAvailabilityDTO {
  seatId: number;
  label: string;
  rowNumber: number;
  columnNumber: number;
  available: boolean;
  occupiedByStudentName?: string;
}

export interface SeatAllocationResponseDTO {
  allocationId: number;
  studentName: string;
  enrollmentNumber: string;
  seatLabel: string;
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
