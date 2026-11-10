'use client'

import {
  useTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import * as React from 'react'

import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { features, type DataTableFeatures } from './data-table-features'
import { DataTablePagination } from './data-table-pagination'

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  /** Column id wired to the search box. Omit the prop to hide the search box. */
  searchColumn?: string
  /** Rendered at the right end of the search row (e.g. a view switcher). */
  searchSlot?: React.ReactNode
  /**
   * Replaces the table area when the data set is empty. A table header and a
   * "no data" cell add nothing above a richer message, so the whole block
   * steps aside. A filtered-to-zero table keeps its own cell instead. Omit
   * the prop to always use the plain cell.
   */
  emptySlot?: React.ReactNode
}

// Reusable data table: search box + table + pagination. Pages only pass their
// own columns and data; sorting/filtering/pagination state lives here.
export function DataTable<TData extends RowData>({
  columns,
  data,
  searchColumn,
  searchSlot,
  emptySlot,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useTable({
    features,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    // Fixed at 50 rows per page: the rows-per-page selector was removed
    // on purpose, so there is no reason to keep this state dynamic.
    initialState: {
      pagination: { pageIndex: 0, pageSize: 50 },
    },
  })

  // Read once so the empty branch and the body branch cannot disagree when
  // TanStack re-renders between them.
  const rows = table.getRowModel().rows

  return (
    // The table fills the available height (flex-1) so it extends down to the
    // bottom of the page, but rows keep their natural height instead of
    // stretching to fill it. The wrapper scrolls when content overflows.
    <div className="flex flex-1 flex-col gap-y-4">
      {(searchColumn || searchSlot) && (
        <div className="flex items-center justify-between gap-4">
          {searchColumn && (
            <Input
              placeholder="ค้นหา..."
              value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''}
              onChange={(event) => table.getColumn(searchColumn)?.setFilterValue(event.target.value)}
              className="max-w-sm"
            />
          )}
          {searchSlot}
        </div>
      )}
      {data.length === 0 && emptySlot ? (
        // Only a truly empty data set replaces the table block. When a search
        // filters every row out, the table keeps its own "ไม่พบข้อมูล" cell:
        // a page-level message such as "no requests waiting" would be wrong
        // while the rows still exist behind the filter.
        <div className="flex flex-1 flex-col">{emptySlot}</div>
      ) : (
        <>
          {/* Rows keep their natural height instead of stretching to fill the viewport,
              so a table with few rows no longer shows giant cells. The wrapper scrolls
              when the content is taller than the available space. Cells stay
              align-top so multi-line content stays pinned to the top of the row. */}
          <div className="flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.length ? (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      {/* getAllCells (core) instead of getVisibleCells: the
                          column-visibility feature is not registered, so no column
                          can be hidden and every cell renders. */}
                      {row.getAllCells().map((cell) => (
                        <TableCell key={cell.id} className="align-top!">
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} />
        </>
      )}
    </div>
  )
}
