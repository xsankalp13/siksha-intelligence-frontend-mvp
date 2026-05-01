import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Column definition ────────────────────────────────────────────────
export interface Column<T> {
  key: string;
  header: string;
  /** Render custom cell content; defaults to row[key] */
  render?: (row: T) => React.ReactNode;
  /** Make column searchable */
  searchable?: boolean;
  className?: string;
}

// ── Props ────────────────────────────────────────────────────────────
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Unique key accessor for each row */
  getRowId: (row: T) => string | number;
  pageSize?: number;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  /** Render additional action buttons per row */
  customActions?: (row: T) => React.ReactNode;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export default function DataTable<T extends object>({
  columns,
  data,
  getRowId,
  pageSize = 10,
  onEdit,
  onDelete,
  customActions,
  searchPlaceholder = "Search…",
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // ── Searchable column keys ──────────────────────────────────────
  const searchableKeys = useMemo(
    () => columns.filter((c) => c.searchable).map((c) => c.key),
    [columns]
  );

  // ── Filtered data ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      searchableKeys.some((key) =>
        String((row as Record<string, unknown>)[key] ?? "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [data, search, searchableKeys]);

  // ── Pagination ──────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const slice = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const hasActions = Boolean(onEdit || onDelete || customActions);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-gradient-to-b from-muted/60 to-muted/30">
                <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-12">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
                {hasActions && (
                  <th className="h-11 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground w-24">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (hasActions ? 2 : 1)}
                    className="py-20 text-center"
                  >
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
                        <Inbox className="h-7 w-7 opacity-50" />
                      </div>
                      <p className="text-sm font-medium">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                slice.map((row, idx) => (
                  <tr
                    key={getRowId(row)}
                    className="border-b border-border/40 even:bg-muted/20 transition-colors duration-150 hover:bg-primary/5 last:border-0"
                  >
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {safePage * pageSize + idx + 1}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn("px-4 py-3 text-foreground", col.className)}
                      >
                        {col.render
                          ? col.render(row)
                          : String(
                              (row as Record<string, unknown>)[col.key] ?? "—"
                            )}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {customActions && customActions(row)}
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => onEdit(row)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => onDelete(row)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p className="tabular-nums">
            Showing{" "}
            <span className="font-medium text-foreground">
              {safePage * pageSize + 1}–
              {Math.min((safePage + 1) * pageSize, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">{filtered.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={safePage === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum =
                totalPages <= 5
                  ? i
                  : safePage < 3
                  ? i
                  : safePage >= totalPages - 2
                  ? totalPages - 5 + i
                  : safePage - 2 + i;
              const isActive = pageNum === safePage;
              return (
                <Button
                  key={pageNum}
                  variant={isActive ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-8 w-8 tabular-nums",
                    isActive && "shadow-sm"
                  )}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum + 1}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
