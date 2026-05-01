/**
 * dashboardLayoutStore
 * ---------------------
 * Persists admin dashboard widget order and visibility to localStorage.
 * Uses zustand v5 + persist middleware.
 * Key: "dashboard-layout-v1" (bump the key if the widget list changes shape).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Widget ID type ────────────────────────────────────────────────────
export type WidgetId =
  | "finance-chart"
  | "demographics"
  | "priority-inbox"
  | "attendance-chart"
  | "hrms-intelligence"
  | "live-feed"
  | "quick-actions"
  | "library";

export const DEFAULT_ORDER: WidgetId[] = [
  "finance-chart",
  "demographics",
  "priority-inbox",
  "attendance-chart",
  "hrms-intelligence",
  "live-feed",
  "quick-actions",
  "library",
];

export const WIDGET_LABELS: Record<WidgetId, string> = {
  "finance-chart": "Finance & Payroll Analytics",
  "demographics": "Institute Demographics",
  "priority-inbox": "Priority Inbox",
  "attendance-chart": "Daily Attendance Pulse",
  "hrms-intelligence": "HRMS Intelligence",
  "live-feed": "Live System Feed",
  "quick-actions": "Quick Actions",
  "library": "Library System (Demo)",
};

// ── Store ─────────────────────────────────────────────────────────────
interface DashboardLayoutState {
  widgetOrder: WidgetId[];
  hiddenWidgets: WidgetId[];
  setWidgetOrder: (order: WidgetId[]) => void;
  toggleWidgetVisibility: (id: WidgetId) => void;
  resetLayout: () => void;
}

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set) => ({
      widgetOrder: DEFAULT_ORDER,
      hiddenWidgets: [],

      setWidgetOrder: (order) => set({ widgetOrder: order }),

      toggleWidgetVisibility: (id) =>
        set((state) => ({
          hiddenWidgets: state.hiddenWidgets.includes(id)
            ? state.hiddenWidgets.filter((w) => w !== id)
            : [...state.hiddenWidgets, id],
        })),

      resetLayout: () => set({ widgetOrder: DEFAULT_ORDER, hiddenWidgets: [] }),
    }),
    { name: "dashboard-layout-v1" }
  )
);
