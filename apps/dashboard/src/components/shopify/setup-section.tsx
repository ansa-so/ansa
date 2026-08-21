import { Plus, ShoppingBag } from "lucide-react";

export function SetupSection() {
	const steps = [
		"Click 'Install' on the Shopify App Store.",
		"Ansa syncs your last 6 months of orders.",
		"AI trains on your Product Descriptions & Policy Pages.",
		"Go live.",
	];

	return (
		<section className="grid items-center grid-cols-1 gap-16 mb-32 lg:grid-cols-2">
			<div>
				<h2 className="mb-8 text-4xl font-light">
					Setup is <br /> automatic.
				</h2>
				<div className="space-y-4">
					{steps.map((step, i) => (
						<div
							key={i}
							className="flex items-center gap-4 p-6 border border-[#D1D1D1] bg-white group hover:border-[#1A1A1A] transition-colors"
						>
							<div className="w-8 h-8 bg-[#F3F2EE] text-foreground border border-[#D1D1D1] flex items-center justify-center font-mono text-xs group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
								0{i + 1}
							</div>
							<span className="text-sm font-medium">{step}</span>
						</div>
					))}
				</div>
			</div>

			<div className="bg-[#1A1A1A] p-12 md:p-24 text-[#F3F2EE] flex flex-col items-center justify-center text-center relative overflow-hidden">
				<div className="relative z-10">
					<div className="bg-[#95BF47] w-20 h-20 rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-2xl">
						<ShoppingBag size={40} className="text-white" strokeWidth={1.5} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Ready to upgrade?</h3>
					<p className="text-[#888] mb-8 max-w-sm mx-auto leading-relaxed">
						Join the highest converting brands on Shopify using Ansa to power their CX.
					</p>
					<a
						href="https://apps.shopify.com/ansa"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-2 px-8 py-4 mx-auto text-xs font-bold tracking-widest text-black uppercase transition-transform bg-white hover:scale-105"
					>
						<Plus size={14} /> Add Ansa to your store
					</a>
				</div>

				<div
					className="absolute inset-0 opacity-10"
					style={{
						backgroundImage:
							"linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)",
						backgroundSize: "40px 40px",
					}}
				/>
			</div>
		</section>
	);
}
