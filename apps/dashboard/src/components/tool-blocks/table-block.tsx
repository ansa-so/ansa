"use client";

import type { DisplayConfig } from "./types";

interface TableBlockProps {
	data: Record<string, unknown> | Record<string, unknown>[];
	options?: DisplayConfig["options"];
}

function formatCellValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
}

export function TableBlock({ data, options }: TableBlockProps) {
	const columns = options?.columns;
	const rows = Array.isArray(data) ? data : [data];

	// If columns are specified, use them
	if (columns && columns.length > 0) {
		return (
			<div className="rounded-lg border overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-100 dark:bg-gray-800">
						<tr>
							{columns.map((col) => (
								<th
									key={col.key}
									className="px-3 py-2 text-left font-medium text-muted-foreground"
									style={{ width: col.width }}
								>
									{col.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row, idx) => (
							<tr key={`row-${idx}`} className="border-t">
								{columns.map((col) => (
									<td key={col.key} className="px-3 py-2">
										{formatCellValue((row as Record<string, unknown>)[col.key])}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	// Auto-generate table from array of objects
	if (Array.isArray(data) && data.length > 0) {
		// Collect all unique keys from all rows (preserving order from first item)
		const keys = Array.from(
			data.reduce((set, row) => {
				if (row && typeof row === "object") {
					for (const key of Object.keys(row)) set.add(key);
				}
				return set;
			}, new Set<string>()),
		);

		if (keys.length === 0) return null;

		return (
			<div className="rounded-lg border overflow-hidden overflow-x-auto">
				<table className="w-full text-sm">
					<thead className="bg-gray-100 dark:bg-gray-800">
						<tr>
							{keys.map((key) => (
								<th
									key={key}
									className="px-3 py-2 text-left font-medium text-muted-foreground capitalize whitespace-nowrap"
								>
									{key.replace(/[_-]/g, " ")}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.map((row, idx) => (
							<tr key={`row-${idx}`} className="border-t">
								{keys.map((key) => (
									<td key={key} className="px-3 py-2 whitespace-nowrap">
										{formatCellValue((row as Record<string, unknown>)[key])}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	// Single object → key-value table
	if (!Array.isArray(data) && typeof data === "object") {
		const entries = Object.entries(data).filter(([_, v]) => v !== null && v !== undefined);
		if (entries.length === 0) return null;

		return (
			<div className="rounded-lg border overflow-hidden">
				<table className="w-full text-sm">
					<tbody>
						{entries.map(([key, value]) => (
							<tr key={key} className="border-t first:border-t-0">
								<td className="px-3 py-2 font-medium text-muted-foreground bg-gray-50 dark:bg-gray-800 w-1/3">
									{key}
								</td>
								<td className="px-3 py-2">{formatCellValue(value)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	return null;
}
