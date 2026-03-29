// src/components/table/DataTable.tsx
import * as React from "react";
import { cn } from "@/lib/utils.ts";

export type Column<T> = {
    key: string;
    header: React.ReactNode;
    cell: (row: T) => React.ReactNode;
    className?: string;
};

export function DataTable<T>({
                                 rows,
                                 columns,
                                 rowKey,
                                 className,
                             }: {
    rows: T[];
    columns: Array<Column<T>>;
    rowKey: (row: T) => string;
    className?: string;
}) {
    return (
        <div className={cn("overflow-hidden rounded-xl border bg-white", className)}>
            <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                <tr>
                    {columns.map((c) => (
                        <th key={c.key} className="px-3 py-2 text-left font-medium text-slate-700">
                            {c.header}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {rows.map((r) => (
                    <tr key={rowKey(r)} className="border-t">
                        {columns.map((c) => (
                            <td key={c.key} className={cn("px-3 py-2 text-slate-900", c.className)}>
                                {c.cell(r)}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
