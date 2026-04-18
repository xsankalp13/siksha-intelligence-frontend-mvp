import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChildSummary } from '@/services/types/parent';

interface ChildStoreState {
  selectedChildId: string | null;
  selectedChild: ChildSummary | null;
  setSelectedChild: (child: ChildSummary) => void;
  clearSelectedChild: () => void;
}

export const useChildStore = create<ChildStoreState>()(
  persist(
    (set) => ({
      selectedChildId: null,
      selectedChild: null,
      setSelectedChild: (child) => set({ selectedChildId: child.childId, selectedChild: child }),
      clearSelectedChild: () => set({ selectedChildId: null, selectedChild: null }),
    }),
    {
      name: 'parent-child-session',
      storage: createJSONStorage(() => sessionStorage), // persist in session storage so refresh works seamlessly
    }
  )
);
