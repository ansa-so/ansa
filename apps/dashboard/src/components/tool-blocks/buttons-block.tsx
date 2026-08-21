"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ButtonData, DisplayConfig } from "./types";

interface ButtonsBlockProps {
	buttons: ButtonData[];
	options?: DisplayConfig["options"];
}

export function ButtonsBlock({ buttons, options }: ButtonsBlockProps) {
	const buttonStyle = options?.buttonStyle || "secondary";

	if (buttons.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-2">
			{buttons.map((button, index) => {
				const variant =
					buttonStyle === "primary"
						? "default"
						: buttonStyle === "outline"
							? "outline"
							: "secondary";

				if (button.url) {
					return (
						<Button key={`${button.label}-${index}`} variant={variant} size="sm" asChild>
							<a href={button.url} target="_blank" rel="noopener noreferrer">
								{button.label}
								<ExternalLink className="w-3 h-3 ml-1" />
							</a>
						</Button>
					);
				}

				return (
					<Button key={`${button.label}-${index}`} variant={variant} size="sm" disabled>
						{button.label}
					</Button>
				);
			})}
		</div>
	);
}
