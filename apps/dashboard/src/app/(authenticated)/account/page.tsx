"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	AlertTriangle,
	Bell,
	Calendar,
	CheckCircle2,
	Clock,
	Fingerprint,
	Lock,
	Mail,
	RotateCcw,
	Save,
	Trash2,
	User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getUserPreferences, type UserPreferences, updateUserPreferences } from "@/lib/api";
import { authClient, useSession } from "@/lib/auth-client";
import { getConfig } from "@/lib/runtime-config";

const accountSchema = z.object({
	name: z.string().min(1, "Name is required"),
});

type AccountFormData = z.infer<typeof accountSchema>;

export default function AccountPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const [isDeleting, setIsDeleting] = useState(false);
	const [emailPrefs, setEmailPrefs] = useState<UserPreferences | null>(null);
	const [isSavingPrefs, setIsSavingPrefs] = useState(false);

	const form = useForm<AccountFormData>({
		resolver: zodResolver(accountSchema),
		defaultValues: {
			name: "",
		},
	});

	const { isDirty, isSubmitting } = form.formState;

	useEffect(() => {
		if (session?.user?.name) {
			form.reset({ name: session.user.name });
		}
	}, [session, form]);

	// Load email preferences
	useEffect(() => {
		getUserPreferences()
			.then(setEmailPrefs)
			.catch((err) => console.error("Failed to load email preferences:", err));
	}, []);

	const handleUpdateEmailPrefs = async (updates: Partial<UserPreferences>) => {
		if (!emailPrefs) return;

		setIsSavingPrefs(true);
		try {
			const updated = await updateUserPreferences(updates);
			setEmailPrefs(updated);
			toast.success("Email preferences updated");
		} catch (err) {
			console.error("Failed to update email preferences:", err);
			toast.error("Failed to update email preferences");
		} finally {
			setIsSavingPrefs(false);
		}
	};

	const onSubmit = async (data: AccountFormData) => {
		try {
			await authClient.updateUser({ name: data.name });
			toast.success("Account updated");
			form.reset({ name: data.name });
		} catch (err) {
			console.error("Failed to update account:", err);
			toast.error("Failed to update account");
		}
	};

	const handleDeleteAccount = async () => {
		setIsDeleting(true);
		try {
			const API_BASE = getConfig().apiUrl || "http://localhost:3001";
			const response = await fetch(`${API_BASE}/account`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Failed to delete account");
			}

			// Sign out after deletion
			await authClient.signOut();
			toast.success("Account deleted successfully");
			router.push("/login");
		} catch (err) {
			console.error("Failed to delete account:", err);
			toast.error("Failed to delete account");
			setIsDeleting(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#F3F2EE]">
			{/* Header */}
			<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
				<div>
					<h1 className="text-xl font-medium tracking-tight">Operator Profile</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
						<span className="flex items-center gap-1">
							<Fingerprint size={10} /> ID: {session?.user?.id?.slice(0, 8).toUpperCase() || "—"}
						</span>
						<span className="text-[#D1D1D1]">|</span>
						<span>Role: Administrator</span>
					</div>
				</div>

				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => form.reset()}
						disabled={!isDirty}
						className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<RotateCcw size={12} /> Revert
					</button>
					<button
						type="submit"
						form="account-form"
						disabled={isSubmitting || !isDirty}
						className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Save size={12} /> {isSubmitting ? "Saving..." : "Update Record"}
					</button>
				</div>
			</header>

			{/* Content Area */}
			<div className="w-full p-8 mx-auto space-y-8">
				<Form {...form}>
					<form id="account-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
						{/* Identity Credentials Section */}
						<Card variant="brutalist">
							<CardHeader variant="brutalist">
								<CardTitle icon={<User size={14} />}>Identity Credentials</CardTitle>
							</CardHeader>
							<CardContent className="pt-6">
								<div className="max-w-lg space-y-6">
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem className="group">
												<div className="flex justify-between items-end mb-1.5">
													<span className="text-[9px] font-mono uppercase text-[#888] group-focus-within:text-[#1A1A1A] transition-colors flex items-center gap-1">
														<User size={10} /> Operator Alias (Display Name)
													</span>
												</div>
												<div className="relative">
													<FormControl>
														<Input placeholder="Your name" {...field} />
													</FormControl>
												</div>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Email - Immutable */}
									<div className="group opacity-70">
										<div className="flex justify-between items-end mb-1.5">
											<span className="text-[9px] font-mono uppercase text-[#888] flex items-center gap-1">
												<Mail size={10} /> System Handle (Email)
											</span>
											<span className="text-[8px] font-mono uppercase bg-[#E5E5E5] px-1 text-[#555] flex items-center gap-1">
												<Lock size={8} /> Immutable
											</span>
										</div>
										<Input
											value={session?.user?.email || ""}
											disabled
											className="h-10 bg-[#F3F2EE] border-[#D1D1D1] px-3 text-xs font-mono text-[#888] cursor-not-allowed"
										/>
									</div>

									<div className="flex items-start gap-3 p-3 border border-blue-100 bg-blue-50">
										<Lock size={14} className="text-blue-600 mt-0.5" />
										<div>
											<div className="text-[9px] font-bold uppercase text-blue-800">
												Security Note
											</div>
											<p className="text-[10px] text-blue-700/80 leading-snug">
												Email addresses are immutable for security auditing. To transfer ownership,
												please contact support.
											</p>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</form>
				</Form>

				{/* Signal Configuration (Notifications) */}
				<Card variant="brutalist">
					<CardHeader variant="brutalist">
						<CardTitle icon={<Bell size={14} />}>Signal Configuration (Recap)</CardTitle>
					</CardHeader>
					<CardContent className="pt-6">
						{emailPrefs ? (
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								{/* Left Col: Timing */}
								<div className="space-y-4">
									<div>
										<label
											htmlFor="reportFrequency"
											className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block flex items-center gap-1"
										>
											<Calendar size={10} /> Report Frequency
										</label>
										<Select
											value={emailPrefs.recapFrequency}
											onValueChange={(value) =>
												handleUpdateEmailPrefs({
													recapFrequency: value as UserPreferences["recapFrequency"],
												})
											}
											disabled={isSavingPrefs}
										>
											<SelectTrigger
												id="reportFrequency"
												className="w-full h-10 bg-[#FAFAF9] border-[#D1D1D1] px-3 text-xs font-mono focus:border-[#1A1A1A]"
											>
												<SelectValue placeholder="Select frequency" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="none">None (Disabled)</SelectItem>
												<SelectItem value="daily">Daily Briefing</SelectItem>
												<SelectItem value="weekly">Weekly (Monday)</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{emailPrefs.recapFrequency !== "none" && (
										<div>
											<label
												htmlFor="deliveryWindow"
												className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block flex items-center gap-1"
											>
												<Clock size={10} /> Delivery Window
											</label>
											<Select
												value={emailPrefs.recapHour.toString()}
												onValueChange={(value) =>
													handleUpdateEmailPrefs({ recapHour: Number.parseInt(value, 10) })
												}
												disabled={isSavingPrefs}
											>
												<SelectTrigger
													id="deliveryWindow"
													className="w-full h-10 bg-[#FAFAF9] border-[#D1D1D1] px-3 text-xs font-mono focus:border-[#1A1A1A]"
												>
													<SelectValue placeholder="Select hour" />
												</SelectTrigger>
												<SelectContent>
													{Array.from({ length: 24 }, (_, i) => (
														<SelectItem key={`hour-${i}`} value={i.toString()}>
															{i === 0
																? "12:00 AM (UTC)"
																: i < 12
																	? `${i}:00 AM (UTC)`
																	: i === 12
																		? "12:00 PM (UTC)"
																		: `${i - 12}:00 PM (UTC)`}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									)}
								</div>

								{/* Right Col: Configuration Status */}
								{emailPrefs.recapFrequency !== "none" && (
									<div className="border border-[#E5E5E5] p-4 bg-[#FAFAF9] flex flex-col justify-between">
										<div>
											<div className="flex items-start justify-between mb-2">
												<div className="text-[10px] font-bold uppercase">Email Mode</div>
											</div>
											<p className="text-[10px] text-[#888] font-mono leading-relaxed">
												You will receive a separate email report for each agent.
											</p>
										</div>
										<div className="mt-4 flex items-center gap-1.5 text-[9px] font-mono uppercase text-green-700">
											<CheckCircle2 size={10} /> Configuration Valid
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="flex items-center justify-center py-8">
								<span className="text-[10px] font-mono uppercase text-[#888]">
									Loading preferences...
								</span>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Danger Zone */}
				<section className="relative flex flex-col items-center justify-between gap-6 p-6 overflow-hidden border border-red-200 bg-red-50/30 md:flex-row">
					{/* Warning stripes pattern */}
					<div className="absolute top-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,#fee2e2_10px,#fee2e2_20px)] opacity-50" />

					<div className="flex items-start gap-4">
						<div className="p-2 text-red-600 bg-white border border-red-100 rounded-sm">
							<AlertTriangle size={20} />
						</div>
						<div>
							<h3 className="mb-1 text-sm font-bold text-red-900 uppercase">
								Termination Protocol
							</h3>
							<p className="max-w-md text-xs leading-relaxed text-red-700/80">
								Execute immediate deletion of this operator account. This action will purge all
								associated logs, configurations, and billing data.{" "}
								<strong>This cannot be undone.</strong>
							</p>
						</div>
					</div>

					<AlertDialog>
						<AlertDialogTrigger asChild>
							<button
								type="button"
								disabled={isDeleting}
								className="bg-white border border-red-200 text-red-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
							>
								<Trash2 size={12} /> {isDeleting ? "Deleting..." : "Purge Record"}
							</button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
								<AlertDialogDescription asChild>
									<div className="space-y-2">
										<p>
											This action cannot be undone. This will permanently delete your account and
											remove all your data from our servers.
										</p>
										<p className="font-medium">
											If you have an active subscription, it will be cancelled immediately.
										</p>
									</div>
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleDeleteAccount}
									disabled={isDeleting}
									className="text-white bg-destructive hover:bg-destructive/90"
								>
									{isDeleting ? "Deleting..." : "Yes, delete my account"}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</section>
			</div>
		</div>
	);
}
