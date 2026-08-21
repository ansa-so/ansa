"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { Title } from "@/components/ui/title";
import { INSTRUCTIONS } from "@/lib/agent";
import { useAgents } from "@/lib/agent-context";
import { trackEvent } from "@/lib/analytics";
import { type AgentLimits, createAgent, getAgentLimits, listShopifyShops } from "@/lib/api";

const agentSchema = z.object({
	name: z.string().min(1, "Name is required"),
	aiQuality: z.enum(["balanced", "high_quality"]),
	temperature: z.number().min(0).max(100),
	systemPrompt: z.string().min(1, "System prompt is required"),
});

type AgentFormData = z.infer<typeof agentSchema>;

export default function NewAgentPage() {
	const router = useRouter();
	const { refetchAgents, setCurrentAgent } = useAgents();
	const [limits, setLimits] = useState<AgentLimits | null>(null);
	const [loading, setLoading] = useState(true);
	const [selectedInstruction, setSelectedInstruction] = useState("");

	const form = useForm<AgentFormData>({
		resolver: zodResolver(agentSchema),
		defaultValues: {
			name: "",
			aiQuality: "balanced",
			temperature: 50,
			systemPrompt: "You are a helpful assistant.",
		},
	});

	const temperature = form.watch("temperature");
	const aiQuality = form.watch("aiQuality");

	const fetchData = useCallback(async () => {
		try {
			const limitsData = await getAgentLimits();
			setLimits(limitsData);
		} catch (err) {
			console.error("Failed to fetch data:", err);
			toast.error("Failed to load settings");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const onSubmit = async (data: AgentFormData) => {
		try {
			const newAgent = await createAgent({
				...data,
				isDefault: false,
			});
			trackEvent("agent_created", {
				agentId: newAgent.id,
				agentName: newAgent.name,
				viaOnboarding: false,
			});
			await refetchAgents();
			setCurrentAgent(newAgent);
			toast.success("Agent created successfully");
			router.push("/chat");
		} catch (err) {
			console.error("Failed to create agent:", err);
			const message = err instanceof Error ? err.message : "Failed to create agent";
			toast.error(message);
		}
	};

	if (loading) {
		return <Text className="text-gray-500">Loading...</Text>;
	}

	if (limits && !limits.canCreate) {
		const handleUpgrade = async () => {
			if (limits.billingProvider === "shopify") {
				// Shopify users manage plans via Shopify admin Managed Pricing
				try {
					const shops = await listShopifyShops();
					const shopDomain = shops[0]?.shopDomain;
					const shopHandle = shopDomain?.replace(".myshopify.com", "");
					if (shopHandle) {
						window.open(
							`https://admin.shopify.com/store/${shopHandle}/charges/vela-ai/pricing_plans`,
							"_top",
						);
						return;
					}
				} catch {
					// fall through to billing page
				}
				router.push("/billing");
			} else {
				router.push("/billing");
			}
		};

		return (
			<>
				<Button variant="ghost" className="mb-4 -ml-3 w-fit" onClick={() => router.back()}>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back
				</Button>

				<Title tag="h1" size="4xl" className="mb-6">
					Agent Limit Reached
				</Title>

				<div className="p-6 border rounded-lg bg-amber-50 border-amber-200">
					<Text className="mb-4 text-amber-800">
						You've reached your limit of {limits.limit} agent
						{limits.limit === 1 ? "" : "s"} on your current plan.
					</Text>
					<Text className="mb-6 text-amber-700">
						{limits.billingProvider === "shopify"
							? "Upgrade your plan to create more agents. You'll be redirected to Shopify to approve the plan change."
							: "Upgrade your plan to create more agents."}
					</Text>
					<Button onClick={handleUpgrade}>
						{limits.billingProvider === "shopify" ? "Upgrade via Shopify" : "Upgrade Plan"}
					</Button>
				</div>
			</>
		);
	}

	return (
		<div className="p-8">
			<Button variant="ghost" className="mb-4 -ml-3 w-fit" onClick={() => router.back()}>
				<ArrowLeft className="w-4 h-4 mr-2" />
				Back
			</Button>

			<PageHeader
				title="Create New Agent"
				description="Set up a new AI agent for your conversations"
			/>

			{limits && limits.limit !== null && limits.limit !== -1 && (
				<Text size="sm" className="mb-6">
					{limits.current}/{limits.limit} agents used
				</Text>
			)}

			<Form {...form}>
				<form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input placeholder="My Assistant" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="aiQuality"
						render={({ field }) => (
							<FormItem className="space-y-3">
								<FormLabel>AI Quality</FormLabel>
								<FormControl>
									<RadioGroup
										onValueChange={field.onChange}
										value={field.value}
										className="flex flex-col space-y-2"
									>
										<div className="flex items-center space-x-3 space-y-0">
											<RadioGroupItem value="balanced" id="balanced" />
											<Label
												htmlFor="balanced"
												className="font-normal cursor-pointer flex items-center gap-2"
											>
												Balanced{" "}
												<Badge variant="secondary" className="text-xs">
													Recommended
												</Badge>
											</Label>
										</div>
										<div className="flex items-center space-x-3 space-y-0">
											<RadioGroupItem
												value="high_quality"
												id="high_quality"
												disabled={limits?.planId === "free" || limits?.planId === "starter"}
											/>
											<Label
												htmlFor="high_quality"
												className={`font-normal cursor-pointer flex items-center gap-2 ${
													limits?.planId === "free" || limits?.planId === "starter"
														? "text-muted-foreground"
														: ""
												}`}
											>
												High Quality{" "}
												{(limits?.planId === "free" || limits?.planId === "starter") && (
													<Badge variant="outline" className="text-xs">
														Pro
													</Badge>
												)}
											</Label>
										</div>
									</RadioGroup>
								</FormControl>
								<Text size="xs" className="text-muted-foreground">
									Balanced is optimized for accuracy, speed, and cost. High Quality improves
									reliability for complex answers.
								</Text>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Field>
						<FieldLabel htmlFor="temperature">
							Temperature: {temperature / 100} (
							{temperature < 30 ? "Precise" : temperature > 70 ? "Creative" : "Balanced"})
						</FieldLabel>
						<Text size="xs" className="mb-2">
							Controls how predictable your agent's responses are. Lower values give consistent,
							focused answers. Higher values make responses more varied and creative.
						</Text>
						<FormField
							control={form.control}
							name="temperature"
							render={({ field }) => (
								<input
									id="temperature"
									type="range"
									min="0"
									max="100"
									{...field}
									onChange={(e) => field.onChange(Number(e.target.value))}
									className="w-full"
								/>
							)}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="instructionTemplate">Instruction Template</FieldLabel>
						<Select
							value={selectedInstruction}
							onValueChange={(value) => {
								setSelectedInstruction(value);
								const instruction = INSTRUCTIONS.find((i) => i.name === value);
								if (instruction) {
									form.setValue("systemPrompt", instruction.content);
								}
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select an instruction template..." />
							</SelectTrigger>
							<SelectContent>
								{INSTRUCTIONS.map((instruction) => (
									<SelectItem key={instruction.name} value={instruction.name}>
										{instruction.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldDescription>
							Choose a template to quickly populate the system prompt
						</FieldDescription>
					</Field>

					<FormField
						control={form.control}
						name="systemPrompt"
						render={({ field }) => (
							<FormItem>
								<FormLabel>System Prompt (Instructions)</FormLabel>
								<FormControl>
									<Textarea
										placeholder="You are a helpful assistant..."
										className="min-h-[150px]"
										{...field}
										onChange={(e) => {
											field.onChange(e);
											setSelectedInstruction("");
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="flex justify-end gap-4 pt-4">
						<Button type="button" variant="outline" onClick={() => router.back()}>
							Cancel
						</Button>
						<Button type="submit" disabled={form.formState.isSubmitting}>
							{form.formState.isSubmitting ? "Creating..." : "Create Agent"}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
}
