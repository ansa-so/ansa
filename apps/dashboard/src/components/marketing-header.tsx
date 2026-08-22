"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoIcon } from "@/components/logo-icon";
import { useSession } from "@/lib/auth-client";
import { useConfig } from "@/lib/config-context";

// Solutions dropdown is hidden
// const solutions = [
//   {
//     title: "Customer Support",
//     description: "24/7 AI support that resolves tickets instantly",
//     href: "/solutions/customer-support",
//     icon: Headphones,
//   },
//   {
//     title: "Sales",
//     description: "Qualify leads and book demos automatically",
//     href: "/solutions/sales",
//     icon: Calendar,
//   },
//   {
//     title: "E-commerce",
//     description: "Product recommendations and order assistance",
//     href: "/solutions/ecommerce",
//     icon: ShoppingCart,
//   },
//   {
//     title: "Lead Generation",
//     description: "Capture and qualify leads with smart conversations",
//     href: "/solutions/lead-generation",
//     icon: Bot,
//   },
//   {
//     title: "Documentation",
//     description: "Help users navigate your docs and APIs",
//     href: "/solutions/documentation",
//     icon: FileText,
//   },
//   {
//     title: "Internal Tools",
//     description: "Streamline team workflows and automation",
//     href: "/solutions/internal-tools",
//     icon: Users,
//   },
// ];

interface MarketingHeaderProps {
	/** The currently active page for highlighting the nav link */
	activePage?:
		| "features"
		| "pricing"
		| "marketplace"
		| "shopify"
		| "docs"
		| "developers"
		| "solutions"
		| "enterprise"
		| "tools";
}

export function MarketingHeader({ activePage }: MarketingHeaderProps) {
	const { isSelfHosted, docsUrl } = useConfig();
	const { data: session } = useSession();
	const pathname = usePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const isPathActive = (href: string) =>
		href.startsWith("/") && (pathname === href || pathname?.startsWith(`${href}/`));
	// const [solutionsOpen, setSolutionsOpen] = useState(false); // Hidden with Solutions dropdown

	const navItems = [
		{ label: "Features", href: "/features", active: activePage === "features" },
		// { label: "Solutions", href: "#", active: activePage === "solutions", hasDropdown: true },
		{ label: "Pricing", href: "/pricing", active: activePage === "pricing" },
		{ label: "Developers", href: "/developers", active: activePage === "developers" },
		{ label: "Marketplace", href: "/marketplace", active: activePage === "marketplace" },
		{ label: "Shopify", href: "/shopify", active: activePage === "shopify" },
		{ label: "Tools", href: "/free-tools", active: activePage === "tools" },
		{ label: "Docs", href: docsUrl, active: activePage === "docs", external: true },
	];

	return (
		<nav className="fixed top-0 w-full z-40 bg-background/90 backdrop-blur-sm border-b border-[#D1D1D1]">
			<div className="flex items-center justify-between h-16 px-4 md:px-8">
				{/* Logo */}
				<Link href="/" className="group">
					<LogoIcon size="md" />
				</Link>

				{/* Mobile hamburger */}
				<button
					type="button"
					className="flex items-center justify-center w-10 h-10 ml-auto md:hidden hover:bg-[#1A1A1A]/10 transition-colors rounded"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					aria-label="Toggle menu"
				>
					{mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
				</button>

				{/* Desktop navigation */}
				<div className="hidden md:flex items-center divide-x divide-[#D1D1D1] border-x border-[#D1D1D1] h-full">
					{navItems.map((item) => {
						// Solutions dropdown is hidden
						// if (item.hasDropdown) {
						//   return (
						//     <div key={item.label} className="relative flex items-center h-full group">
						//       <button
						//         type="button"
						//         className="h-full px-6 py-5 text-xs font-mono uppercase tracking-widest hover:bg-[#1A1A1A] hover:text-white transition-colors flex items-center gap-1"
						//         onMouseEnter={() => setSolutionsOpen(true)}
						//         onMouseLeave={() => setSolutionsOpen(false)}
						//       >
						//         {item.label}
						//         <ChevronDown size={12} />
						//       </button>
						//       {solutionsOpen && (
						//         <div
						//           className="absolute left-0 top-full w-[500px] bg-white border border-[#D1D1D1] shadow-lg z-50"
						//           onMouseEnter={() => setSolutionsOpen(true)}
						//           onMouseLeave={() => setSolutionsOpen(false)}
						//         >
						//           <div className="p-4">
						//             <div className="px-3 mb-3 text-xs font-mono uppercase tracking-widest text-[#666]">
						//               By Use Case
						//             </div>
						//             <div className="grid grid-cols-2 gap-1">
						//               {solutions.map((solution) => {
						//                 const Icon = solution.icon;
						//                 return (
						//                   <Link
						//                     key={solution.title}
						//                     href={solution.href}
						//                     className="flex items-start gap-3 p-3 hover:bg-[#F3F2EE] transition-colors border border-transparent hover:border-[#D1D1D1]"
						//                   >
						//                     <Icon className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
						//                     <div>
						//                       <div className="text-sm font-bold text-foreground">
						//                         {solution.title}
						//                       </div>
						//                       <div className="text-xs text-[#666] mt-0.5">
						//                         {solution.description}
						//                       </div>
						//                     </div>
						//                   </Link>
						//                 );
						//               })}
						//             </div>
						//           </div>
						//         </div>
						//       )}
						//     </div>
						//   );
						// }

						const isActive = item.active || isPathActive(item.href);
						return (
							<Link
								key={item.label}
								href={item.href}
								className={`h-full flex items-center px-6 py-5 text-xs font-mono uppercase tracking-widest transition-colors ${
									isActive ? "bg-primary text-white" : "hover:bg-[#1A1A1A] hover:text-white"
								}`}
								{...(item.external && { target: "_blank", rel: "noopener noreferrer" })}
							>
								{item.label}
							</Link>
						);
					})}
				</div>

				{/* Right side CTA */}
				<div className="items-center hidden gap-3 md:flex">
					<Link
						href="/contact"
						className="text-xs font-mono uppercase tracking-widest hover:text-[#666] transition-colors h-full"
					>
						Support
					</Link>
					{session?.user ? (
						<Link
							href="/dashboard"
							className="text-xs font-bold uppercase tracking-widest border border-[#1A1A1A] px-5 py-2 rounded-full hover:bg-[#1A1A1A] hover:text-white transition-all"
						>
							Dashboard
						</Link>
					) : (
						<>
							<Link
								href="/login"
								className="text-xs font-mono uppercase tracking-widest hover:text-[#666] transition-colors"
							>
								Log in
							</Link>
							<Link
								href="/signup"
								className="text-xs font-bold uppercase tracking-widest border border-[#1A1A1A] px-5 py-2 rounded-full hover:bg-[#1A1A1A] hover:text-white transition-all"
							>
								Get Started
							</Link>
						</>
					)}
				</div>
			</div>

			{/* Mobile menu */}
			{mobileMenuOpen && (
				<div className="border-t md:hidden border-[#D1D1D1] bg-[#F3F2EE]">
					<div className="flex flex-col px-6 py-4 space-y-1">
						<Link
							href="/features"
							className={`h-full py-3 text-xs font-mono uppercase tracking-widest transition-colors ${
								isPathActive("/features") ? "text-foreground font-bold" : "hover:text-[#666]"
							}`}
							onClick={() => setMobileMenuOpen(false)}
						>
							Features
						</Link>
						{/* Solutions - Hidden */}
						{/* <div className="space-y-2 py-3 border-t border-[#D1D1D1]">
              <div className="text-xs font-mono uppercase tracking-widest text-[#666]">
                Solutions
              </div>
              {solutions.map((solution) => (
                <Link
                  key={solution.title}
                  href={solution.href}
                  className={`block py-2 pl-3 text-sm transition-colors ${pathname === solution.href
                    ? "text-foreground font-bold"
                    : "text-foreground hover:text-[#666]"
                    }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {solution.title}
                </Link>
              ))}
            </div> */}
						{!isSelfHosted && (
							<Link
								href="/pricing"
								className={`py-3 text-xs font-mono uppercase tracking-widest transition-colors border-t border-[#D1D1D1] ${
									isPathActive("/pricing") ? "text-foreground font-bold" : "hover:text-[#666]"
								}`}
								onClick={() => setMobileMenuOpen(false)}
							>
								Pricing
							</Link>
						)}
						<Link
							href="/developers"
							className={`py-3 text-xs font-mono uppercase tracking-widest transition-colors border-t border-[#D1D1D1] ${
								isPathActive("/developers") ? "text-foreground font-bold" : "hover:text-[#666]"
							}`}
							onClick={() => setMobileMenuOpen(false)}
						>
							Developers
						</Link>
						<Link
							href="/marketplace"
							className={`py-3 text-xs font-mono uppercase tracking-widest transition-colors border-t border-[#D1D1D1] ${
								isPathActive("/marketplace") ? "text-foreground font-bold" : "hover:text-[#666]"
							}`}
							onClick={() => setMobileMenuOpen(false)}
						>
							Marketplace
						</Link>
						<Link
							href="/shopify"
							className={`py-3 text-xs font-mono uppercase tracking-widest transition-colors border-t border-[#D1D1D1] ${
								isPathActive("/shopify") ? "text-foreground font-bold" : "hover:text-[#666]"
							}`}
							onClick={() => setMobileMenuOpen(false)}
						>
							Shopify
						</Link>
						<Link
							href="/free-tools"
							className={`py-3 text-xs font-mono uppercase tracking-widest transition-colors border-t border-[#D1D1D1] ${
								isPathActive("/free-tools") ? "text-foreground font-bold" : "hover:text-[#666]"
							}`}
							onClick={() => setMobileMenuOpen(false)}
						>
							Tools
						</Link>
						<Link
							href={docsUrl}
							className="py-3 text-xs font-mono uppercase tracking-widest hover:text-[#666] transition-colors border-t border-[#D1D1D1]"
							onClick={() => setMobileMenuOpen(false)}
							target="_blank"
							rel="noopener noreferrer"
						>
							Docs
						</Link>
						<div className="pt-3 space-y-3 border-t border-[#D1D1D1]">
							<Link
								href="/contact"
								className="block py-2 text-xs font-mono uppercase tracking-widest hover:text-[#666] transition-colors"
								onClick={() => setMobileMenuOpen(false)}
							>
								Support
							</Link>
							{session?.user ? (
								<Link
									href="/dashboard"
									className="block text-center text-xs font-bold uppercase tracking-widest border border-[#1A1A1A] px-5 py-3 rounded-full hover:bg-[#1A1A1A] hover:text-white transition-all"
									onClick={() => setMobileMenuOpen(false)}
								>
									Dashboard
								</Link>
							) : (
								<>
									<Link
										href="/login"
										className="block py-2 text-xs font-mono uppercase tracking-widest hover:text-[#666] transition-colors"
										onClick={() => setMobileMenuOpen(false)}
									>
										Log in
									</Link>
									<Link
										href="/signup"
										className="block text-center text-xs font-bold uppercase tracking-widest border border-[#1A1A1A] px-5 py-3 rounded-full hover:bg-[#1A1A1A] hover:text-white transition-all"
										onClick={() => setMobileMenuOpen(false)}
									>
										Get Started
									</Link>
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</nav>
	);
}
