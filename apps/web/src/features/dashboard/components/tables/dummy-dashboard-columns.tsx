"use client";

import { DataTableColumnHeader } from "@/components/tables/data-table-colum-header";
import { ColumnDef } from "@tanstack/react-table";
import { LetterText } from "lucide-react";

export type TableRow = {
  id: string;
  title: string;
  category: string;
};

export const columns: ColumnDef<TableRow>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title="Title"
          icon={LetterText}
        />
      );
    },
  },
  { accessorKey: "category", header: "Category" },
];
