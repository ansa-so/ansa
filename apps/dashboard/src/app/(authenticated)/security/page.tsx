"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { Title } from "@/components/ui/title";
import { useAgent } from "@/lib/agent-context";
import { getSecuritySettings, updateSecuritySettings } from "@/lib/api";

const settingsSchema = z.object({
	messageLimit: z.number().int().min(1).max(10000),
	messageLimitWindow: z.number().int().min(1).max(86400),
	allowedDomains: z.array(z.object({ value: z.string().max(255) })),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const WINDOW_PRESETS = [
	{ label: "1 minute", value: 60 },
	{ label: "5 minutes", value: 300 },
	{ label: "15 minutes", value: 900 },
	{ label: "1 hour", value: 3600 },
	{ label: "24 hours", value: 86400 },
];

export default function SecuritySettingsPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [loading, setLoading] = useState(true);

	const form = useForm<SettingsFormData>({
		resolver: zodResolver(settingsSchema),
		defaultValues: {
			messageLimit: 20,
			messageLimitWindow: 60,
			allowedDomains: [],
		},
	});

	const {
		fields: domainFields,
		append: appendDomain,
		remove: removeDomain,
	} = useFieldArray({
		control: form.control,
		name: "allowedDomains",
	});

	const fetchSettings = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const settings = await getSecuritySettings(currentAgent.id);
			form.reset({
				messageLimit: settings.messageLimit,
				messageLimitWindow: settings.messageLimitWindow,
				allowedDomains: (settings.allowedDomains || []).map((d) => ({ value: d })),
			});
		} catch (err) {
			console.error("Failed to fetch settings:", err);
			toast.error("Failed to load security settings");
		} finally {
			setLoading(false);
		}
	}, [form, currentAgent]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			fetchSettings();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchSettings]);

	const onSubmit = async (data: SettingsFormData) => {
		if (!currentAgent) return;
		try {
			await updateSecuritySettings(currentAgent.id, {
				messageLimit: data.messageLimit,
				messageLimitWindow: data.messageLimitWindow,
				allowedDomains: data.allowedDomains.map((d) => d.value).filter((v) => v.trim()),
			});
			toast.success("Security settings saved");
		} catch (err) {
			console.error("Failed to save settings:", err);
			toast.error("Failed to save settings");
		}
	};

	if (loading) {
		return <Text className="text-gray-500">Loading...</Text>;
	}

	return (
		<>
			<PageHeader
				title="Security Settings"
				description="Configure rate limiting and domain restrictions for your widget"
			/>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
					{/* Rate Limiting Section */}
					<div className="p-6 space-y-6 border rounded-lg">
						<Title tag="h2" size="2xl">
							Rate Limiting
						</Title>
						<Text size="sm">
							Limit how many messages a user can send within a time window to prevent abuse.
						</Text>

						<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
							<FormField
								control={form.control}
								name="messageLimit"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Message Limit</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={1}
												max={10000}
												{...field}
												onChange={(e) => field.onChange(Number(e.target.value))}
											/>
										</FormControl>
										<FormDescription>Max messages per time window</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="messageLimitWindow"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Time Window</FormLabel>
										<Select
											onValueChange={(v) => field.onChange(Number(v))}
											value={String(field.value)}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select time window" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{WINDOW_PRESETS.map((preset) => (
													<SelectItem key={preset.value} value={String(preset.value)}>
														{preset.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormDescription>Time period for rate limit</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Allowed Domains Section */}
					<div className="p-6 space-y-6 border rounded-lg">
						<Title tag="h2" size="2xl">
							Allowed Domains
						</Title>
						<Text size="sm">
							Restrict which websites can use your chat widget. Leave empty to allow all domains.
						</Text>

						<div className="space-y-3">
							<Label className="block">Domains</Label>
							{domainFields.map((field, index) => (
								<div key={field.id} className="flex gap-2">
									<FormField
										control={form.control}
										name={`allowedDomains.${index}.value`}
										render={({ field }) => (
											<FormItem className="flex-1">
												<FormControl>
													<Input placeholder="https://example.com" {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<Button
										type="button"
										variant="outline"
										size="icon"
										onClick={() => removeDomain(index)}
									>
										<Trash2 className="w-4 h-4" />
									</Button>
								</div>
							))}
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => appendDomain({ value: "" })}
							>
								<Plus className="w-4 h-4 mr-2" />
								Add Domain
							</Button>
						</div>
					</div>

					<div className="flex justify-end">
						<Button type="submit" disabled={form.formState.isSubmitting}>
							{form.formState.isSubmitting ? "Saving..." : "Save Settings"}
						</Button>
					</div>
				</form>
			</Form>
		</>
	);
}
