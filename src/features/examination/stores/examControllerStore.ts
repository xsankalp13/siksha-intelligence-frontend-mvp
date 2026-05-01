import { create } from 'zustand';

interface ExamControllerState {
  selectedExamId: number | null;
  setSelectedExamId: (id: number | null) => void;
}

export const useExamControllerStore = create<ExamControllerState>((set) => ({
  selectedExamId: null,
  setSelectedExamId: (id) => set({ selectedExamId: id }),
}));
