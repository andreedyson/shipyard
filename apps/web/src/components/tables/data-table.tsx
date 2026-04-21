"use client";

import * as React from "react";
import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  Table as TanstackTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
} from "lucide-react";

export const DEFAULT_PAGE_SIZE_OPTIONS = [1, 10, 25, 50, 100];

type ServerPagination = {
  page: number; // 1-based
  perPage: number;
  totalPages: number;
};

type DataTableFiltersRenderer<TData> = (
  table: TanstackTable<TData>,
) => React.ReactNode;

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  /**
   * If provided => server pagination mode.
   * If omitted => client pagination mode.
   */
  pagination?: ServerPagination;
  onPageChange?: (page: number) => void; // 1-based
  onPageSizeChange?: (size: number) => void;

  /**
   * Search behavior:
   * - Client mode: filters a column via TanStack filter value.
   * - Server mode: calls onSearchChange, controlled by searchValue.
   */
  searchEnabled?: boolean;
  columnFilter?: string;

  manualFiltering?: boolean;
  onSearchChange?: (keyword: string) => void;
  searchValue?: string;

  filters?: DataTableFiltersRenderer<TData>;
  pageSizeOptions?: number[];

  /**
   * UX
   */
  isLoading?: boolean;
  emptyText?: string;
}

function safeColumnId<TData>(table: TanstackTable<TData>, preferred?: string) {
  if (preferred && table.getColumn(preferred)) return preferred;

  // pick the first column that can be filtered (or the first leaf column)
  const filterable = table
    .getAllLeafColumns()
    .find((col) => col.getCanFilter() && col.id !== "actions");

  return filterable?.id ?? table.getAllLeafColumns()[0]?.id ?? "";
}

export function DataTable<TData, TValue>({
  columns,
  data,

  pagination,
  onPageChange,
  onPageSizeChange,

  searchEnabled = true,
  columnFilter,
  manualFiltering = false,
  onSearchChange,
  searchValue,

  filters,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,

  isLoading = false,
  emptyText = "No Data",
}: DataTableProps<TData, TValue>) {
  const isServerPagination = !!pagination;

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  // client pagination state (only used when pagination prop is not provided)
  const [clientPagination, setClientPagination] =
    React.useState<PaginationState>({
      pageIndex: 0,
      pageSize: 10,
    });

  const table = useReactTable({
    data,
    columns,

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),

    // filtering:
    manualFiltering: manualFiltering,
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),

    // pagination:
    manualPagination: isServerPagination,
    pageCount: isServerPagination ? pagination!.totalPages : undefined,
    getPaginationRowModel: isServerPagination
      ? undefined
      : getPaginationRowModel(),

    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,

    onPaginationChange: isServerPagination ? undefined : setClientPagination,

    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: isServerPagination
        ? {
            pageIndex: (pagination!.page ?? 1) - 1,
            pageSize: pagination!.perPage,
          }
        : clientPagination,
    },
  });

  const effectiveSearchColumnId = React.useMemo(
    () => safeColumnId(table, columnFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, columnFilter, columns],
  );

  const currentPage = isServerPagination
    ? pagination!.page
    : table.getState().pagination.pageIndex + 1;
  const totalPages = isServerPagination
    ? pagination!.totalPages
    : table.getPageCount();
  const currentPerPage = isServerPagination
    ? pagination!.perPage
    : table.getState().pagination.pageSize;

  const canPrev = isServerPagination
    ? currentPage > 1
    : table.getCanPreviousPage();
  const canNext = isServerPagination
    ? currentPage < totalPages
    : table.getCanNextPage();

  const handlePrev = () => {
    if (!canPrev) return;
    if (isServerPagination) onPageChange?.(currentPage - 1);
    else table.previousPage();
  };

  const handleNext = () => {
    if (!canNext) return;
    if (isServerPagination) onPageChange?.(currentPage + 1);
    else table.nextPage();
  };

  const handlePageSize = (size: number) => {
    if (isServerPagination) onPageSizeChange?.(size);
    else table.setPageSize(size);
  };

  const clientFilterValue =
    (table.getColumn(effectiveSearchColumnId)?.getFilterValue() as
      | string
      | undefined) ?? "";

  const inputValue = manualFiltering ? (searchValue ?? "") : clientFilterValue;

  return (
    <div className="border-border/80 bg-muted space-y-3 rounded-lg border-2 p-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          {searchEnabled && effectiveSearchColumnId ? (
            <div className="relative w-full sm:w-[320px]">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <span className="sr-only">Search</span>
              <Input
                autoComplete="off"
                placeholder={`Search by ${effectiveSearchColumnId === "id" ? "ID" : effectiveSearchColumnId.split(".").join(" ")}`}
                value={inputValue}
                onChange={(event) => {
                  const next = event.target.value;
                  if (manualFiltering) onSearchChange?.(next);
                  else
                    table
                      .getColumn(effectiveSearchColumnId)
                      ?.setFilterValue(next);
                }}
                className={cn("pl-9")}
              />
            </div>
          ) : null}

          {filters?.(table)}
        </div>

        {/* Column toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Eye className="mr-2 size-4" />
              Columns
              <ChevronDown className="ml-2 size-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Toggle Columns
            </DropdownMenuLabel>
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) =>
                column.id !== "actions" ? (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </DropdownMenuCheckboxItem>
                ) : null,
              )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/30 [&_tr]:border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="px-4 py-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground px-4 py-10 text-center"
                >
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground px-4 py-10 text-center"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="bg-card flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            disabled={!canPrev}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>

          <span className="text-muted-foreground text-sm">
            Page{" "}
            <span className="text-foreground font-medium">{currentPage}</span>{" "}
            of{" "}
            <span className="text-foreground font-medium">
              {Math.max(totalPages, 1)}
            </span>
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={!canNext}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Rows per Page:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                {currentPerPage}
                <ChevronDown className="size-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Select total rows
              </DropdownMenuLabel>
              {pageSizeOptions.map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => handlePageSize(Number(size))}
                  className="cursor-pointer"
                >
                  {size}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
