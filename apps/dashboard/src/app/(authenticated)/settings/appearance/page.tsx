"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	Layout,
	Lock,
	MessageSquare,
	MousePointer2,
	Palette,
	RotateCcw,
	Save,
	Type,
	Upload,
	X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlansWithCurrent } from "@/hooks/use-plans";
import { useAgent } from "@/lib/agent-context";
import {
	deleteProfilePicture,
	deleteWidgetIcon,
	getInterfaceSettings,
	updateInterfaceSettings,
	uploadProfilePicture,
	uploadWidgetIcon,
} from "@/lib/api";
import { type EmbedFormData, embedSchema } from "../_lib/schemas";

// Detect if a color is light (needs dark text for contrast)
function isLightColor(hex: string): boolean {
	const color = hex.replace(/^#/, "");
	let r: number, g: number, b: number;
	if (color.length === 3) {
		r = Number.parseInt(color[0] + color[0], 16);
		g = Number.parseInt(color[1] + color[1], 16);
		b = Number.parseInt(color[2] + color[2], 16);
	} else {
		r = Number.parseInt(color.slice(0, 2), 16);
		g = Number.parseInt(color.slice(2, 4), 16);
		b = Number.parseInt(color.slice(4, 6), 16);
	}
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.7;
}

// --- BRUTALIST COMPONENTS ---

function ColorPicker({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="space-y-1.5">
			<Label>{label}</Label>
			<div className="flex items-center gap-2">
				<div
					className="w-10 h-10 border border-[#D1D1D1] shadow-sm relative group cursor-pointer"
					style={{ backgroundColor: value }}
				>
					<input
						type="color"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						className="absolute inset-0 opacity-0 cursor-pointer"
					/>
				</div>
				<div className="relative flex-1">
					<div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888] font-mono text-xs z-10">
						#
					</div>
					<Input
						type="text"
						value={value.replace("#", "")}
						onChange={(e) => onChange(`#${e.target.value}`)}
						className="pl-6 font-mono text-xs uppercase"
					/>
				</div>
			</div>
		</div>
	);
}

function ShapeSelector({
	selected,
	onSelect,
}: {
	selected: string;
	onSelect: (value: string) => void;
}) {
	const shapes = [
		{ id: "28px", label: "circle" },
		{ id: "0px", label: "square" },
	];

	return (
		<div className="flex gap-2">
			{shapes.map((shape) => (
				<button
					key={shape.id}
					type="button"
					onClick={() => onSelect(shape.id)}
					className={`h-10 px-4 border flex items-center justify-center transition-all ${
						selected === shape.id
							? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
							: "bg-white border-[#D1D1D1] text-[#888] hover:border-[#888]"
					}`}
				>
					{shape.label === "circle" && (
						<div className="w-4 h-4 border border-current rounded-full" />
					)}
					{shape.label === "square" && (
						<div className="w-4 h-4 border border-current rounded-none" />
					)}
				</button>
			))}
		</div>
	);
}

export default function AppearancePage() {
	const { currentAgent, refetchAgents, isLoading: agentLoading } = useAgent();
	const { plans, currentPlanId } = usePlansWithCurrent();
	const [loading, setLoading] = useState(true);
	const [profilePicture, setProfilePicture] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [widgetIcon, setWidgetIcon] = useState<string | null>(null);
	const [widgetIconType, setWidgetIconType] = useState<"upload" | "url" | "emoji" | null>(null);
	const [uploadingIcon, setUploadingIcon] = useState(false);
	const iconFileInputRef = useRef<HTMLInputElement>(null);
	const [widgetIconTab, setWidgetIconTab] = useState<"upload" | "url" | "emoji">("upload");
	const [widgetIconUrl, setWidgetIconUrl] = useState("");
	const [widgetIconEmoji, setWidgetIconEmoji] = useState("");
	const [position, setPosition] = useState<"left" | "right">("right");

	const currentPlan = plans.find((p) => p.id === currentPlanId);
	const canRemoveBranding = currentPlan?.canRemoveBranding ?? false;

	const form = useForm<EmbedFormData>({
		resolver: zodResolver(embedSchema),
		defaultValues: {
			theme: "light",
			primaryColor: "#3b82f6",
			chatBubbleColor: "#3b82f6",
			chatBubbleAlign: "right",
			widgetButtonColor: "#3b82f6",
			widgetButtonBorderRadius: "28px",
			displayName: "AI Assistant",
			initialMessage: "Hello! How can I help you today?",
			suggestedMessages: [],
			messagePlaceholder: "Type a message...",
			footerMessage: null,
			dismissibleMessage: null,
			welcomeBubbles: [],
			collectUserFeedback: true,
			showSatisfactionOnResolved: true,
			escalationNoticeMessage: null,
			userEscalationMessage: null,
			deescalationMessage: null,
		},
	});

	const {
		formState: { isDirty, isSubmitting },
	} = form;

	useFieldArray({ control: form.control, name: "suggestedMessages" });
	useFieldArray({ control: form.control, name: "welcomeBubbles" });

	const fetchData = useCallback(async () => {
		if (!currentAgent) return;
		setLoading(true);
		try {
			const settings = await getInterfaceSettings(currentAgent.id);
			if (settings) {
				form.reset({
					theme: settings.theme || "light",
					primaryColor: settings.primaryColor || "#3b82f6",
					chatBubbleColor: settings.chatBubbleColor || "#3b82f6",
					chatBubbleAlign: settings.chatBubbleAlign || "right",
					widgetButtonColor: settings.widgetButtonColor || "#3b82f6",
					widgetButtonBorderRadius: settings.widgetButtonBorderRadius || "28px",
					displayName: settings.displayName || "AI Assistant",
					initialMessage: settings.initialMessage || null,
					suggestedMessages: settings.suggestedMessages?.map((msg) => ({ value: msg })) || [],
					messagePlaceholder: settings.messagePlaceholder || null,
					footerMessage: settings.footerMessage || null,
					dismissibleMessage: settings.dismissibleMessage || null,
					welcomeBubbles: settings.welcomeBubbles?.map((msg) => ({ value: msg })) || [],
					collectUserFeedback: settings.collectUserFeedback ?? true,
					showSatisfactionOnResolved: settings.showSatisfactionOnResolved ?? true,
					escalationNoticeMessage: settings.escalationNoticeMessage || null,
					userEscalationMessage: settings.userEscalationMessage || null,
					deescalationMessage: settings.deescalationMessage || null,
				});
				setProfilePicture(settings.profilePicture || null);
				setWidgetIcon(settings.widgetButtonIcon || null);
				setWidgetIconType((settings.widgetButtonIconType as "upload" | "url" | "emoji") || null);
				setPosition(settings.chatBubbleAlign === "left" ? "left" : "right");
			}
		} catch (err) {
			console.error("Failed to fetch settings:", err);
			toast.error("Failed to load settings");
		} finally {
			setLoading(false);
		}
	}, [currentAgent, form]);

	useEffect(() => {
		if (currentAgent) fetchData();
	}, [currentAgent, fetchData]);

	const onSubmit = async (data: EmbedFormData) => {
		if (!currentAgent) return;
		try {
			await updateInterfaceSettings(currentAgent.id, {
				theme: data.theme,
				primaryColor: data.primaryColor,
				chatBubbleColor: data.chatBubbleColor,
				chatBubbleAlign: data.chatBubbleAlign,
				widgetButtonColor: data.widgetButtonColor,
				widgetButtonBorderRadius: data.widgetButtonBorderRadius,
				displayName: data.displayName,
				initialMessage: data.initialMessage,
				suggestedMessages: data.suggestedMessages?.filter((m) => m.value).map((m) => m.value) || [],
				messagePlaceholder: data.messagePlaceholder,
				footerMessage: canRemoveBranding ? data.footerMessage : "Powered by Ansa",
				dismissibleMessage: data.dismissibleMessage,
				welcomeBubbles: data.welcomeBubbles?.filter((m) => m.value).map((m) => m.value) || [],
				collectUserFeedback: data.collectUserFeedback,
				showSatisfactionOnResolved: data.showSatisfactionOnResolved,
				escalationNoticeMessage: data.escalationNoticeMessage,
				userEscalationMessage: data.userEscalationMessage,
				deescalationMessage: data.deescalationMessage,
				profilePicture,
				widgetButtonIcon: widgetIcon,
				widgetButtonIconType: widgetIconType,
			});
			await refetchAgents();
			form.reset(data);
		} catch (err) {
			console.error("Failed to update settings:", err);
			toast.error("Failed to save settings");
		}
	};

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !currentAgent) return;
		if (file.size > 2 * 1024 * 1024) {
			toast.error("File too large. Maximum size is 2MB");
			return;
		}
		setUploading(true);
		try {
			const response = await uploadProfilePicture(currentAgent.id, file);
			setProfilePicture(response.url);
			toast.success("Profile picture uploaded");
		} catch (err) {
			console.error("Upload failed:", err);
			toast.error("Failed to upload image");
		} finally {
			setUploading(false);
		}
	};

	const handleRemoveProfilePicture = async () => {
		if (!currentAgent || !profilePicture) return;
		try {
			await deleteProfilePicture(currentAgent.id);
			setProfilePicture(null);
			toast.success("Profile picture removed");
		} catch (err) {
			console.error("Failed to remove picture:", err);
			toast.error("Failed to remove picture");
		}
	};

	const handleIconFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !currentAgent) return;
		if (file.size > 2 * 1024 * 1024) {
			toast.error("File too large. Maximum size is 2MB");
			return;
		}
		setUploadingIcon(true);
		try {
			const response = await uploadWidgetIcon(currentAgent.id, file);
			setWidgetIcon(response.icon);
			setWidgetIconType("upload");
			toast.success("Widget icon uploaded");
		} catch (err) {
			console.error("Upload failed:", err);
			toast.error("Failed to upload icon");
		} finally {
			setUploadingIcon(false);
		}
	};

	const handleRemoveWidgetIcon = async () => {
		if (!currentAgent || !widgetIcon) return;
		try {
			await deleteWidgetIcon(currentAgent.id);
			setWidgetIcon(null);
			setWidgetIconType(null);
			toast.success("Widget icon removed");
		} catch (err) {
			console.error("Failed to remove icon:", err);
			toast.error("Failed to remove icon");
		}
	};

	useEffect(() => {
		if (widgetIconTab === "url" && widgetIconUrl) {
			setWidgetIcon(widgetIconUrl);
			setWidgetIconType("url");
		} else if (widgetIconTab === "emoji" && widgetIconEmoji) {
			setWidgetIcon(widgetIconEmoji);
			setWidgetIconType("emoji");
		}
	}, [widgetIconTab, widgetIconUrl, widgetIconEmoji]);

	useEffect(() => {
		form.setValue("chatBubbleAlign", position, { shouldDirty: true });
	}, [position, form]);

	if (loading) return null;

	const headerColor = form.watch("primaryColor") || "#3b82f6";
	const userMsgColor = form.watch("chatBubbleColor") || "#3b82f6";
	const btnShape = form.watch("widgetButtonBorderRadius") || "28px";
	const botName = form.watch("displayName") || "AI Assistant";

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex flex-col min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans"
			>
				{/* Header */}
				<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
					<div>
						<h1 className="text-xl font-medium tracking-tight">Interface Schematics</h1>
						<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
							<span className="flex items-center gap-1">
								<Layout size={10} /> Widget Topology
							</span>
							<span className="text-[#D1D1D1]">|</span>
							<span>v2.1.0</span>
						</div>
					</div>
					<div className="flex items-center gap-3">
						{isDirty && (
							<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase">
								<span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
								Unsaved Changes
							</div>
						)}
						<Link
							href="/chat"
							target="_blank"
							className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555] flex items-center gap-2"
						>
							<MousePointer2 size={12} /> Live Preview
						</Link>
						<button
							type="button"
							onClick={() => form.reset()}
							disabled={!isDirty || isSubmitting}
							className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<RotateCcw size={12} /> Reset
						</button>
						<button
							type="submit"
							disabled={isSubmitting || !isDirty}
							className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Save size={12} /> {isSubmitting ? "Saving..." : "Commit Changes"}
						</button>
					</div>
				</header>

				{/* Split Layout */}
				<div className="flex flex-col flex-1 overflow-hidden lg:flex-row">
					{/* LEFT: EDIT PANEL */}
					<div className="flex-1 overflow-y-auto p-8 border-r border-[#D1D1D1] bg-white space-y-8">
						{/* Identity Section */}
						<section>
							<div className="flex items-center gap-2 mb-4 border-b border-[#F3F2EE] pb-2">
								<Type size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Identity & Assets</h3>
							</div>
							<div className="space-y-5">
								<FormField
									control={form.control}
									name="displayName"
									render={({ field }) => (
										<FormItem className="space-y-1.5">
											<Label>Display Name</Label>
											<FormControl>
												<Input type="text" {...field} className="text-sm font-medium" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<div className="space-y-1.5">
									<Label>Avatar Asset</Label>
									<div className="flex items-center gap-4 border border-[#D1D1D1] p-2 border-dashed bg-[#FAFAF9]">
										{profilePicture ? (
											<div className="relative w-12 h-12">
												<Image
													src={profilePicture}
													alt="Profile"
													width={48}
													height={48}
													className="object-cover w-12 h-12"
												/>
												<button
													type="button"
													onClick={handleRemoveProfilePicture}
													className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white hover:bg-red-600"
												>
													<X className="w-3 h-3" />
												</button>
											</div>
										) : (
											<div
												className="flex items-center justify-center w-12 h-12 text-white"
												style={{ backgroundColor: headerColor }}
											>
												<div className="w-6 h-6 border-2 border-white rounded-full" />
											</div>
										)}
										<div className="flex-1">
											<input
												ref={fileInputRef}
												type="file"
												accept="image/jpeg,image/png,image/gif,image/webp"
												onChange={handleFileSelect}
												className="hidden"
											/>
											<button
												type="button"
												onClick={() => fileInputRef.current?.click()}
												disabled={uploading}
												className="bg-white border border-[#D1D1D1] px-3 py-1.5 text-[9px] font-bold uppercase flex items-center gap-2 hover:border-[#1A1A1A] disabled:opacity-50"
											>
												<Upload size={10} /> {uploading ? "Uploading..." : "Upload Binary"}
											</button>
											<div className="text-[9px] font-mono text-[#888] mt-1">
												MAX: 2MB (JPG, PNG, WEBP)
											</div>
										</div>
									</div>
								</div>
							</div>
						</section>

						{/* Palette Section */}
						<section>
							<div className="flex items-center gap-2 mb-4 border-b border-[#F3F2EE] pb-2">
								<Palette size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Color Manifest</h3>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="primaryColor"
									render={({ field }) => (
										<ColorPicker
											label="Header Background"
											value={field.value}
											onChange={field.onChange}
										/>
									)}
								/>
								<FormField
									control={form.control}
									name="chatBubbleColor"
									render={({ field }) => (
										<ColorPicker
											label="User Message"
											value={field.value}
											onChange={field.onChange}
										/>
									)}
								/>
							</div>
							<div className="mt-4 pt-4 border-t border-[#F3F2EE]">
								<Label className="block mb-2">System Theme</Label>
								<FormField
									control={form.control}
									name="theme"
									render={({ field }) => (
										<div className="flex bg-[#F3F2EE] p-1 border border-[#E5E5E5]">
											{["light", "dark", "system"].map((t) => (
												<button
													key={t}
													type="button"
													onClick={() => field.onChange(t)}
													className={`flex-1 py-1.5 text-[9px] font-bold uppercase transition-all ${field.value === t ? "bg-white shadow-sm text-[#1A1A1A] border border-[#D1D1D1]" : "text-[#888] border border-transparent"}`}
												>
													{t === "system" ? "auto" : t}
												</button>
											))}
										</div>
									)}
								/>
							</div>
						</section>

						{/* Widget Button Section */}
						<section>
							<div className="flex items-center gap-2 mb-4 border-b border-[#F3F2EE] pb-2">
								<MousePointer2 size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Launcher Config</h3>
							</div>
							<div className="space-y-5">
								<div className="space-y-1.5">
									<Label>Button Geometry</Label>
									<FormField
										control={form.control}
										name="widgetButtonBorderRadius"
										render={({ field }) => (
											<ShapeSelector selected={field.value} onSelect={field.onChange} />
										)}
									/>
								</div>
								<div className="space-y-1.5">
									<Label>Alignment Vector</Label>
									<div className="flex gap-4">
										{(["left", "right"] as const).map((p) => (
											<label key={p} className="flex items-center gap-2 cursor-pointer group">
												<div
													className={`w-3 h-3 border flex items-center justify-center ${position === p ? "border-[#1A1A1A]" : "border-[#D1D1D1]"}`}
												>
													{position === p && <div className="w-1.5 h-1.5 bg-[#1A1A1A]" />}
												</div>
												<input
													type="radio"
													name="position"
													value={p}
													checked={position === p}
													onChange={() => setPosition(p)}
													className="sr-only"
												/>
												<span className="text-[10px] font-bold uppercase text-[#555] group-hover:text-[#1A1A1A]">
													{p}
												</span>
											</label>
										))}
									</div>
								</div>
								<FormField
									control={form.control}
									name="widgetButtonColor"
									render={({ field }) => (
										<ColorPicker
											label="Button Color"
											value={field.value}
											onChange={field.onChange}
										/>
									)}
								/>
								{/* Button Icon Section */}
								<div className="space-y-3 pt-4 border-t border-[#F3F2EE]">
									<Label>Button Icon</Label>
									<div className="flex bg-[#F3F2EE] p-1 border border-[#E5E5E5]">
										{(["upload", "url", "emoji"] as const).map((tab) => (
											<button
												key={tab}
												type="button"
												onClick={() => setWidgetIconTab(tab)}
												className={`flex-1 py-1.5 text-[9px] font-bold uppercase transition-all ${widgetIconTab === tab ? "bg-white shadow-sm text-[#1A1A1A] border border-[#D1D1D1]" : "text-[#888] border border-transparent"}`}
											>
												{tab}
											</button>
										))}
									</div>
									{widgetIconTab === "upload" && (
										<div className="flex items-center gap-4 border border-[#D1D1D1] p-2 border-dashed bg-[#FAFAF9]">
											{widgetIcon && widgetIconType === "upload" ? (
												<div className="relative w-12 h-12">
													<Image
														src={widgetIcon}
														alt="Widget Icon"
														width={48}
														height={48}
														className="object-contain bg-gray-100"
														unoptimized
													/>
													<button
														type="button"
														onClick={handleRemoveWidgetIcon}
														className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white hover:bg-red-600"
													>
														<X className="w-3 h-3" />
													</button>
												</div>
											) : (
												<div className="w-12 h-12 bg-[#E5E5E5] flex items-center justify-center">
													<Upload className="w-5 h-5 text-[#888]" />
												</div>
											)}
											<div className="flex-1">
												<input
													ref={iconFileInputRef}
													type="file"
													accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
													onChange={handleIconFileSelect}
													className="hidden"
												/>
												<button
													type="button"
													onClick={() => iconFileInputRef.current?.click()}
													disabled={uploadingIcon}
													className="bg-white border border-[#D1D1D1] px-3 py-1.5 text-[9px] font-bold uppercase flex items-center gap-2 hover:border-[#1A1A1A] disabled:opacity-50"
												>
													<Upload size={10} /> {uploadingIcon ? "Uploading..." : "Upload Icon"}
												</button>
												<div className="text-[9px] font-mono text-[#888] mt-1">
													MAX: 2MB (JPG, PNG, SVG)
												</div>
											</div>
										</div>
									)}
									{widgetIconTab === "url" && (
										<div className="space-y-2">
											<Input
												type="text"
												placeholder="https://example.com/icon.png"
												value={widgetIconUrl}
												onChange={(e) => setWidgetIconUrl(e.target.value)}
												className="font-mono text-xs"
											/>
											{widgetIconUrl && (
												<div className="flex items-center gap-2 p-2 bg-[#FAFAF9] border border-[#D1D1D1]">
													<Image
														src={widgetIconUrl}
														alt="Preview"
														width={32}
														height={32}
														className="object-contain"
														unoptimized
														onError={(e) => {
															e.currentTarget.style.display = "none";
														}}
													/>
													<span className="text-[9px] font-mono text-[#888] uppercase">
														Preview
													</span>
												</div>
											)}
										</div>
									)}
									{widgetIconTab === "emoji" && (
										<div className="space-y-2">
											<Input
												type="text"
												placeholder="Enter any emoji"
												value={widgetIconEmoji}
												onChange={(e) => setWidgetIconEmoji(e.target.value)}
												maxLength={4}
												className="text-lg"
											/>
											{widgetIconEmoji && (
												<div className="flex items-center gap-2 p-2 bg-[#FAFAF9] border border-[#D1D1D1]">
													<span className="text-2xl">{widgetIconEmoji}</span>
													<span className="text-[9px] font-mono text-[#888] uppercase">
														Preview
													</span>
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						</section>

						{/* Branding Section */}
						<section>
							<div className="flex items-center gap-2 mb-4 border-b border-[#F3F2EE] pb-2">
								<Lock size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Branding</h3>
							</div>
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label>Footer Message</Label>
									{!canRemoveBranding && (
										<Link
											href="/billing"
											className="text-[9px] font-mono uppercase text-[#888] hover:text-[#1A1A1A] underline"
										>
											Upgrade to customize
										</Link>
									)}
								</div>
								<FormField
									control={form.control}
									name="footerMessage"
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<Input
													type="text"
													placeholder="Powered by Ansa"
													{...field}
													value={canRemoveBranding ? field.value || "" : "Powered by Ansa"}
													disabled={!canRemoveBranding}
													className={`font-mono text-xs ${!canRemoveBranding ? "bg-[#E5E5E5] cursor-not-allowed text-[#888]" : ""}`}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</section>
					</div>

					{/* RIGHT: DEVICE EMULATOR */}
					<div className="flex-[1.5] bg-[#F3F2EE] relative flex items-center justify-center p-8 overflow-hidden min-h-[700px]">
						<div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#D1D1D1_1px,transparent_1px)] [background-size:16px_16px]" />
						<div className="absolute top-8 bottom-8 left-8 w-px bg-[#D1D1D1]" />
						<div className="absolute left-8 right-8 bottom-8 h-px bg-[#D1D1D1]" />
						<div className="absolute left-10 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[#888] -rotate-90">
							viewport.height: 100%
						</div>
						<div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[#888]">
							viewport.width: 100%
						</div>

						{/* Device Frame */}
						<div className="w-[375px] h-[650px] bg-white border-2 border-[#1A1A1A] shadow-2xl relative flex flex-col z-10">
							<div className="h-6 bg-[#FAFAF9] border-b border-[#F3F2EE] flex items-center justify-between px-3">
								<div className="text-[8px] font-mono">9:41</div>
								<div className="flex gap-1">
									<div className="w-2 h-2 bg-[#1A1A1A] rounded-full" />
									<div className="w-2 h-2 border border-[#1A1A1A] rounded-full" />
								</div>
							</div>
							<div className="h-8 border-b border-[#F3F2EE] flex items-center px-3 gap-2">
								<div className="w-2 h-2 rounded-full bg-[#E5E5E5]" />
								<div className="flex-1 h-4 bg-[#F3F2EE] rounded-sm" />
							</div>
							<div className="flex-1 p-6 space-y-4 bg-white opacity-30">
								<div className="h-8 w-3/4 bg-[#1A1A1A]" />
								<div className="h-4 w-full bg-[#E5E5E5]" />
								<div className="h-4 w-5/6 bg-[#E5E5E5]" />
								<div className="grid grid-cols-2 gap-4 mt-8">
									<div className="h-32 bg-[#F3F2EE]" />
									<div className="h-32 bg-[#F3F2EE]" />
								</div>
							</div>

							{/* Widget Preview */}
							<div
								className={`absolute bottom-4 ${position === "right" ? "right-4" : "left-4"} flex flex-col items-end gap-4`}
							>
								<div className="w-[300px] h-[400px] bg-white border border-[#D1D1D1] shadow-xl flex flex-col overflow-hidden rounded-lg">
									<div
										className="flex items-center gap-3 px-4 h-14"
										style={{
											backgroundColor: headerColor,
											color: isLightColor(headerColor) ? "#1f2937" : "#ffffff",
										}}
									>
										{profilePicture ? (
											<Image
												src={profilePicture}
												alt="Avatar"
												width={32}
												height={32}
												className="object-cover w-8 h-8 rounded-full"
											/>
										) : (
											<div
												className="flex items-center justify-center w-8 h-8 text-xs font-bold rounded-full"
												style={{
													backgroundColor: isLightColor(headerColor)
														? "rgba(0,0,0,0.1)"
														: "rgba(255,255,255,0.2)",
												}}
											>
												AI
											</div>
										)}
										<div>
											<div className="text-sm font-bold leading-tight">{botName}</div>
											<div className="text-[10px] opacity-80 flex items-center gap-1">
												<div className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Online
											</div>
										</div>
									</div>
									<div className="flex-1 bg-[#FAFAF9] p-4 space-y-3">
										<div className="flex gap-2">
											<div className="w-6 h-6 bg-[#E5E5E5] rounded-full flex-shrink-0" />
											<div className="bg-white border border-[#E5E5E5] p-2 text-xs rounded-tr-lg rounded-br-lg rounded-bl-lg text-[#555] shadow-sm max-w-[80%]">
												Hello! How can I help you today?
											</div>
										</div>
										<div className="flex flex-row-reverse gap-2">
											<div
												className="p-2 text-xs rounded-tl-lg rounded-bl-lg rounded-br-lg text-white shadow-sm max-w-[80%]"
												style={{ backgroundColor: userMsgColor }}
											>
												I need to check my order status.
											</div>
										</div>
									</div>
									<div className="h-12 bg-white border-t border-[#F3F2EE] px-3 flex items-center justify-between text-[#888]">
										<span className="text-xs">Type a message...</span>
										<MousePointer2 size={14} />
									</div>
									<div className="h-6 bg-[#F3F2EE] flex items-center justify-center text-[8px] text-[#888] font-mono uppercase">
										{canRemoveBranding
											? form.watch("footerMessage") || "Powered by Ansa"
											: "Powered by Ansa"}
									</div>
								</div>

								{/* Floating Button */}
								<div
									className="flex items-center justify-center w-12 h-12 text-white transition-all shadow-lg"
									style={{
										backgroundColor: form.watch("widgetButtonColor") || headerColor,
										borderRadius:
											btnShape === "50%"
												? "9999px"
												: btnShape === "28px"
													? "28px"
													: btnShape === "12px"
														? "12px"
														: "0px",
									}}
								>
									{widgetIcon && widgetIconType === "emoji" ? (
										<span className="text-xl">{widgetIcon}</span>
									) : widgetIcon && (widgetIconType === "upload" || widgetIconType === "url") ? (
										<Image
											src={widgetIcon}
											alt="Icon"
											width={24}
											height={24}
											className="object-contain"
											unoptimized
										/>
									) : (
										<MessageSquare size={20} fill="currentColor" />
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</form>
		</Form>
	);
}
