"use client";

import { Cpu, Fingerprint, Globe2, Lock, Shield } from "lucide-react";

export function EnterpriseSection() {
	return (
		<section className="py-24 md:py-32 px-4 border-b border-[#D1D1D1] bg-background">
			<div className="max-w-[1600px] mx-auto">
				<div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
					<div className="lg:col-span-5">
						<div className="mb-6 inline-block px-3 py-1 bg-[#EAE9E5] border border-[#D1D1D1] rounded-full text-[10px] font-mono uppercase tracking-widest text-[#555]">
							Enterprise Grade
						</div>
						<h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8 leading-[1.1]">
							Security isn&apos;t a feature. <br /> It&apos;s the foundation.
						</h2>
						<p className="text-lg text-[#666] mb-12 max-w-md">
							We safeguard your customer data with banking-grade encryption, strict compliance, and
							granular access controls.
						</p>

						<div className="flex flex-col gap-4">
							<div className="flex items-center gap-4 p-4 border border-[#D1D1D1] bg-white">
								<Shield className="text-foreground" size={24} />
								<div>
									<div className="text-sm font-bold">Self-Hosted Deployment</div>
									<div className="text-xs text-[#888]">Complete data control</div>
								</div>
							</div>
							<div className="flex items-center gap-4 p-4 border border-[#D1D1D1] bg-white">
								<Lock className="text-foreground" size={24} />
								<div>
									<div className="text-sm font-bold">Advanced Security</div>
									<div className="text-xs text-[#888]">End-to-end encryption & RBAC</div>
								</div>
							</div>
						</div>
					</div>

					<div className="lg:col-span-7">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
							{[
								{
									title: "API Access",
									desc: "Full REST API for custom integrations.",
									icon: Cpu,
								},
								{
									title: "Self-Hosted Option",
									desc: "Deploy on your infrastructure.",
									icon: Globe2,
								},
								{
									title: "Role-Based Access",
									desc: "Granular permissions for teams.",
									icon: Lock,
								},
								{
									title: "Priority Support",
									desc: "Dedicated assistance for your team.",
									icon: Fingerprint,
								},
							].map((item, i) => (
								<div key={i} className="bg-[#F3F2EE] p-10 hover:bg-white transition-colors group">
									<item.icon
										className="mb-6 text-[#999] group-hover:text-foreground transition-colors"
										size={28}
										strokeWidth={1.5}
									/>
									<h3 className="mb-2 text-xl font-medium">{item.title}</h3>
									<p className="text-sm text-[#666]">{item.desc}</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
