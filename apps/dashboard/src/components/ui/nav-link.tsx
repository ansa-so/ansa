"use client";

import NextLink from "next/link";
import { cn } from "@/lib/utils";

interface NavLinkProps {
	href: string;
	children: React.ReactNode;
	className?: string;
	active?: boolean;
	external?: boolean;
}

export function NavLink({ href, children, className, active, external }: NavLinkProps) {
	const baseClasses = "text-sm transition-colors";
	const stateClasses = active
		? "text-primary dark:text-foreground"
		: "text-neutral-600 dark:text-neutral-400 hover:text-primary hover:dark:text-foreground";

	if (external) {
		return (
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				className={cn(baseClasses, stateClasses, className)}
			>
				{children}
			</a>
		);
	}

	return (
		<NextLink href={href} className={cn(baseClasses, stateClasses, className)}>
			{children}
		</NextLink>
	);
}
