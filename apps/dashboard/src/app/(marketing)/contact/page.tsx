"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { MarketingHeader } from "@/components/marketing-header";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { type Agent, listAgents } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { useConfig } from "@/lib/config-context";
import { getConfig } from "@/lib/runtime-config";

const API_BASE = getConfig().apiUrl || "http://localhost:3001";
const DASHBOARD_AGENT_ID = getConfig().dashboardAgentId;

const contactSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	agentId: z.string().optional(),
	subject: z.string().min(1, "Subject is required").max(200, "Subject is too long"),
	description: z
		.string()
		.min(10, "Description must be at least 10 characters")
		.max(5000, "Description is too long"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
	const { data: session, isPending } = useSession();
	const { widgetUrl } = useConfig();
	const searchParams = useSearchParams();
	const [agents, setAgents] = useState<Agent[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isAuthenticated = !!session;

	// Build iframe URL for support chat (only if DASHBOARD_AGENT_ID is set)
	// Widget will fetch settings from API using the agentId
	const iframeSrc = DASHBOARD_AGENT_ID
		? `${widgetUrl}/?mode=inline&v=tailwind4#config=${encodeURIComponent(
				JSON.stringify({
					agentId: DASHBOARD_AGENT_ID,
				}),
			)}`
		: null;

	const form = useForm<ContactFormData>({
		resolver: zodResolver(contactSchema),
		defaultValues: {
			email: "",
			agentId: "",
			subject: "",
			description: "",
		},
	});

	// Pre-populate email, subject from query params, and fetch agents when authenticated
	useEffect(() => {
		if (session?.user?.email) {
			form.setValue("email", session.user.email);
		}

		// Pre-fill subject from query parameter
		const subjectParam = searchParams.get("subject");
		if (subjectParam) {
			form.setValue("subject", decodeURIComponent(subjectParam));
		}

		if (session) {
			listAgents()
				.then((agentList) => {
					setAgents(agentList);
				})
				.catch((err) => {
					console.error("Failed to fetch agents:", err);
				});
		}
	}, [session, form, searchParams]);

	const onSubmit = async (data: ContactFormData) => {
		setIsSubmitting(true);
		try {
			const response = await fetch(`${API_BASE}/contact`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to send message");
			}

			toast.success("Message sent successfully! We'll get back to you soon.");
			form.reset({
				email: session?.user?.email || "",
				agentId: "",
				subject: "",
				description: "",
			});
		} catch (err) {
			console.error("Failed to send message:", err);
			toast.error(err instanceof Error ? err.message : "Failed to send message");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isPending) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const formContent = (
		<div className="max-w-4xl p-8 mx-auto lg:min-w-2xl">
			<div className="text-center">
				<h1 className="text-6xl md:text-8xl lg:text-[7rem] leading-[0.9] font-medium tracking-tight mb-8">
					Contact our <br />
					<span className="font-serif italic text-[#999]">Support</span> Team.
				</h1>
				<Text tag="p" size="subtitle" className="mx-auto">
					Have a question or need help?
					{iframeSrc
						? " Chat with our AI assistant or fill out the form below."
						: " Fill out the form below and we'll get back to you."}
				</Text>
			</div>

			{/* Chat Widget - only shown if DASHBOARD_AGENT_ID is set */}
			{iframeSrc && (
				<div className="mt-12 mb-12">
					<Title tag="h2" size="lg" className="mb-2 text-center">
						Chat with Ansa AI
					</Title>
					<Text className="mb-4 text-center text-muted-foreground">
						Get instant answers to common questions
					</Text>
					<iframe
						src={iframeSrc}
						width="100%"
						height="600"
						style={{ border: "none", borderRadius: "12px" }}
						allow="clipboard-write"
						title="Ansa Support Chat"
					/>
				</div>
			)}

			{/* Contact Form */}
			<div className="mt-20">
				<Title tag="h3" size="h3" className="mb-2 text-center">
					Send us a message
				</Title>
				<Text className="mb-4 text-center text-muted-foreground">
					For complex issues or account-related questions
				</Text>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="p-6 mt-10 space-y-6 bg-white">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											type="email"
											placeholder="your@email.com"
											readOnly={isAuthenticated}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{isAuthenticated && (
							<FormField
								control={form.control}
								name="agentId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Agent (optional)</FormLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select an agent if relevant..." />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="none">No specific agent</SelectItem>
												{agents.map((agent) => (
													<SelectItem key={agent.id} value={agent.id}>
														{agent.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<FormField
							control={form.control}
							name="subject"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Subject</FormLabel>
									<FormControl>
										<Input placeholder="What is your message about?" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Please describe your question or issue in detail..."
											className="min-h-[150px]"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex justify-end pt-4">
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? (
									<>
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										Sending...
									</>
								) : (
									<>
										<Send className="w-4 h-4 mr-2" />
										Send Message
									</>
								)}
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</div>
	);

	if (isAuthenticated) {
		return formContent;
	}

	return (
		<div className="bg-gradient-to-b from-background to-muted/20">
			<div className="pb-16">{formContent}</div>
		</div>
	);
}
