import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import { cn } from './utils';

export type DataTableColumn<Row> = {
  key: string;
  label: string;
  className?: string;
  sortable?: boolean;
  sortValue?: (row: Row) => string | number | null | undefined;
  render: (row: Row) => ReactNode;
};

export default function DataTable<Row>({
  rows,
  columns,
  className,
}: {
  rows: Row[];
  columns: Array<DataTableColumn<Row>>;
  className?: string;
}) {
  const defaultSortColumn = columns.find((column) => column.sortable)?.key ?? null;
  const [sortKey, setSortKey] = useState<string | null>(defaultSortColumn);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return rows;
    }

    const activeColumn = columns.find((column) => column.key === sortKey);
    if (!activeColumn?.sortable) {
      return rows;
    }

    const getSortValue = (row: Row) => {
      if (activeColumn.sortValue) {
        return activeColumn.sortValue(row);
      }

      return (row as Record<string, unknown>)[activeColumn.key] as string | number | null | undefined;
    };

    return [...rows].sort((left, right) => {
      const leftValue = getSortValue(left);
      const rightValue = getSortValue(right);

      if (leftValue == null && rightValue == null) return 0;
      if (leftValue == null) return 1;
      if (rightValue == null) return -1;

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }

      const comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [columns, rows, sortDirection, sortKey]);

  const toggleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(columnKey);
    setSortDirection('asc');
  };

  return (
    <div className={cn('overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]', className)}>
      <div
        className="grid gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-overlay)]/70 px-5 py-4"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((column) => (
          <div key={column.key} className={column.className}>
            {column.sortable ? (
              <button
                type="button"
                onClick={() => toggleSort(column.key)}
                className="inline-flex items-center gap-2 type-subheading text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <span>{column.label}</span>
                {sortKey === column.key ? (
                  sortDirection === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUpAZ className="h-3.5 w-3.5 opacity-35" />
                )}
              </button>
            ) : (
              <div className={cn('type-subheading text-[var(--text-tertiary)]', column.className)}>{column.label}</div>
            )}
          </div>
        ))}
      </div>
      <div>
        {sortedRows.map((row, index) => (
          <div
            key={index}
            className="grid gap-4 border-b border-[var(--border-subtle)] px-5 py-4 last:border-b-0 hover:bg-[rgba(201,165,90,0.03)]"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            {columns.map((column) => (
              <div key={column.key} className={column.className}>
                {column.render(row)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
