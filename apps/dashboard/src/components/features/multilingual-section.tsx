"use client";

import { Globe2, Languages, MessageSquareText } from "lucide-react";

export function MultilingualSection() {
	return (
		<section id="multilingual" className="scroll-mt-32">
			<div className="border-t border-[#1A1A1A] pt-4 mb-8 flex justify-between items-baseline">
				<h2 className="text-4xl font-medium md:text-5xl">Multi-Language</h2>
				<span className="font-mono text-xs text-[#888]">[09]</span>
			</div>

			<div className="bg-[#1A1A1A] text-[#F3F2EE] p-12 md:p-20 relative overflow-hidden">
				<div className="relative z-10 grid items-center grid-cols-1 gap-16 md:grid-cols-2">
					<div>
						<Globe2 className="w-16 h-16 text-[#444] mb-8" />
						<h3 className="mb-6 text-3xl font-light">Fluent in 50+ Languages.</h3>
						<p className="text-[#888] leading-relaxed mb-8">
							Stop hiring support agents for every timezone. Ansa automatically detects language and
							responds natively—preserving cultural nuance and tone.
						</p>
						<div className="grid grid-cols-3 gap-4 text-xs font-mono text-[#666]">
							<div className="border border-[#333] p-2 text-center">EN (US)</div>
							<div className="border border-[#333] p-2 text-center">ES (MX)</div>
							<div className="border border-[#333] p-2 text-center">FR (CA)</div>
							<div className="border border-[#333] p-2 text-center">JA (JP)</div>
							<div className="border border-[#333] p-2 text-center">DE (DE)</div>
							<div className="border border-[#333] p-2 text-center">PT (BR)</div>
						</div>
					</div>

					{/* Chat Translation Visual */}
					<div className="bg-[#0A0A0A] border border-[#333] p-6 font-mono text-xs space-y-6 shadow-2xl">
						<div>
							<div className="text-[#555] mb-1">USER (Spanish)</div>
							<div className="text-white bg-[#222] p-3 inline-block rounded-lg rounded-tl-none">
								&quot;¿Cómo puedo restablecer mi contraseña?&quot;
							</div>
						</div>
						<div className="text-right">
							<div className="text-[#555] mb-1">ANSA (Auto-Spanish)</div>
							<div className="text-foreground bg-white p-3 inline-block rounded-lg rounded-tr-none">
								&quot;Puedes restablecerla aquí: /reset. ¿Necesitas ayuda?&quot;
							</div>
						</div>
						<div className="border-t border-[#333] pt-4 flex justify-between text-[#444]">
							<span>LATENCY: 120ms</span>
							<span>ACCURACY: 99.8%</span>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border-x border-b border-[#D1D1D1]">
				{/* Feature Card: Per-Language Widget Messages */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<MessageSquareText size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Localized Widget Messages</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Customize every widget string per language. Welcome messages, placeholders, and
						buttons—all speak your customer&apos;s language.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-2">
						{[
							{ lang: "EN", message: "How can I help you today?" },
							{ lang: "ES", message: "¿En qué puedo ayudarte hoy?" },
							{ lang: "FR", message: "Comment puis-je vous aider?" },
							{ lang: "DE", message: "Wie kann ich Ihnen helfen?" },
						].map((item) => (
							<div
								key={item.lang}
								className="flex items-center justify-between text-sm p-2 hover:bg-[#F3F2EE] transition-colors"
							>
								<span className="font-mono text-xs text-[#888] w-8">{item.lang}</span>
								<span className="text-[#666] flex-1 text-right">{item.message}</span>
							</div>
						))}
					</div>
				</div>

				{/* Feature Card: RTL Support */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Languages size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">RTL Language Support</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Full support for right-to-left languages. Arabic, Hebrew, Persian—the widget
						automatically adapts layout and text direction.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4">
						<div className="flex gap-4 mb-4">
							{["AR", "HE", "FA", "UR"].map((lang) => (
								<div
									key={lang}
									className="px-3 py-1 border border-[#D1D1D1] text-xs font-mono bg-[#F3F2EE]"
								>
									{lang}
								</div>
							))}
						</div>
						<div className="border border-[#D1D1D1] p-3 text-right" dir="rtl">
							<div className="text-sm text-[#666] mb-2">مرحبا! كيف يمكنني مساعدتك؟</div>
							<div className="text-[10px] font-mono text-green-600">✓ RTL LAYOUT ACTIVE</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
