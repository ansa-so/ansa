"use client";

import {
	ArrowRight,
	GalleryHorizontal,
	Grid3X3,
	RectangleHorizontal,
	Sparkles,
	Table,
	Type,
	Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

export function HeroSection() {
	const examples = [
		{
			baseUrl: "https://api.yourdomain.com/search?userId=",
			typedPart: "123&filter=all",
			detected: [
				{ name: "userId", type: "numeric_id" },
				{ name: "filter", type: "query" },
			],
			displayType: "grid",
			displayIcon: Grid3X3,
			fieldMappings: [
				{ field: "title", path: "data.results[].name" },
				{ field: "image", path: "data.results[].photo" },
				{ field: "price", path: "data.results[].price" },
			],
			toolName: "search_users",
		},
		{
			baseUrl: "https://api.yourdomain.com/property/",
			typedPart: "123",
			detected: [{ name: "property_id", type: "numeric_id" }],
			displayType: "card",
			displayIcon: RectangleHorizontal,
			fieldMappings: [
				{ field: "title", path: "property.name" },
				{ field: "image", path: "property.images[0]" },
				{ field: "price", path: "property.rate" },
			],
			toolName: "get_property",
		},
	];

	const [exampleIndex, setExampleIndex] = useState(0);
	const [step, setStep] = useState(0);
	const [typedChars, setTypedChars] = useState("");
	const [visibleMappings, setVisibleMappings] = useState(0);

	const current = examples[exampleIndex];

	useEffect(() => {
		const interval = setInterval(() => {
			setStep((s) => {
				if (s >= 5) {
					setExampleIndex((idx) => (idx + 1) % examples.length);
					return 0;
				}
				return s + 1;
			});
		}, 3500);
		return () => clearInterval(interval);
	}, [examples.length]);

	useEffect(() => {
		if (step === 0) {
			setTypedChars("");
			setVisibleMappings(0);
			const chars = current.typedPart;
			let i = 0;
			const typeInterval = setInterval(() => {
				if (i < chars.length) {
					const char = chars[i];
					setTypedChars((prev) => prev + char);
					i++;
				} else {
					clearInterval(typeInterval);
				}
			}, 100);
			return () => clearInterval(typeInterval);
		}
	}, [step, current.typedPart]);

	// Animate field mappings appearing one by one in step 3
	useEffect(() => {
		if (step === 3) {
			setVisibleMappings(0);
			let count = 0;
			const interval = setInterval(() => {
				count++;
				setVisibleMappings(count);
				if (count >= current.fieldMappings.length) {
					clearInterval(interval);
				}
			}, 400);
			return () => clearInterval(interval);
		}
	}, [step, current.fieldMappings.length]);

	return (
		<section className="mb-24 border-b border-[#D1D1D1] pb-24">
			<div className="grid items-center grid-cols-1 gap-16 lg:grid-cols-2">
				{/* Left: Copy */}
				<div>
					<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
						<Sparkles size={12} />
						<span>Auto-Discovery</span>
					</div>
					<h1 className="text-6xl md:text-8xl font-medium tracking-tight mb-8 leading-[0.9]">
						Connect your API <br />
						<span className="font-serif italic text-[#999]">in 60 seconds.</span>
					</h1>
					<p className="text-xl text-[#555] max-w-lg leading-relaxed mb-12">
						Paste a URL. We detect parameters automatically. Your AI agent gets a new tool
						instantly. No configuration required.
					</p>
					<div className="flex flex-col gap-4 sm:flex-row">
						<Link href="/tools/discover">
							<Button size="xl" variant="primary">
								Try It Now <ArrowRight size={16} className="ml-2" />
							</Button>
						</Link>
						<Link href="/signup">
							<Button size="xl" variant="outline">
								Create Free Account
							</Button>
						</Link>
					</div>
				</div>

				{/* Right: Animated Demo */}
				<div className="relative flex justify-center p-6 overflow-hidden rounded-2xl">
					{/* Background Image */}
					<Image src="/home/hero-bg.jpg" alt="" fill className="object-cover -z-10" priority />
					<div className="min-w-[580px] bg-white border border-[#D1D1D1] p-6 shadow-[12px_12px_0px_0px_rgba(26,26,26,0.05)] relative z-10 w-full max-w-md">
						{/* URL Input */}
						<div className="mb-6">
							<div className="text-[10px] font-mono uppercase text-[#888] mb-2">API URL</div>
							<div className="bg-[#1A1A1A] text-[#4ADE80] font-mono text-sm p-3 overflow-hidden whitespace-nowrap">
								{current.baseUrl}
								<span className="text-white">{typedChars}</span>
								<span className="animate-pulse">|</span>
							</div>
						</div>

						{/* Detection Animation */}
						<div
							className={`transition-all duration-500 ${step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
						>
							<div className="flex flex-wrap items-center gap-3 mb-4 p-3 border border-[#D1D1D1] bg-[#FAFAF9]">
								<Sparkles size={14} className="text-[#F59E0B]" />
								<span className="font-mono text-xs">Detected:</span>
								{current.detected.map((param) => (
									<div key={param.name} className="flex items-center gap-1.5">
										<code className="text-xs bg-[#F3F2EE] px-2 py-1 border border-[#D1D1D1]">
											{param.name}
										</code>
										<span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200">
											{param.type}
										</span>
									</div>
								))}
							</div>
						</div>

						{/* Step 2: Display Type Selection */}
						<div
							className={`transition-all duration-500 ${step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
						>
							<div className="text-[10px] font-mono uppercase text-[#888] mb-2">Display Type</div>
							<div className="flex gap-2 mb-4">
								{[
									{ value: "text", label: "Text", icon: Type },
									{ value: "card", label: "Card", icon: RectangleHorizontal },
									{ value: "carousel", label: "Carousel", icon: GalleryHorizontal },
									{ value: "grid", label: "Grid", icon: Grid3X3 },
									{ value: "table", label: "Table", icon: Table },
								].map(({ value, label, icon: Icon }) => (
									<div
										key={value}
										className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase border transition-colors ${
											current.displayType === value
												? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
												: "bg-white border-[#D1D1D1] text-[#888]"
										}`}
									>
										<Icon size={12} />
										{label}
									</div>
								))}
							</div>
						</div>

						{/* Step 3: Field Mappings */}
						<div
							className={`transition-all duration-500 ${step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
						>
							<div className="text-[10px] font-mono uppercase text-[#888] mb-2">Field Mappings</div>
							<div className="space-y-1.5 mb-4">
								{current.fieldMappings.map((mapping, idx) => (
									<div
										key={mapping.field}
										className={`flex items-center gap-2 p-2 border border-[#D1D1D1] bg-[#FAFAF9] transition-all duration-300 ${
											idx < visibleMappings
												? "opacity-100 translate-x-0"
												: "opacity-0 -translate-x-2"
										}`}
									>
										<span className="text-xs font-medium capitalize w-14">{mapping.field}</span>
										<span className="text-[#888]">→</span>
										<code className="text-[11px] bg-[#F3F2EE] px-2 py-0.5 border border-[#D1D1D1] text-[#555]">
											{mapping.path}
										</code>
									</div>
								))}
							</div>
						</div>

						{/* Step 4: Chat Preview */}
						<div
							className={`transition-all duration-500 ${step >= 4 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
						>
							<div className="text-[10px] font-mono uppercase text-[#888] mb-2">Chat Preview</div>
							<div className="border border-[#D1D1D1] bg-[#FAFAF9] p-3 mb-4">
								{/* Chat bubble from user */}
								<div className="flex justify-end mb-2.5">
									<div className="bg-[#1A1A1A] text-white text-xs px-3 py-1.5 rounded-2xl rounded-br-sm max-w-[70%]">
										{current.displayType === "grid" ? "Show me all users" : "Show property 123"}
									</div>
								</div>
								{/* Chat bubble from agent */}
								<div className="flex justify-start">
									<div className="max-w-[85%]">
										<div className="text-xs text-[#888] mb-1.5">Here's what I found:</div>
										{current.displayType === "grid" ? (
											<div className="grid grid-cols-2 gap-1.5">
												{["Alex Morgan", "Sam Chen"].map((name) => (
													<div key={name} className="bg-white border border-[#E5E5E5] p-2">
														<div className="w-full h-8 bg-gradient-to-br from-[#F3F2EE] to-[#E8E6E1] mb-1.5" />
														<div className="text-[10px] font-medium truncate">{name}</div>
														<div className="text-[9px] text-[#888]">$49/mo</div>
													</div>
												))}
											</div>
										) : (
											<div className="bg-white border border-[#E5E5E5] overflow-hidden">
												<div className="w-full h-16 bg-gradient-to-br from-[#F3F2EE] to-[#E8E6E1]" />
												<div className="p-2">
													<div className="text-[11px] font-medium">Oceanview Villa</div>
													<div className="text-[10px] text-[#888]">Malibu, CA</div>
													<div className="text-[11px] font-bold text-[#1A1A1A] mt-1">
														$320/night
													</div>
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Step 5: Success State */}
						<div
							className={`transition-all duration-500 ${step >= 5 ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
						>
							<div className="bg-[#4ADE80] text-white p-4 flex items-center gap-3">
								<div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
									<Zap size={16} />
								</div>
								<div>
									<div className="text-sm font-bold">Tool Created!</div>
									<div className="font-mono text-xs opacity-80">{current.toolName}</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
