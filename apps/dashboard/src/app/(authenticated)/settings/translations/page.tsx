"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	ArrowRight,
	CheckCircle2,
	Globe,
	Languages,
	Plus,
	RotateCcw,
	Save,
	Settings,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAgent } from "@/lib/agent-context";
import {
	deleteTranslation,
	getTranslations,
	type SupportedLanguage,
	saveTranslation,
	type Translation,
	updateDefaultLanguage,
} from "@/lib/api";

const translationSchema = z.object({
	displayName: z.string().max(100).nullable().optional(),
	initialMessage: z.string().max(500).nullable().optional(),
	suggestedMessages: z.array(z.object({ value: z.string().max(200) })),
	messagePlaceholder: z.string().max(100).nullable().optional(),
	dismissibleMessage: z.string().max(500).nullable().optional(),
	welcomeBubbles: z.array(z.object({ value: z.string().max(150) })).max(5),
	positiveFeedbackPrompt: z.string().max(100).nullable().optional(),
	requestHumanPrompt: z.string().max(100).nullable().optional(),
	humanSupportConfirmation: z.string().max(500).nullable().optional(),
	escalationNoticeMessage: z.string().max(500).nullable().optional(),
});

type TranslationFormData = z.infer<typeof translationSchema>;

// --- BRUTALIST COMPONENTS ---

function SegmentedProgress({ value }: { value: number }) {
	const segmentIds = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];
	const filled = Math.round((value / 100) * segmentIds.length);

	return (
		<div className="flex gap-0.5 h-1.5 w-full bg-[#F3F2EE] border border-[#E5E5E5] p-px">
			{segmentIds.map((id, i) => (
				<div
					key={id}
					className={`flex-1 transition-all ${
						i < filled ? (value === 100 ? "bg-[#1A1A1A]" : "bg-[#EAB308]") : "bg-transparent"
					}`}
				/>
			))}
		</div>
	);
}

function LanguageCard({
	lang,
	isMaster,
	onEdit,
	onDelete,
}: {
	lang: { name: string; code: string; progress: number };
	isMaster: boolean;
	onEdit?: () => void;
	onDelete?: () => void;
}) {
	return (
		<div
			className={`relative border p-5 flex flex-col transition-all group ${
				isMaster
					? "bg-white border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,0.1)]"
					: "bg-[#FAFAF9] border-[#D1D1D1] hover:border-[#888] hover:bg-white"
			}`}
		>
			{/* Header */}
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-center gap-3">
					<div
						className={`w-8 h-8 flex items-center justify-center text-[10px] font-bold border ${
							isMaster
								? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
								: "bg-white text-[#555] border-[#D1D1D1]"
						}`}
					>
						{lang.code.split("-")[0].toUpperCase()}
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-bold tracking-tight uppercase">{lang.name}</h3>
							{isMaster && (
								<span className="text-[9px] bg-[#F3F2EE] border border-[#D1D1D1] px-1.5 py-0.5 text-[#555] font-mono">
									DEFAULT
								</span>
							)}
						</div>
						<div className="text-[10px] font-mono text-[#888]">{lang.code}</div>
					</div>
				</div>

				{!isMaster && onDelete && (
					<button
						type="button"
						onClick={onDelete}
						className="text-[#D1D1D1] hover:text-red-600 transition-colors"
					>
						<Trash2 size={14} />
					</button>
				)}
			</div>

			{/* Status / Progress */}
			<div className="mt-auto space-y-2">
				<div className="flex justify-between items-end text-[9px] font-mono uppercase text-[#888]">
					<span>Coverage</span>
					<span className={lang.progress < 100 ? "text-[#EAB308]" : "text-[#1A1A1A]"}>
						{lang.progress}%
					</span>
				</div>
				<SegmentedProgress value={lang.progress} />
			</div>

			{/* Edit Action */}
			{onEdit && (
				<div className="mt-4 pt-3 border-t border-[#F3F2EE]">
					<button
						type="button"
						onClick={onEdit}
						className="w-full flex items-center justify-between text-[10px] font-bold uppercase group-hover:text-[#1A1A1A] text-[#888] transition-colors"
					>
						<span>{isMaster ? "Configure Strings" : "Edit Translations"}</span>
						<ArrowRight size={10} />
					</button>
				</div>
			)}
		</div>
	);
}

export default function TranslationsSettingsPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [translations, setTranslations] = useState<Translation[]>([]);
	const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);
	const [defaultLanguage, setDefaultLanguage] = useState("en");
	const [loading, setLoading] = useState(true);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingLanguage, setEditingLanguage] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [autoDetect, setAutoDetect] = useState(true);

	const form = useForm<TranslationFormData>({
		resolver: zodResolver(translationSchema),
		defaultValues: {
			displayName: null,
			initialMessage: null,
			suggestedMessages: [],
			messagePlaceholder: null,
			dismissibleMessage: null,
			welcomeBubbles: [],
			positiveFeedbackPrompt: null,
			requestHumanPrompt: null,
			humanSupportConfirmation: null,
			escalationNoticeMessage: null,
		},
	});

	const {
		fields: suggestedFields,
		append: appendSuggested,
		remove: removeSuggested,
	} = useFieldArray({
		control: form.control,
		name: "suggestedMessages",
	});

	const {
		fields: welcomeFields,
		append: appendWelcome,
		remove: removeWelcome,
	} = useFieldArray({
		control: form.control,
		name: "welcomeBubbles",
	});

	const fetchTranslations = useCallback(async () => {
		if (!currentAgent) return;
		setLoading(true);
		try {
			const data = await getTranslations(currentAgent.id);
			setTranslations(data.translations);
			setSupportedLanguages(data.supportedLanguages);
			setDefaultLanguage(data.defaultLanguage);
		} catch (err) {
			console.error("Failed to fetch translations:", err);
			toast.error("Failed to load translations");
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		if (currentAgent) fetchTranslations();
	}, [currentAgent, fetchTranslations]);

	const getLanguageName = (code: string) => {
		return supportedLanguages.find((l) => l.code === code)?.name || code;
	};

	const getUntranslatedLanguages = () => {
		const existingCodes = translations.map((t) => t.languageCode);
		return supportedLanguages.filter((l) => !existingCodes.includes(l.code));
	};

	const calculateProgress = (translation: Translation) => {
		const fields = [
			translation.displayName,
			translation.initialMessage,
			translation.messagePlaceholder,
			translation.suggestedMessages?.length,
			translation.welcomeBubbles?.length,
		];
		const filled = fields.filter(Boolean).length;
		return Math.round((filled / fields.length) * 100);
	};

	const handleAddTranslation = (languageCode: string) => {
		setEditingLanguage(languageCode);
		form.reset({
			displayName: null,
			initialMessage: null,
			suggestedMessages: [],
			messagePlaceholder: null,
			dismissibleMessage: null,
			welcomeBubbles: [],
			positiveFeedbackPrompt: null,
			requestHumanPrompt: null,
			humanSupportConfirmation: null,
			escalationNoticeMessage: null,
		});
		setDialogOpen(true);
	};

	const handleEditTranslation = (translation: Translation) => {
		setEditingLanguage(translation.languageCode);
		form.reset({
			displayName: translation.displayName,
			initialMessage: translation.initialMessage,
			suggestedMessages: (translation.suggestedMessages || []).map((v) => ({ value: v })),
			messagePlaceholder: translation.messagePlaceholder,
			dismissibleMessage: translation.dismissibleMessage,
			welcomeBubbles: (translation.welcomeBubbles || []).map((v) => ({ value: v })),
			positiveFeedbackPrompt: translation.positiveFeedbackPrompt,
			requestHumanPrompt: translation.requestHumanPrompt,
			humanSupportConfirmation: translation.humanSupportConfirmation,
			escalationNoticeMessage: translation.escalationNoticeMessage,
		});
		setDialogOpen(true);
	};

	const handleDeleteTranslation = async (languageCode: string) => {
		if (!currentAgent) return;
		if (!confirm(`Delete ${getLanguageName(languageCode)} translation?`)) return;

		try {
			await deleteTranslation(currentAgent.id, languageCode);
			fetchTranslations();
		} catch (err) {
			console.error("Failed to delete translation:", err);
			toast.error("Failed to delete translation");
		}
	};

	const handleSetDefaultLanguage = async (languageCode: string) => {
		if (!currentAgent) return;
		try {
			await updateDefaultLanguage(currentAgent.id, languageCode);
			setDefaultLanguage(languageCode);
			toast.success(`Default language set to ${getLanguageName(languageCode)}`);
		} catch (err) {
			console.error("Failed to update default language:", err);
			toast.error("Failed to update default language");
		}
	};

	const onSubmit = async (data: TranslationFormData) => {
		if (!editingLanguage || !currentAgent) return;

		setSaving(true);
		try {
			await saveTranslation(currentAgent.id, editingLanguage, {
				displayName: data.displayName || null,
				initialMessage: data.initialMessage || null,
				suggestedMessages: data.suggestedMessages.map((m) => m.value).filter((v) => v.trim()),
				messagePlaceholder: data.messagePlaceholder || null,
				dismissibleMessage: data.dismissibleMessage || null,
				welcomeBubbles: data.welcomeBubbles.map((m) => m.value).filter((v) => v.trim()),
				positiveFeedbackPrompt: data.positiveFeedbackPrompt || null,
				requestHumanPrompt: data.requestHumanPrompt || null,
				humanSupportConfirmation: data.humanSupportConfirmation || null,
				escalationNoticeMessage: data.escalationNoticeMessage || null,
			});
			setDialogOpen(false);
			fetchTranslations();
		} catch (err) {
			console.error("Failed to save translation:", err);
			toast.error("Failed to save translation");
		} finally {
			setSaving(false);
		}
	};

	if (!currentAgent || loading) return null;

	const untranslatedLanguages = getUntranslatedLanguages();
	const defaultLangName = getLanguageName(defaultLanguage);

	return (
		<div className="flex flex-col min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans">
			{/* Header */}
			<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
				<div>
					<h1 className="text-xl font-medium tracking-tight">Localization Matrix</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
						<span className="flex items-center gap-1">
							<Globe size={10} /> Global Config
						</span>
						<span className="text-[#D1D1D1]">|</span>
						<span>Active Packs: {translations.length + 1}</span>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => fetchTranslations()}
						className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555] flex items-center gap-2"
					>
						<RotateCcw size={12} /> Refresh
					</button>
				</div>
			</header>

			{/* Content Area */}
			<div className="flex-1 w-full p-8 mx-auto space-y-8 overflow-y-auto">
				{/* 1. Global Settings */}
				<section className="bg-white border border-[#D1D1D1] p-6 shadow-sm flex items-center justify-between">
					<div className="flex items-start gap-4">
						<div className="p-2 bg-[#FAFAF9] border border-[#E5E5E5]">
							<Settings size={16} />
						</div>
						<div>
							<h3 className="mb-1 text-xs font-bold tracking-widest uppercase">
								Auto-Detection Protocol
							</h3>
							<p className="text-[11px] text-[#555] max-w-md leading-relaxed">
								Automatically route users to the correct language pack based on their browser
								headers and IP geolocation.
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={() => setAutoDetect(!autoDetect)}
						className={`w-12 h-6 rounded-full border flex items-center px-0.5 transition-colors ${
							autoDetect
								? "bg-[#1A1A1A] border-[#1A1A1A] justify-end"
								: "bg-[#E5E5E5] border-[#D1D1D1] justify-start"
						}`}
					>
						<div className="w-4 h-4 bg-white rounded-full shadow-sm" />
					</button>
				</section>

				{/* 2. Primary Language */}
				<section>
					<div className="flex items-center gap-2 mb-4">
						<CheckCircle2 size={14} className="text-[#1A1A1A]" />
						<h3 className="text-xs font-bold tracking-widest uppercase">Master Locale (Default)</h3>
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<LanguageCard
							lang={{ name: defaultLangName, code: defaultLanguage, progress: 100 }}
							isMaster={true}
						/>

						{/* Info Box */}
						<div className="border border-dashed border-[#D1D1D1] p-5 flex flex-col justify-center text-[10px] text-[#888] font-mono leading-relaxed bg-[#FAFAF9]">
							<p className="mb-2">
								<strong className="text-[#1A1A1A]">NOTE:</strong> The Master Locale serves as the
								fallback for any missing strings in secondary language packs.
							</p>
							<div className="mt-2">
								<span className="text-[9px] uppercase">Change Default:</span>
								<select
									value={defaultLanguage}
									onChange={(e) => handleSetDefaultLanguage(e.target.value)}
									className="ml-2 bg-white border border-[#D1D1D1] px-2 py-1 text-[10px] focus:outline-none focus:border-[#1A1A1A]"
								>
									{supportedLanguages.map((lang) => (
										<option key={lang.code} value={lang.code}>
											{lang.name}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>
				</section>

				{/* 3. Installed Packs */}
				<section>
					<div className="flex items-center justify-between mb-4 border-b border-[#D1D1D1] pb-2">
						<div className="flex items-center gap-2">
							<Languages size={14} />
							<h3 className="text-xs font-bold tracking-widest uppercase">Expansion Packs</h3>
						</div>
						<div className="text-[9px] font-mono text-[#888]">{translations.length} INSTALLED</div>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{translations.map((translation) => (
							<LanguageCard
								key={translation.id}
								lang={{
									name: getLanguageName(translation.languageCode),
									code: translation.languageCode,
									progress: calculateProgress(translation),
								}}
								isMaster={false}
								onEdit={() => handleEditTranslation(translation)}
								onDelete={() => handleDeleteTranslation(translation.languageCode)}
							/>
						))}

						{/* Add New Card */}
						{untranslatedLanguages.length > 0 && (
							<div className="border border-dashed border-[#D1D1D1] bg-white hover:bg-[#FAFAF9] transition-colors p-5 flex flex-col items-center justify-center gap-3 group min-h-[160px]">
								<div className="w-10 h-10 rounded-full bg-[#F3F2EE] group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors flex items-center justify-center">
									<Plus size={16} />
								</div>
								<select
									onChange={(e) => {
										if (e.target.value) handleAddTranslation(e.target.value);
										e.target.value = "";
									}}
									className="text-[10px] font-bold uppercase tracking-widest text-[#555] bg-transparent border-none focus:outline-none cursor-pointer text-center"
									defaultValue=""
								>
									<option value="" disabled>
										Install Locale
									</option>
									{untranslatedLanguages.map((lang) => (
										<option key={lang.code} value={lang.code}>
											{lang.name}
										</option>
									))}
								</select>
							</div>
						)}
					</div>
				</section>
			</div>

			{/* Edit Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-2 border-[#1A1A1A] rounded-none shadow-[8px_8px_0px_0px_rgba(26,26,26,0.15)]">
					<DialogHeader className="border-b border-[#F3F2EE] pb-4">
						<DialogTitle className="text-lg font-bold tracking-tight uppercase">
							{editingLanguage
								? `${getLanguageName(editingLanguage)} Translation`
								: "Add Translation"}
						</DialogTitle>
						<DialogDescription className="text-[11px] text-[#888] font-mono">
							Customize widget messages for this language. Leave fields empty to use the default.
						</DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="pt-4 space-y-6">
							<FormField
								control={form.control}
								name="displayName"
								render={({ field }) => (
									<FormItem>
										<div className="group">
											<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors">
												Display Name
											</span>
											<Input
												value={field.value || ""}
												onChange={(e) => field.onChange(e.target.value || null)}
												placeholder="AI Assistant"
												showCharCount
												className="h-10 p-0 px-3 font-mono text-xs"
											/>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="initialMessage"
								render={({ field }) => (
									<FormItem>
										<div className="group">
											<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors">
												Initial Message
											</span>
											<Textarea
												value={field.value || ""}
												onChange={(e) => field.onChange(e.target.value || null)}
												placeholder="Hello! How can I help you today?"
												showCharCount
												className="h-20 p-3 font-mono text-xs resize-y"
											/>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="messagePlaceholder"
								render={({ field }) => (
									<FormItem>
										<div className="group">
											<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors">
												Message Placeholder
											</span>
											<Input
												value={field.value || ""}
												onChange={(e) => field.onChange(e.target.value || null)}
												placeholder="Type a message..."
												showCharCount
												className="h-10 p-0 px-3 font-mono text-xs"
											/>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Suggested Messages */}
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-[9px] font-mono uppercase text-[#888]">
										Suggested Messages
									</span>
									{suggestedFields.length < 5 && (
										<button
											type="button"
											onClick={() => appendSuggested({ value: "" })}
											className="text-[9px] font-bold uppercase flex items-center gap-1 text-[#888] hover:text-[#1A1A1A]"
										>
											<Plus size={10} /> Add
										</button>
									)}
								</div>
								{suggestedFields.map((field, index) => (
									<div key={field.id} className="flex gap-2">
										<FormField
											control={form.control}
											name={`suggestedMessages.${index}.value`}
											render={({ field: formField }) => (
												<FormItem className="flex-1">
													<FormControl>
														<input
															type="text"
															{...formField}
															placeholder="e.g., What are your hours?"
															className="w-full h-10 bg-[#FAFAF9] border border-[#D1D1D1] px-3 text-xs font-mono focus:outline-none focus:border-[#1A1A1A] placeholder:text-[#CCC]"
														/>
													</FormControl>
												</FormItem>
											)}
										/>
										<button
											type="button"
											onClick={() => removeSuggested(index)}
											className="w-10 h-10 flex items-center justify-center text-[#D1D1D1] hover:text-red-600 border border-[#D1D1D1] hover:border-red-600 transition-colors"
										>
											<X size={14} />
										</button>
									</div>
								))}
							</div>

							{/* Welcome Bubbles */}
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-[9px] font-mono uppercase text-[#888]">
										Welcome Bubbles
									</span>
									{welcomeFields.length < 5 && (
										<button
											type="button"
											onClick={() => appendWelcome({ value: "" })}
											className="text-[9px] font-bold uppercase flex items-center gap-1 text-[#888] hover:text-[#1A1A1A]"
										>
											<Plus size={10} /> Add
										</button>
									)}
								</div>
								{welcomeFields.map((field, index) => (
									<div key={field.id} className="flex gap-2">
										<FormField
											control={form.control}
											name={`welcomeBubbles.${index}.value`}
											render={({ field: formField }) => (
												<FormItem className="flex-1">
													<FormControl>
														<input
															type="text"
															{...formField}
															placeholder="Hi! Need help?"
															className="w-full h-10 bg-[#FAFAF9] border border-[#D1D1D1] px-3 text-xs font-mono focus:outline-none focus:border-[#1A1A1A] placeholder:text-[#CCC] rounded-full text-center"
														/>
													</FormControl>
												</FormItem>
											)}
										/>
										<button
											type="button"
											onClick={() => removeWelcome(index)}
											className="w-10 h-10 flex items-center justify-center text-[#D1D1D1] hover:text-red-600 border border-[#D1D1D1] hover:border-red-600 transition-colors rounded-full"
										>
											<X size={14} />
										</button>
									</div>
								))}
							</div>

							{/* Action Buttons */}
							<div className="flex justify-end gap-3 pt-4 border-t border-[#F3F2EE]">
								<button
									type="button"
									onClick={() => setDialogOpen(false)}
									className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555]"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={saving}
									className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
								>
									<Save size={12} /> {saving ? "Saving..." : "Save Translation"}
								</button>
							</div>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
