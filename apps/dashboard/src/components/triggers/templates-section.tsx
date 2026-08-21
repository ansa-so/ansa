"use client";

import { LayoutTemplate } from "lucide-react";
import type { TriggerTemplate } from "@/lib/api";
import { TemplateCard } from "./template-card";

interface TemplatesSectionProps {
	templates: TriggerTemplate[];
	categories: string[];
	categoryLabels: Record<string, string>;
	selectedCategory: string;
	onCategoryChange: (category: string) => void;
	onTemplateSelect: (template: TriggerTemplate) => void;
	getTemplateIcon: (iconName: string) => React.ElementType;
}

export function TemplatesSection({
	templates,
	categories,
	categoryLabels,
	selectedCategory,
	onCategoryChange,
	onTemplateSelect,
	getTemplateIcon,
}: TemplatesSectionProps) {
	const filteredTemplates =
		selectedCategory === "all"
			? templates
			: templates.filter((t) => t.category === selectedCategory);

	return (
		<section className="bg-white border border-[#D1D1D1] p-6 shadow-sm">
			<h3 className="flex items-center gap-2 mb-4 text-xs font-bold tracking-wide uppercase">
				<LayoutTemplate size={14} className="text-[#888]" /> Quick Start Templates
			</h3>

			{/* Category Filters */}
			<div className="flex flex-wrap gap-2 mb-4">
				{categories.map((cat) => (
					<button
						key={cat}
						type="button"
						onClick={() => onCategoryChange(cat)}
						className={`text-[10px] font-bold uppercase px-3 py-1.5 border transition-colors ${
							selectedCategory === cat
								? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
								: "bg-white text-[#555] border-[#D1D1D1] hover:border-[#1A1A1A]"
						}`}
					>
						{categoryLabels[cat] || cat}
					</button>
				))}
			</div>

			{/* Template Grid */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{filteredTemplates.map((template) => {
					const Icon = getTemplateIcon(template.icon);
					return (
						<TemplateCard
							key={template.id}
							name={template.name}
							description={template.description}
							icon={Icon}
							onClick={() => onTemplateSelect(template)}
						/>
					);
				})}
			</div>

			{filteredTemplates.length === 0 && (
				<div className="py-8 text-center text-[#888] font-mono text-xs">
					No templates in this category
				</div>
			)}
		</section>
	);
}
