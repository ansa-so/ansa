export type DateRange = "7d" | "30d" | "90d";

interface DateRangeSelectorProps {
	value: DateRange;
	onChange: (range: DateRange) => void;
	disabled?: boolean;
}

export function DateRangeSelector({ value, onChange, disabled = false }: DateRangeSelectorProps) {
	const ranges: { value: DateRange; label: string }[] = [
		{ value: "7d", label: "7 Days" },
		{ value: "30d", label: "30 Days" },
		{ value: "90d", label: "90 Days" },
	];

	return (
		<div className="flex bg-[#F9F9F9] border border-[#D1D1D1] p-1">
			{ranges.map((range) => (
				<button
					key={range.value}
					type="button"
					onClick={() => onChange(range.value)}
					disabled={disabled}
					className={`px-4 py-1.5 text-[10px] font-bold uppercase transition-all disabled:opacity-50 ${
						value === range.value
							? "bg-[#1A1A1A] text-white shadow-sm"
							: "text-[#888] hover:text-[#1A1A1A]"
					}`}
				>
					{range.label}
				</button>
			))}
		</div>
	);
}
