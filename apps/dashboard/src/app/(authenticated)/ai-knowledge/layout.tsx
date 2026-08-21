"use client";

import { ChevronRight, Database, FileText, Globe, HelpCircle, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const knowledgeItems = [
	{ icon: HelpCircle, label: "Q&A", href: "/ai-knowledge/qa" },
	{ icon: Globe, label: "Web Sources", href: "/ai-knowledge/web-sources" },
	{ icon: Home, label: "Files", href: "/ai-knowledge/files" },
	{ icon: FileText, label: "Texts", href: "/ai-knowledge/texts" },
];

export default function AIKnowledgeLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	return (
		<div className="flex w-full h-full">
			<aside className="w-[240px] bg-[#F9F9F9] border-r border-[#D1D1D1] flex flex-col h-full font-sans text-[#1A1A1A] flex-shrink-0">
				<div className="h-16 border-b border-[#D1D1D1] flex items-center px-5 bg-[#FAFAF9]">
					<span className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
						<Database size={14} className="text-[#888]" /> Knowledge
					</span>
				</div>
				<div className="flex-1 py-4 space-y-6 overflow-y-auto">
					<div>
						<div className="px-5 mb-2 font-mono text-[9px] uppercase tracking-widest text-[#888]">
							Sources
						</div>
						<div className="space-y-1">
							{knowledgeItems.map((item) => {
								const isActive = pathname === item.href;
								return (
									<Link
										key={item.href}
										href={item.href}
										className={`mx-2 px-3 py-2 flex items-center justify-between cursor-pointer border rounded-sm transition-all group ${
											isActive
												? "bg-white border-[#D1D1D1] shadow-sm"
												: "border-transparent hover:bg-[#F3F2EE] hover:border-[#F3F2EE]"
										}`}
									>
										<div className="flex items-center gap-3">
											<div
												className={`w-6 h-6 flex items-center justify-center rounded-sm border ${
													isActive
														? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
														: "bg-[#F3F2EE] border-[#E5E5E5] text-[#888] group-hover:text-[#1A1A1A]"
												}`}
											>
												<item.icon size={12} />
											</div>
											<span
												className={`text-xs ${isActive ? "font-bold" : "font-medium text-[#555]"}`}
											>
												{item.label}
											</span>
										</div>
										{isActive && <ChevronRight size={12} className="text-[#1A1A1A]" />}
									</Link>
								);
							})}
						</div>
					</div>
				</div>
			</aside>
			<main className="flex-1 overflow-auto">{children}</main>
		</div>
	);
}
