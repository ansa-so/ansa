"use client";

import {
	Activity,
	BookOpen,
	Brain,
	Briefcase,
	CheckCircle2,
	Cpu,
	PenTool,
	Smile,
	Sparkles,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { getPersonas } from "@/lib/api";

export interface PersonaDefinition {
	id: string;
	name: string;
	description: string;
	systemPrompt: string;
	icon: string;
}

// Icon mapping for personas
const PERSONA_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
	default: Cpu,
	sales: Activity,
	support: Brain,
	professional: Briefcase,
	friendly: Smile,
	educational: BookOpen,
	motivational: Sparkles,
	urgent: Zap,
	custom: PenTool,
};

// Persona specs for the brutalist design
const PERSONA_SPECS: Record<string, { tone: string; bias: string }> = {
	default: { tone: "Neutral", bias: "None" },
	sales: { tone: "Persuasive", bias: "Sales" },
	support: { tone: "Empathetic", bias: "Support" },
	professional: { tone: "Professional", bias: "Authority" },
	friendly: { tone: "Casual", bias: "Entertainment" },
	educational: { tone: "Academic", bias: "Education" },
	motivational: { tone: "Inspiring", bias: "Brand" },
	urgent: { tone: "Urgent", bias: "Conversion" },
	custom: { tone: "Custom", bias: "User Defined" },
};

interface PersonaSelectorProps {
	value: string;
	onChange: (value: string) => void;
	onSystemPromptChange?: (prompt: string) => void;
	disabled?: boolean;
}

function PersonaCard({
	persona,
	selected,
	onSelect,
	disabled,
}: {
	persona: PersonaDefinition;
	selected: boolean;
	onSelect: () => void;
	disabled?: boolean;
}) {
	const IconComponent = PERSONA_ICONS[persona.id] || Cpu;
	const specs = PERSONA_SPECS[persona.id] || { tone: "Custom", bias: "Custom" };

	return (
		<button
			type="button"
			onClick={onSelect}
			disabled={disabled}
			className={`relative flex flex-col h-full border p-5 cursor-pointer transition-all duration-200 group text-left ${
				selected
					? "bg-white border-[#1A1A1A] shadow-[0_0_0_1px_#1A1A1A] z-10"
					: "bg-[#FAFAF9] border-[#D1D1D1] hover:border-[#888] hover:bg-white"
			} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
		>
			{/* Selection Indicator */}
			<div className="flex items-start justify-between mb-4">
				<div
					className={`p-2 border ${
						selected
							? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
							: "bg-white text-[#888] border-[#E5E5E5]"
					}`}
				>
					<IconComponent size={16} />
				</div>
				{selected && (
					<div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-0.5 border border-green-200 text-[9px] font-mono font-bold uppercase">
						<CheckCircle2 size={10} /> Active
					</div>
				)}
			</div>

			{/* Content */}
			<div className="flex-1">
				<h3
					className={`text-sm font-bold uppercase tracking-wide mb-2 ${
						selected ? "text-[#1A1A1A]" : "text-[#555]"
					}`}
				>
					{persona.name}
				</h3>
				<p className="text-xs text-[#555] leading-relaxed mb-4 min-h-[40px]">
					{persona.description}
				</p>
			</div>

			{/* Technical Specs Footer */}
			<div
				className={`pt-3 mt-auto border-t flex items-center justify-between text-[9px] font-mono uppercase ${
					selected ? "border-[#F3F2EE]" : "border-[#E5E5E5]"
				}`}
			>
				<span className="text-[#888]">
					Tone: <span className="text-[#1A1A1A]">{specs.tone}</span>
				</span>
				<span className="text-[#888]">
					Bias: <span className="text-[#1A1A1A]">{specs.bias}</span>
				</span>
			</div>
		</button>
	);
}

export function PersonaSelector({
	value,
	onChange,
	onSystemPromptChange,
	disabled,
}: PersonaSelectorProps) {
	const [personas, setPersonas] = useState<PersonaDefinition[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchPersonas = async () => {
			try {
				const data = await getPersonas();
				setPersonas(data);
			} catch (error) {
				console.error("Failed to fetch personas:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchPersonas();
	}, []);

	const handlePersonaChange = (newValue: string) => {
		onChange(newValue);

		// If switching to a preset persona, update the system prompt
		const selectedPersona = personas.find((p) => p.id === newValue);
		if (selectedPersona && newValue !== "custom" && onSystemPromptChange) {
			onSystemPromptChange(selectedPersona.systemPrompt);
		}
	};

	if (loading) {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				<Skeleton className="h-44 w-full" />
				<Skeleton className="h-44 w-full" />
				<Skeleton className="h-44 w-full" />
				<Skeleton className="h-44 w-full" />
				<Skeleton className="h-44 w-full" />
				<Skeleton className="h-44 w-full" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{personas.map((persona) => (
					<PersonaCard
						key={persona.id}
						persona={persona}
						selected={value === persona.id}
						onSelect={() => handlePersonaChange(persona.id)}
						disabled={disabled}
					/>
				))}
			</div>

			{value === "custom" && (
				<Card className="bg-[#FAFAF9] border-[#D1D1D1]">
					<CardContent className="pt-4">
						<div className="flex items-start gap-3">
							<div className="p-2 bg-[#1A1A1A] text-white">
								<PenTool size={16} />
							</div>
							<div>
								<Text className="font-bold uppercase text-sm mb-1">Custom Persona Active</Text>
								<Text size="sm" className="text-[#555]">
									Define a custom system prompt below to have complete control over the AI
									personality and behavior.
								</Text>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
