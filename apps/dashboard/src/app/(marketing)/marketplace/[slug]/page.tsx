"use client";

import {
	ArrowLeft,
	BookOpen,
	Calculator,
	CheckCircle2,
	ClipboardList,
	CloudSun,
	Coins,
	Download,
	ExternalLink,
	Link,
	Mail,
	Package,
	Search,
	Wrench,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FormPreview } from "@/components/form-preview";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAgent } from "@/lib/agent-context";
import {
	type Agent,
	getMarketplaceTool,
	installMarketplaceTool,
	listAgents,
	type ToolTemplateDetail,
} from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { formatCount } from "@/lib/utils";

// Map icon names to Lucide components
const iconMap: Record<string, React.ReactNode> = {
	search: <Search className="w-8 h-8" />,
	"cloud-sun": <CloudSun className="w-8 h-8" />,
	calculator: <Calculator className="w-8 h-8" />,
	"book-open": <BookOpen className="w-8 h-8" />,
	link: <Link className="w-8 h-8" />,
	coins: <Coins className="w-8 h-8" />,
	package: <Package className="w-8 h-8" />,
	mail: <Mail className="w-8 h-8" />,
	wrench: <Wrench className="w-8 h-8" />,
	"clipboard-list": <ClipboardList className="w-8 h-8" />,
};

// Category display names and colors
const categoryInfo: Record<string, { label: string; color: string }> = {
	search: { label: "Search", color: "bg-blue-100 text-blue-800" },
	data: { label: "Data", color: "bg-green-100 text-green-800" },
	productivity: { label: "Productivity", color: "bg-purple-100 text-purple-800" },
	communication: { label: "Communication", color: "bg-orange-100 text-orange-800" },
	ecommerce: { label: "E-commerce", color: "bg-pink-100 text-pink-800" },
	forms: { label: "Forms", color: "bg-indigo-100 text-indigo-800" },
};

export default function ToolDetailPage() {
	const params = useParams();
	const router = useRouter();
	const slug = params.slug as string;
	const { currentAgent } = useAgent();

	const [tool, setTool] = useState<ToolTemplateDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [showInstallDialog, setShowInstallDialog] = useState(false);
	const [agents, setAgents] = useState<Agent[]>([]);
	const [selectedAgentId, setSelectedAgentId] = useState<string>("");
	const [configValues, setConfigValues] = useState<Record<string, string>>({});
	const [installing, setInstalling] = useState(false);
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

	useEffect(() => {
		async function fetchTool() {
			try {
				const data = await getMarketplaceTool(slug);
				setTool(data);
			} catch (err) {
				console.error("Failed to fetch tool:", err);
			} finally {
				setLoading(false);
			}
		}
		fetchTool();
	}, [slug]);

	useEffect(() => {
		async function checkAuth() {
			const session = await authClient.getSession();
			setIsAuthenticated(!!session?.data?.user);
		}
		checkAuth();
	}, []);

	const fetchAgents = useCallback(async () => {
		try {
			const data = await listAgents();
			setAgents(data);
			if (currentAgent) {
				setSelectedAgentId(currentAgent.id);
			} else if (data.length > 0) {
				setSelectedAgentId(data[0].id);
			}
		} catch (err) {
			console.error("Failed to fetch agents:", err);
		}
	}, [currentAgent]);

	const handleInstallClick = async () => {
		if (!isAuthenticated) {
			router.push(`/login?redirect=/marketplace/${slug}`);
			return;
		}
		await fetchAgents();
		setShowInstallDialog(true);
	};

	const handleInstall = async () => {
		if (!selectedAgentId || !tool) return;

		setInstalling(true);
		try {
			await installMarketplaceTool(tool.slug, selectedAgentId, configValues);
			toast.success(`${tool.name} installed successfully!`);
			setShowInstallDialog(false);
			router.push("/tools");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to install tool");
		} finally {
			setInstalling(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[#F3F2EE] text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
				<div className="container px-4 py-12 pt-24 mx-auto">
					<div className="font-mono text-xs tracking-widest text-center uppercase">Loading...</div>
				</div>
			</div>
		);
	}

	if (!tool) {
		return (
			<div className="min-h-screen bg-[#F3F2EE] text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
				<div className="container px-4 py-12 pt-24 mx-auto">
					<div className="font-mono text-xs tracking-widest text-center uppercase">
						Tool not found
					</div>
				</div>
			</div>
		);
	}

	const icon = iconMap[tool.icon] || <Wrench className="w-8 h-8" />;
	const category = categoryInfo[tool.category] || {
		label: tool.category,
		color: "bg-gray-100 text-gray-800",
	};

	return (
		<div className="">
			{/* Header */}
			<div className="border-b border-[#D1D1D1] pb-12">
				<div className="container px-4 md:px-8 mx-auto max-w-[1800px]">
					<button
						type="button"
						onClick={() => router.back()}
						className="mb-8 flex items-center gap-2 text-xs font-mono uppercase tracking-widest hover:bg-[#1A1A1A] hover:text-white transition-colors px-4 py-2 border border-[#D1D1D1]"
					>
						<ArrowLeft className="w-4 h-4" />
						Back to Marketplace
					</button>

					<div className="flex flex-col items-start gap-8 lg:flex-row">
						<div className="p-6 bg-white border border-[#D1D1D1] w-20 h-20 flex items-center justify-center shrink-0">
							{icon}
						</div>
						<div className="flex-1">
							<div className="flex flex-wrap items-center gap-3 mb-4">
								<h1 className="text-4xl font-medium tracking-tight md:text-6xl">{tool.name}</h1>
								<span className="px-3 py-1 text-xs font-mono uppercase tracking-widest border border-[#D1D1D1] bg-white">
									{category.label}
								</span>
								{!tool.isFree && (
									<span className="px-3 py-1 text-xs font-mono uppercase tracking-widest border border-[#D1D1D1] bg-white">
										API Key Required
									</span>
								)}
							</div>
							{tool.installCount > 0 && (
								<div className="flex items-center gap-2 mb-6 text-xs font-mono uppercase tracking-widest text-[#666]">
									<Download className="w-4 h-4" />
									<span>{formatCount(tool.installCount)} Installs</span>
								</div>
							)}
							<p className="text-xl text-[#555] leading-relaxed max-w-2xl">{tool.description}</p>
						</div>
						<button
							type="button"
							onClick={handleInstallClick}
							className="bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors whitespace-nowrap"
						>
							{isAuthenticated ? "Install Tool" : "Sign in to Install"}
						</button>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="container px-4 md:px-8 mx-auto max-w-[1800px] py-16">
				<div className="grid gap-16 lg:grid-cols-3">
					{/* Left Column - Details */}
					<div className="space-y-16 lg:col-span-2">
						{tool.longDescription && (
							<div className="bg-white border border-[#D1D1D1] p-10">
								<h2 className="text-xs font-mono uppercase tracking-widest text-[#555] mb-6">
									About this Tool
								</h2>
								<p className="text-[#666] leading-relaxed whitespace-pre-wrap">
									{tool.longDescription}
								</p>
							</div>
						)}

						{tool.executionType === "form" && tool.formSchema && (
							<div className="bg-white border border-[#D1D1D1] p-10">
								<h2 className="text-xs font-mono uppercase tracking-widest text-[#555] mb-2">
									Form Preview
								</h2>
								<p className="text-xs text-[#888] mb-6">Interactive preview — submit is disabled</p>
								<FormPreview schema={tool.formSchema} />
							</div>
						)}

						<div className="bg-white border border-[#D1D1D1] p-10">
							<h2 className="text-xs font-mono uppercase tracking-widest text-[#555] mb-2">
								Tool Function
							</h2>
							<p className="text-xs text-[#888] mb-6">This is how the AI will call this tool</p>
							<div className="bg-[#1A1A1A] text-[#F3F2EE] p-6 font-mono text-sm">
								<div className="text-blue-400">{tool.toolName}(</div>
								<div className="pl-4">
									{Object.entries(tool.inputSchema.properties).map(([key, prop]) => (
										<div key={key} className="flex gap-2">
											<span className="text-purple-400">{key}</span>
											<span className="text-[#666]">:</span>
											<span className="text-green-400">{prop.type}</span>
											{tool.inputSchema.required?.includes(key) && (
												<span className="text-xs text-red-400">(required)</span>
											)}
											{prop.description && (
												<span className="ml-2 text-[#888]">{`// ${prop.description}`}</span>
											)}
										</div>
									))}
								</div>
								<div className="text-blue-400">)</div>
							</div>
						</div>
					</div>

					{/* Right Column - Configuration */}
					<div className="space-y-16">
						<div className="bg-white border border-[#D1D1D1] p-10">
							<h2 className="text-xs font-mono uppercase tracking-widest text-[#555] mb-2">
								Configuration
							</h2>
							<p className="text-xs text-[#888] mb-6">Settings required to use this tool</p>
							{tool.requiredConfig && tool.requiredConfig.length > 0 ? (
								<ul className="space-y-6">
									{tool.requiredConfig.map((config) => (
										<li key={config.key} className="flex items-start gap-3">
											<CheckCircle2 className="w-4 h-4 mt-1 text-foreground shrink-0" />
											<div>
												<div className="mb-1 font-medium">{config.label}</div>
												{config.helpText && (
													<div className="text-sm text-[#666] mb-2">{config.helpText}</div>
												)}
												{config.helpUrl && (
													<a
														href={config.helpUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest hover:bg-[#1A1A1A] hover:text-white transition-colors px-2 py-1 border border-[#D1D1D1]"
													>
														Get API Key <ExternalLink className="w-3 h-3" />
													</a>
												)}
											</div>
										</li>
									))}
								</ul>
							) : (
								<div className="text-sm text-[#666]">
									No configuration required. This tool works out of the box!
								</div>
							)}
						</div>

						<div className="bg-white border border-[#D1D1D1] p-10">
							<h2 className="text-xs font-mono uppercase tracking-widest text-[#555] mb-6">
								Technical Details
							</h2>
							<div className="space-y-4 text-sm">
								<div className="flex justify-between border-b border-[#D1D1D1] pb-3">
									<span className="text-[#888] font-mono text-xs uppercase tracking-widest">
										Type
									</span>
									<span className="font-mono">{tool.executionType}</span>
								</div>
								{tool.httpMethod && (
									<div className="flex justify-between border-b border-[#D1D1D1] pb-3">
										<span className="text-[#888] font-mono text-xs uppercase tracking-widest">
											HTTP Method
										</span>
										<span className="font-mono">{tool.httpMethod}</span>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Install Dialog */}
			<Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Install {tool.name}</DialogTitle>
						<DialogDescription>
							Configure the tool and select which agent to install it on.
						</DialogDescription>
					</DialogHeader>

					<div className="py-4 space-y-6">
						{/* Agent Selection */}
						<div className="space-y-2">
							<Label className="font-mono text-xs tracking-widest uppercase">Select Agent</Label>
							<Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
								<SelectTrigger className="border-[#D1D1D1]">
									<SelectValue placeholder="Select an agent" />
								</SelectTrigger>
								<SelectContent>
									{agents.map((agent) => (
										<SelectItem key={agent.id} value={agent.id}>
											{agent.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Configuration Fields */}
						{tool.requiredConfig?.map((config) => (
							<div key={config.key} className="space-y-2">
								<Label htmlFor={config.key} className="font-mono text-xs tracking-widest uppercase">
									{config.label}
									{config.helpUrl && (
										<a
											href={config.helpUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="ml-2 text-xs hover:underline"
										>
											Get one <ExternalLink className="inline w-3 h-3" />
										</a>
									)}
								</Label>
								<Input
									id={config.key}
									type={config.type === "password" ? "password" : "text"}
									placeholder={config.placeholder}
									value={configValues[config.key] || ""}
									onChange={(e) =>
										setConfigValues((prev) => ({ ...prev, [config.key]: e.target.value }))
									}
									className="border-[#D1D1D1]"
								/>
								{config.helpText && <p className="text-xs text-[#888]">{config.helpText}</p>}
							</div>
						))}
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowInstallDialog(false)}
							className="border-[#D1D1D1]"
						>
							Cancel
						</Button>
						<Button
							onClick={handleInstall}
							disabled={installing || !selectedAgentId}
							className="bg-[#1A1A1A] text-white hover:bg-[#333] text-xs font-bold uppercase tracking-widest"
						>
							{installing ? "Installing..." : "Install"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
