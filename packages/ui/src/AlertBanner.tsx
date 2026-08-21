import type * as React from "react";

export interface AlertBannerProps {
	title: string;
	description?: string;
	icon?: React.ReactNode;
	variant?: "warning" | "error" | "info";
	action?: React.ReactNode;
	className?: string;
}

const variantStyles = {
	warning: {
		container: "bg-orange-50 border-orange-200 text-orange-900",
		icon: "text-orange-600",
		badge: "border-orange-300 bg-orange-100 text-orange-700",
	},
	error: {
		container: "bg-red-50 border-red-200 text-red-900",
		icon: "text-red-600",
		badge: "border-red-300 bg-red-100 text-red-700",
	},
	info: {
		container: "bg-blue-50 border-blue-200 text-blue-900",
		icon: "text-blue-600",
		badge: "border-blue-300 bg-blue-100 text-blue-700",
	},
};

export function AlertBanner({
	title,
	description,
	icon,
	variant = "warning",
	action,
	className = "",
}: AlertBannerProps) {
	const styles = variantStyles[variant];

	return (
		<div className={`border p-5 flex items-start justify-between ${styles.container} ${className}`}>
			<div className="flex gap-4">
				{icon && <div className={`mt-0.5 ${styles.icon}`}>{icon}</div>}
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<span className={`text-[9px] font-bold uppercase px-1.5 border ${styles.badge}`}>
							{variant}
						</span>
						<h3 className="text-sm font-bold">{title}</h3>
					</div>
					{description && <p className="max-w-md mb-4 text-xs opacity-80">{description}</p>}
					{action && <div>{action}</div>}
				</div>
			</div>
		</div>
	);
}
