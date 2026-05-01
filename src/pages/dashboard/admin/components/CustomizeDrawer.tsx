/**
 * CustomizeDrawer
 * ----------------
 * Slide-in panel for personalizing the admin dashboard layout:
 *   • Drag-and-drop widget reordering (@dnd-kit/sortable)
 *   • Show/hide individual widgets
 *   • Reset to default layout
 */
import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  X,
  Eye,
  EyeOff,
  RotateCcw,
  LayoutDashboard,
  TrendingUp,
  PieChart,
  Inbox,
  Users,
  ShieldAlert,
  Bell,
  Zap,
  BookOpen,
} from "lucide-react";
import {
  useDashboardLayoutStore,
  WIDGET_LABELS,
  type WidgetId,
} from "@/stores/dashboardLayoutStore";

// ── Widget icon map ───────────────────────────────────────────────────
const WIDGET_ICONS: Record<WidgetId, React.ElementType> = {
  "finance-chart": TrendingUp,
  "demographics": PieChart,
  "priority-inbox": Inbox,
  "attendance-chart": Users,
  "hrms-intelligence": ShieldAlert,
  "live-feed": Bell,
  "quick-actions": Zap,
  "library": BookOpen,
};

// ── Sortable Item ────────────────────────────────────────────────────
function SortableWidgetRow({ id, isHidden }: { id: WidgetId; isHidden: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const toggle = useDashboardLayoutStore((s) => s.toggleWidgetVisibility);
  const Icon = WIDGET_ICONS[id];

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
        isHidden
          ? "border-border/40 bg-muted/40 opacity-60"
          : "border-border bg-card shadow-sm"
      } ${isDragging ? "shadow-xl ring-2 ring-primary/20" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${WIDGET_LABELS[id]}`}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/60 hover:text-muted-foreground focus:outline-none"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Icon */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isHidden ? "bg-muted" : "bg-primary/10"}`}>
        <Icon className={`h-4 w-4 ${isHidden ? "text-muted-foreground" : "text-primary"}`} aria-hidden="true" />
      </div>

      {/* Label */}
      <span className={`flex-1 text-sm font-semibold ${isHidden ? "text-muted-foreground line-through" : "text-foreground"}`}>
        {WIDGET_LABELS[id]}
      </span>

      {/* Visibility toggle */}
      <button
        onClick={() => toggle(id)}
        aria-label={isHidden ? `Show ${WIDGET_LABELS[id]}` : `Hide ${WIDGET_LABELS[id]}`}
        className={`shrink-0 rounded-xl p-1.5 transition-colors ${
          isHidden
            ? "text-muted-foreground hover:text-foreground hover:bg-accent"
            : "text-primary hover:bg-primary/10"
        }`}
      >
        {isHidden ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────
export function CustomizeDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { widgetOrder, hiddenWidgets, setWidgetOrder, resetLayout } =
    useDashboardLayoutStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = widgetOrder.indexOf(active.id as WidgetId);
        const newIndex = widgetOrder.indexOf(over.id as WidgetId);
        setWidgetOrder(arrayMove(widgetOrder, oldIndex, newIndex));
      }
    },
    [widgetOrder, setWidgetOrder]
  );

  const visibleCount = widgetOrder.length - hiddenWidgets.length;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl"
            aria-label="Customize dashboard layout"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-bold text-foreground">Customize Dashboard</h2>
                  <p className="text-xs text-muted-foreground">
                    {visibleCount} of {widgetOrder.length} widgets visible
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetLayout}
                  aria-label="Reset to default layout"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reset
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close customize panel"
                  className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="px-5 py-3 text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border">
              Drag <GripVertical className="inline h-3 w-3" aria-hidden="true" /> to reorder &nbsp;·&nbsp;
              Click <Eye className="inline h-3 w-3" aria-hidden="true" /> to show/hide
            </div>

            {/* Sortable list */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={widgetOrder}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2">
                    {widgetOrder.map((id) => (
                      <SortableWidgetRow
                        key={id}
                        id={id}
                        isHidden={hiddenWidgets.includes(id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-5 py-4">
              <p className="text-xs text-muted-foreground text-center">
                Layout saved automatically to your browser
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
