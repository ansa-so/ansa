import type { BlockProps, DisplayConfig } from "./types";

interface TableBlockProps extends BlockProps {
	data: Record<string, unknown>[] | Record<string, unknown>;
	options?: DisplayConfig["options"];
}

export function TableBlock({ data, options, isDark }: TableBlockProps) {
	// Handle both array of objects and single object
	const rows = Array.isArray(data) ? data : [data];

	if (rows.length === 0) {
		return null;
	}

	// Determine columns: use options.columns if provided, otherwise infer from data
	const columns =
		options?.columns ||
		Object.keys(rows[0] || {}).map((key) => ({
			key,
			label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
		}));

	if (columns.length === 0) {
		return null;
	}

	const borderColor = isDark ? "#374151" : "#e5e7eb";
	const headerBg = isDark ? "#1f2937" : "#f9fafb";

	return (
		<div
			style={{
				overflowX: "auto",
				marginBottom: "8px",
				borderRadius: "8px",
				border: `1px solid ${borderColor}`,
			}}
		>
			<table
				style={{
					width: "100%",
					borderCollapse: "collapse",
					fontSize: "13px",
				}}
			>
				<thead>
					<tr style={{ backgroundColor: headerBg }}>
						{columns.map((col) => (
							<th
								key={col.key}
								style={{
									padding: "10px 12px",
									textAlign: "left",
									fontWeight: 600,
									borderBottom: `1px solid ${borderColor}`,
									color: isDark ? "#f3f4f6" : "#1f2937",
									width: col.width,
								}}
							>
								{col.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, rowIndex) => (
						<tr
							key={rowIndex}
							style={{
								backgroundColor: isDark ? "#111827" : "#ffffff",
							}}
						>
							{columns.map((col) => (
								<td
									key={col.key}
									style={{
										padding: "10px 12px",
										borderBottom: rowIndex < rows.length - 1 ? `1px solid ${borderColor}` : "none",
										color: isDark ? "#d1d5db" : "#374151",
									}}
								>
									{String(row[col.key] ?? "")}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
