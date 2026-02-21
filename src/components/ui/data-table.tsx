/**
 * DataTable Component - Professional Trading Platform
 * Following rule_ui.md: NO striped rows, NO generic tables
 * Unique design with floating row cards and timeline style
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  variant?: "cards" | "timeline" | "default";
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  variant = "cards",
  onRowClick,
  emptyMessage = "No data available",
  className,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "asc",
  );

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-default">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          className="text-text-tertiary mb-4"
        >
          <rect
            x="8"
            y="8"
            width="32"
            height="32"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M16 20H32M16 28H24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-sm text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  // Floating Cards Variant
  if (variant === "cards") {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Header */}
        <div className="grid gap-4 px-6 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wide">
          {columns.map((column) => (
            <div
              key={column.key}
              className={cn(
                "flex items-center gap-2",
                column.align === "right" && "justify-end",
                column.align === "center" && "justify-center",
              )}
              style={{ gridColumn: `span ${column.width || "1"}` }}
            >
              {column.header}
              {column.sortable && (
                <button
                  onClick={() => handleSort(column.key)}
                  className="hover:text-text-primary transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M6 2V10M6 2L3 5M6 2L9 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Rows as Cards */}
        {data.map((row, index) => (
          <div
            key={row.id || index}
            onClick={() => onRowClick?.(row)}
            className={cn(
              "grid gap-4 px-6 py-4 bg-bg-secondary rounded-[var(--radius-md)]",
              "border-l-4 border-transparent",
              "hover:border-accent-primary hover:bg-bg-tertiary",
              "transition-all duration-[var(--transition-fast)]",
              onRowClick && "cursor-pointer",
            )}
          >
            {columns.map((column) => (
              <div
                key={column.key}
                className={cn(
                  "flex items-center",
                  column.align === "right" && "justify-end",
                  column.align === "center" && "justify-center",
                )}
                style={{ gridColumn: `span ${column.width || "1"}` }}
              >
                {column.cell(row)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Timeline Variant
  if (variant === "timeline") {
    return (
      <div className={cn("relative", className)}>
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-px bg-border-default" />

        {data.map((row, index) => (
          <div
            key={row.id || index}
            onClick={() => onRowClick?.(row)}
            className={cn(
              "relative pl-16 py-4 group",
              onRowClick && "cursor-pointer",
            )}
          >
            {/* Timeline dot */}
            <div className="absolute left-6 top-6 w-4 h-4 rounded-full bg-accent-primary ring-4 ring-bg-primary group-hover:scale-125 transition-transform" />

            {/* Content */}
            <div className="grid gap-4 px-6 py-4 bg-bg-secondary rounded-[var(--radius-md)] border border-border-default hover:border-accent-primary transition-colors">
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "flex items-center",
                    column.align === "right" && "justify-end",
                    column.align === "center" && "justify-center",
                  )}
                  style={{ gridColumn: `span ${column.width || "1"}` }}
                >
                  {column.cell(row)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default Variant - Minimal table
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-default">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wide",
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center",
                )}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="hover:text-text-primary transition-colors"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M6 2V10M6 2L3 5M6 2L9 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row.id || index}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "border-b border-border-subtle last:border-0",
                "hover:bg-bg-tertiary transition-colors",
                onRowClick && "cursor-pointer",
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-4 py-4 text-sm text-text-primary",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { DataTable };
