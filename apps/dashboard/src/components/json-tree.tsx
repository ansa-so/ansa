"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

/** Check if a JSON subtree contains a key or value matching the filter */
export function subtreeMatches(data: JsonValue, path: string, filter: string): boolean {
	if (!filter) return true;
	const lower = filter.toLowerCase();

	// Check if the current key (last segment of path) matches
	const key = path.includes(".") ? path.split(".").pop() || "" : path.replace(/\[.*\]/, "");
	if (key.toLowerCase().includes(lower)) return true;

	if (data === null) return "null".includes(lower);
	if (typeof data !== "object") return String(data).toLowerCase().includes(lower);

	if (Array.isArray(data)) {
		return data.some((item, idx) => subtreeMatches(item, `${path}[${idx}]`, filter));
	}

	return Object.entries(data).some(([k, v]) =>
		subtreeMatches(v, path ? `${path}.${k}` : k, filter),
	);
}

/** Recursive JSON tree component with clickable paths */
export function JsonNode({
	data,
	path = "",
	onSelect,
	selectedField,
	expanded,
	onToggle,
	filter,
}: {
	data: JsonValue;
	path: string;
	onSelect: (path: string) => void;
	selectedField: string | null;
	expanded: Record<string, boolean>;
	onToggle: (path: string) => void;
	filter?: string;
}) {
	if (data === null) {
		return <span className="text-gray-400">null</span>;
	}

	if (typeof data !== "object") {
		const isMatch = filter && String(data).toLowerCase().includes(filter.toLowerCase());
		return (
			<button
				type="button"
				onClick={() => onSelect(path)}
				className={cn(
					"px-1 rounded hover:bg-blue-100 cursor-pointer text-left",
					selectedField === path && "bg-blue-200",
					isMatch && "ring-1 ring-yellow-400 bg-yellow-50",
				)}
			>
				{typeof data === "string" ? (
					<span className="text-green-600">
						&quot;{data.length > 50 ? `${data.slice(0, 50)}...` : data}&quot;
					</span>
				) : typeof data === "number" ? (
					<span className="text-blue-600">{data}</span>
				) : (
					<span className="text-orange-600">{String(data)}</span>
				)}
			</button>
		);
	}

	if (Array.isArray(data)) {
		const hasFilterMatch = filter ? subtreeMatches(data, path, filter) : true;
		const isExpanded = filter ? hasFilterMatch : expanded[path] !== false;
		return (
			<div className="ml-2">
				<button
					type="button"
					onClick={() => onToggle(path)}
					className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
				>
					{isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
					<span className="text-xs">Array [{data.length}]</span>
				</button>
				{isExpanded && (
					<div className="pl-2 ml-4 border-l border-gray-200">
						{data.slice(0, 10).map((item, idx) => {
							const itemKey = `${path}[${idx}]`;
							if (filter && !subtreeMatches(item, itemKey, filter)) return null;
							return (
								<div key={itemKey} className="flex items-start gap-1">
									<span className="text-xs text-gray-400">{idx}:</span>
									<JsonNode
										data={item}
										path={itemKey}
										onSelect={onSelect}
										selectedField={selectedField}
										expanded={expanded}
										onToggle={onToggle}
										filter={filter}
									/>
								</div>
							);
						})}
						{data.length > 10 && (
							<div className="text-xs italic text-gray-400">
								...and {data.length - 10} more items
							</div>
						)}
					</div>
				)}
			</div>
		);
	}

	// Object
	const entries = Object.entries(data);
	const hasFilterMatch = filter ? subtreeMatches(data, path, filter) : true;
	const isExpanded = filter ? hasFilterMatch : expanded[path] !== false;

	return (
		<div className={path ? "ml-2" : ""}>
			{path && (
				<button
					type="button"
					onClick={() => onToggle(path)}
					className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
				>
					{isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
					<span className="text-xs">Object {`{${entries.length}}`}</span>
				</button>
			)}
			{(isExpanded || !path) && (
				<div className={cn(path && "ml-4 border-l border-gray-200 pl-2")}>
					{entries.map(([key, value]) => {
						const childPath = path ? `${path}.${key}` : key;
						if (filter && !subtreeMatches(value, childPath, filter)) return null;
						const isLeaf = value === null || typeof value !== "object";
						const keyMatch = filter && key.toLowerCase().includes(filter.toLowerCase());

						return (
							<div key={key} className="flex items-start gap-1 py-0.5">
								{isLeaf ? (
									<>
										<button
											type="button"
											onClick={() => onSelect(childPath)}
											className={cn(
												"text-purple-600 font-medium text-sm hover:underline",
												selectedField === childPath && "bg-blue-200 px-1 rounded",
												keyMatch && "bg-yellow-100 rounded px-1",
											)}
										>
											{key}:
										</button>
										<JsonNode
											data={value}
											path={childPath}
											onSelect={onSelect}
											selectedField={selectedField}
											expanded={expanded}
											onToggle={onToggle}
											filter={filter}
										/>
									</>
								) : (
									<div>
										<span
											className={cn(
												"text-sm font-medium text-purple-600",
												keyMatch && "bg-yellow-100 rounded px-1",
											)}
										>
											{key}:
										</span>
										<JsonNode
											data={value}
											path={childPath}
											onSelect={onSelect}
											selectedField={selectedField}
											expanded={expanded}
											onToggle={onToggle}
											filter={filter}
										/>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
