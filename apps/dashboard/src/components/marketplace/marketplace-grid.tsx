"use client";

import {
	Database,
	GitBranch,
	Mail,
	MessageSquare,
	Plus,
	Search,
	Shield,
	ShoppingBag,
	Zap,
} from "lucide-react";
import Link from "next/link";

const iconMap = {
	MessageSquare,
	Database,
	ShoppingBag,
	GitBranch,
	Shield,
	Search,
	Mail,
	Zap,
};

export interface MarketplaceApp {
	id: string;
	slug: string;
	name: string;
	category: string;
	description: string;
	iconName: string;
	installed: boolean;
	isFree: boolean;
}

interface MarketplaceGridProps {
	apps: MarketplaceApp[];
}

export function MarketplaceGrid({ apps }: MarketplaceGridProps) {
	return (
		<div className="lg:col-span-9">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
				{apps.map((app) => {
					const Icon = iconMap[app.iconName as keyof typeof iconMap] || Zap;
					return (
						<Link
							key={app.id}
							href={`/marketplace/${app.slug}`}
							className="bg-white p-8 flex flex-col justify-between h-[280px] hover:bg-[#FAFAFA] transition-colors group relative overflow-hidden"
						>
							{/* Top: Icon & Cat */}
							<div>
								<div className="flex items-start justify-between mb-6">
									<Icon size={32} strokeWidth={1} className="text-foreground" />
									{app.installed && (
										<span className="bg-[#EAE9E5] text-[#555] text-[9px] font-mono uppercase px-2 py-1 border border-[#D1D1D1]">
											Installed
										</span>
									)}
								</div>
								<h3 className="mb-2 text-xl font-medium">{app.name}</h3>
								<p className="text-sm text-[#666] leading-relaxed mb-4">{app.description}</p>
							</div>

							{/* Bottom: Meta & Action */}
							<div className="mt-auto">
								<div className="w-full h-px bg-[#F3F2EE] mb-4" />
								<div className="flex items-center justify-between">
									<span className="font-mono text-[10px] uppercase text-[#AAA] tracking-widest">
										{app.category}
									</span>
									<button
										type="button"
										className="w-8 h-8 flex items-center justify-center border border-[#D1D1D1] rounded-full hover:bg-[#1A1A1A] hover:text-white transition-colors group-hover:scale-110"
									>
										<Plus size={14} />
									</button>
								</div>
							</div>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
