"use client";

import {
	Bot,
	ChevronRight,
	Code,
	Facebook,
	Languages,
	Lock,
	Mail,
	MailCheck,
	MessageCircle,
	MessageSquare,
	Palette,
	Settings,
	Shield,
	Sparkles,
	ToggleLeft,
	UserRoundCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChannelSettingsProvider, useChannelSettings } from "./channel-settings-context";

const AGENT_SECTIONS = [
	{ href: "/settings/general", label: "General", icon: Settings },
	{ href: "/settings/personality", label: "Personality", icon: Sparkles },
	{ href: "/settings/conversations", label: "Conversations", icon: MessageCircle },
	{ href: "/settings/security", label: "Security", icon: Shield },
];

const EMBED_SECTIONS = [
	{ href: "/settings/appearance", label: "Appearance", icon: Palette },
	{ href: "/settings/messages", label: "Messages", icon: MessageSquare },
	{ href: "/settings/features", label: "Features", icon: ToggleLeft },
	{ href: "/settings/translations", label: "Translations", icon: Languages },
	{ href: "/settings/embed-confidence", label: "AI Confidence", icon: Bot },
	{ href: "/settings/escalation", label: "Escalation", icon: UserRoundCog },
];

const EMAIL_SECTIONS_BASE = [{ href: "/settings/channels/email", label: "Channel", icon: Mail }];

const EMAIL_SECTIONS_FULL = [
	{ href: "/settings/channels/email", label: "Channel", icon: Mail },
	{ href: "/settings/channels/email/formatting", label: "Formatting", icon: Code },
	{ href: "/settings/channels/email/access", label: "Access Control", icon: Lock },
	{ href: "/settings/channels/email/confidence", label: "AI Confidence", icon: MailCheck },
];

const MESSENGER_SECTIONS_BASE = [
	{ href: "/settings/channels/messenger", label: "Channel", icon: Facebook },
];

const MESSENGER_SECTIONS_FULL = [
	{ href: "/settings/channels/messenger", label: "Channel", icon: Facebook },
	{ href: "/settings/channels/messenger/confidence", label: "AI Confidence", icon: Bot },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
	return (
		<ChannelSettingsProvider>
			<SettingsLayoutInner>{children}</SettingsLayoutInner>
		</ChannelSettingsProvider>
	);
}

function SettingsLayoutInner({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { emailEnabled, messengerEnabled, isLoading } = useChannelSettings();

	// Show only base sections when loading or channel is disabled
	const emailSections = !isLoading && emailEnabled ? EMAIL_SECTIONS_FULL : EMAIL_SECTIONS_BASE;
	const messengerSections =
		!isLoading && messengerEnabled ? MESSENGER_SECTIONS_FULL : MESSENGER_SECTIONS_BASE;

	const allGroups = [
		{ title: "Agent", items: AGENT_SECTIONS },
		{ title: "Embed", items: EMBED_SECTIONS },
		{ title: "Email", items: emailSections },
		{ title: "Messenger", items: messengerSections },
	];

	return (
		<div className="flex w-full h-full">
			<aside className="w-[240px] bg-[#F9F9F9] border-r border-[#D1D1D1] flex flex-col h-full font-sans text-[#1A1A1A] flex-shrink-0">
				<div className="h-16 border-b border-[#D1D1D1] flex items-center px-5 bg-[#FAFAF9]">
					<span className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
						<Settings size={14} className="text-[#888]" /> Settings
					</span>
				</div>
				<div className="flex-1 py-4 space-y-6 overflow-y-auto">
					{allGroups.map((group) => (
						<div key={group.title}>
							<div className="px-5 mb-2 font-mono text-[9px] uppercase tracking-widest text-[#888]">
								{group.title}
							</div>
							<div className="space-y-1">
								{group.items.map((item) => {
									const isActive = pathname === item.href;
									return (
										<Link
											key={item.href}
											href={item.href}
											className={`mx-2 px-3 py-2 flex items-center justify-between cursor-pointer border rounded-sm transition-all group ${
												isActive
													? "bg-white border-[#D1D1D1] shadow-sm"
													: "border-transparent hover:bg-[#F3F2EE] hover:border-[#F3F2EE]"
											}`}
										>
											<div className="flex items-center gap-3">
												<div
													className={`w-6 h-6 flex items-center justify-center rounded-sm border ${
														isActive
															? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
															: "bg-[#F3F2EE] border-[#E5E5E5] text-[#888] group-hover:text-[#1A1A1A]"
													}`}
												>
													<item.icon size={12} />
												</div>
												<span
													className={`text-xs ${
														isActive ? "font-bold" : "font-medium text-[#555]"
													}`}
												>
													{item.label}
												</span>
											</div>
											{isActive && <ChevronRight size={12} className="text-[#1A1A1A]" />}
										</Link>
									);
								})}
							</div>
						</div>
					))}
				</div>
			</aside>
			<main className="flex-1 overflow-auto">{children}</main>
		</div>
	);
}
