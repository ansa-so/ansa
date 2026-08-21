import type { ReactNode } from "react";
import { Text } from "@/components/ui/text";
import { Title } from "@/components/ui/title";

interface PageHeaderProps {
	title: string;
	description?: ReactNode;
	action?: ReactNode;
	badge?: ReactNode;
}

export function PageHeader({ title, description, action, badge }: PageHeaderProps) {
	return (
		<div className="flex items-center justify-between mb-12">
			<div>
				<div className="flex items-center gap-3">
					<Title tag="h1" size="4xl">
						{title}
					</Title>
					{badge}
				</div>
				{description && <Text className="mt-1 text-muted-foreground">{description}</Text>}
			</div>
			{action && <div>{action}</div>}
		</div>
	);
}
