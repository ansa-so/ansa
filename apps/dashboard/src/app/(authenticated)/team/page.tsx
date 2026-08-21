"use client";

import { formatDate } from "@ansa/utils";
import {
	Check,
	ChevronDown,
	Clock,
	Copy,
	Crown,
	Filter,
	Mail,
	MoreHorizontal,
	Search,
	Shield,
	Trash2,
	UserPlus,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	cancelTeamInvitation,
	getTeamContext,
	getTeamInvitations,
	removeTeamMember,
	sendTeamInvitation,
	type TeamContext,
	type TeamInvitation,
} from "@/lib/api";

// --- COMPONENTS ---

const RoleBadge = ({ role }: { role: string }) => {
	const styles: Record<string, string> = {
		owner: "bg-[#1A1A1A] text-white border-[#1A1A1A]",
		admin: "bg-[#EAE9E5] text-[#1A1A1A] border-[#D1D1D1]",
		member: "bg-white text-[#555] border-[#D1D1D1]",
	};
	return (
		<span
			className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 border ${styles[role.toLowerCase()] || styles.member}`}
		>
			{role}
		</span>
	);
};

const StatusBadge = ({ status }: { status: "active" | "pending" }) => {
	if (status === "pending") {
		return (
			<span className="text-[9px] font-bold uppercase text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 flex items-center gap-1">
				<Clock size={10} /> Pending
			</span>
		);
	}
	return (
		<div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-green-700 bg-green-50 border border-green-200 px-2 py-0.5">
			<div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
			Active
		</div>
	);
};

export default function TeamPage() {
	const [teamContext, setTeamContext] = useState<TeamContext | null>(null);
	const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("member");
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		async function loadTeamData() {
			try {
				setLoading(true);
				const context = await getTeamContext();
				setTeamContext(context);

				// Only load invitations if user is an owner
				if (context.isOwner) {
					const invitationsData = await getTeamInvitations();
					setInvitations(invitationsData);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load team data");
			} finally {
				setLoading(false);
			}
		}
		loadTeamData();
	}, []);

	async function refreshTeamData() {
		try {
			setLoading(true);
			const context = await getTeamContext();
			setTeamContext(context);

			if (context.isOwner) {
				const invitationsData = await getTeamInvitations();
				setInvitations(invitationsData);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load team data");
		} finally {
			setLoading(false);
		}
	}

	async function handleSendInvitation(e: React.FormEvent) {
		e.preventDefault();
		if (!email.trim()) return;

		try {
			setSending(true);
			setError(null);
			setSuccess(null);
			await sendTeamInvitation(email.trim(), role);
			setSuccess(`Invitation sent to ${email}`);
			setEmail("");
			setRole("member");

			// Refresh invitations
			await refreshTeamData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to send invitation");
		} finally {
			setSending(false);
		}
	}

	async function handleCancelInvitation(id: string) {
		try {
			await cancelTeamInvitation(id);
			setInvitations(invitations.filter((inv) => inv.id !== id));
			setSuccess("Invitation cancelled");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to cancel invitation");
		}
	}

	async function handleRemoveMember(id: string) {
		if (!confirm("Are you sure you want to remove this team member?")) return;

		try {
			await removeTeamMember(id);
			await refreshTeamData();
			setSuccess("Team member removed");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to remove team member");
		}
	}

	function copyInviteUrl(token: string) {
		const url = `${window.location.origin}/invite/${token}`;
		navigator.clipboard.writeText(url);
		setCopiedUrl(token);
		setTimeout(() => setCopiedUrl(null), 2000);
	}

	const members = teamContext?.members || [];
	const filteredMembers = members.filter(
		(member) =>
			member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			member.email.toLowerCase().includes(searchQuery.toLowerCase()),
	);
	const totalRecords = filteredMembers.length + invitations.length;

	return (
		<div className="min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			{/* Header */}
			<header className="h-20 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
				<div>
					<h1 className="text-2xl font-medium tracking-tight">Team & Permissions</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-1">
						<span>Members: {members.length}</span>
						<span className="text-[#D1D1D1]">|</span>
						<span>Pending: {invitations.length}</span>
						{teamContext?.isOwner && (
							<>
								<span className="text-[#D1D1D1]">|</span>
								<span>Role: Owner</span>
							</>
						)}
					</div>
				</div>
			</header>

			<div className="w-full p-8 space-y-8">
				{error && (
					<div className="p-4 font-mono text-sm text-red-700 border border-red-200 bg-red-50">
						{error}
					</div>
				)}

				{success && (
					<div className="p-4 font-mono text-sm text-green-700 border border-green-200 bg-green-50">
						{success}
					</div>
				)}

				{/* Team Owner Info (shown to members) */}
				{!teamContext?.isOwner && teamContext?.owner && (
					<section className="bg-white border border-[#D1D1D1] shadow-sm p-6">
						<div className="flex items-center gap-2 mb-6">
							<div className="bg-[#F3F2EE] p-2 text-[#1A1A1A] border border-[#E5E5E5]">
								<Crown size={16} />
							</div>
							<div>
								<h3 className="text-sm font-bold tracking-wide uppercase">Team Owner</h3>
								<p className="text-xs text-[#888]">You are a member of this team</p>
							</div>
						</div>
						<div className="flex items-center gap-4">
							<div className="w-10 h-10 bg-[#F3F2EE] border border-[#E5E5E5] flex items-center justify-center font-bold text-sm text-[#1A1A1A]">
								{teamContext.owner.name?.[0]?.toUpperCase() ||
									teamContext.owner.email[0].toUpperCase()}
							</div>
							<div>
								<div className="font-bold text-sm text-[#1A1A1A] leading-none mb-1">
									{teamContext.owner.name || "No name"}
								</div>
								<div className="text-[10px] text-[#888] font-mono leading-none">
									{teamContext.owner.email}
								</div>
							</div>
							<div className="ml-auto">
								<span className="text-[10px] font-mono text-[#888] uppercase">
									Your role: <RoleBadge role={teamContext.role} />
								</span>
							</div>
						</div>
					</section>
				)}

				{/* Invite Form (only for owners) */}
				{teamContext?.isOwner && (
					<section className="bg-white border border-[#D1D1D1] shadow-sm p-6">
						<div className="flex items-center gap-2 mb-6">
							<div className="bg-[#F3F2EE] p-2 text-[#1A1A1A] border border-[#E5E5E5]">
								<UserPlus size={16} />
							</div>
							<div>
								<h3 className="text-sm font-bold tracking-wide uppercase">Invite New Member</h3>
								<p className="text-xs text-[#888]">
									Send an invitation link to join your workspace.
								</p>
							</div>
						</div>

						<form onSubmit={handleSendInvitation} className="flex items-end gap-4">
							<div className="flex-1">
								<Label className="mb-2">Email Address</Label>
								<div className="relative">
									<Input
										type="email"
										placeholder="colleague@company.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="w-full pl-9"
										required
									/>
									<Mail
										size={14}
										className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BBB]"
									/>
								</div>
							</div>

							<div className="w-48">
								<Label className="mb-2">Role Access</Label>
								<div className="relative">
									<select
										value={role}
										onChange={(e) => setRole(e.target.value)}
										className="w-full bg-white border border-[#D1D1D1] p-3 text-sm focus:outline-none focus:border-[#1A1A1A] appearance-none cursor-pointer"
									>
										<option value="member">Member</option>
										<option value="admin">Admin</option>
									</select>
									<ChevronDown
										size={14}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] pointer-events-none"
									/>
								</div>
							</div>

							<button
								type="submit"
								disabled={sending || !email.trim()}
								className="bg-[#1A1A1A] text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors shadow-lg h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{sending ? "Sending..." : "Send Invite"}
							</button>
						</form>
					</section>
				)}

				{/* Member Registry */}
				<section className="bg-white border border-[#D1D1D1] shadow-sm flex flex-col min-h-[400px]">
					{/* Toolbar */}
					<div className="px-6 py-4 border-b border-[#F3F2EE] flex justify-between items-center bg-[#FAFAF9]">
						<h3 className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
							<Shield size={14} className="text-[#888]" /> Personnel Manifest
						</h3>
						<div className="flex gap-2">
							<div className="relative">
								<Search
									size={12}
									className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888]"
								/>
								<input
									type="text"
									placeholder="FIND MEMBER..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="h-8 pl-8 pr-4 bg-white border border-[#D1D1D1] text-[10px] font-mono focus:outline-none focus:border-[#1A1A1A] w-48 uppercase"
								/>
							</div>
							<button className="h-8 px-3 border border-[#D1D1D1] bg-white hover:bg-[#F9F9F9] flex items-center gap-2 text-[10px] font-bold uppercase text-[#555]">
								<Filter size={10} /> Role
							</button>
						</div>
					</div>

					{/* Table Header */}
					<div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
						<div className="col-span-5">User Details</div>
						<div className="col-span-2 text-center">Role</div>
						<div className="col-span-2 text-center">Status</div>
						<div className="col-span-2 text-center">Joined / Expires</div>
						<div className="col-span-1 text-right">Actions</div>
					</div>

					{/* Table Body */}
					<div className="flex-1">
						{loading ? (
							<div className="flex flex-col items-center justify-center p-12 text-center">
								<div className="text-xs font-mono text-[#888] uppercase">Loading...</div>
							</div>
						) : (
							<>
								{/* Pending Invites */}
								{teamContext?.isOwner &&
									invitations.map((invitation) => (
										<div
											key={invitation.id}
											className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#F3F2EE] items-center bg-[#FAFAF9]/50 border-l-2 border-l-yellow-400"
										>
											<div className="flex items-center col-span-5 gap-3 pl-3">
												<div className="w-8 h-8 bg-white border border-dashed border-[#D1D1D1] flex items-center justify-center text-[#CCC]">
													<Mail size={14} />
												</div>
												<div>
													<div className="font-mono text-xs text-[#555]">{invitation.email}</div>
													<div className="text-[9px] text-[#888] font-bold uppercase tracking-wide mt-0.5">
														Invitation Sent
													</div>
												</div>
											</div>
											<div className="col-span-2 text-center opacity-60">
												<RoleBadge role={invitation.role} />
											</div>
											<div className="flex justify-center col-span-2 text-center">
												<StatusBadge status="pending" />
											</div>
											<div className="col-span-2 text-center font-mono text-[10px] text-[#888]">
												{formatDate(invitation.expiresAt)}
											</div>
											<div className="flex justify-end col-span-1 gap-2">
												<button
													onClick={() => handleCancelInvitation(invitation.id)}
													className="p-1.5 hover:bg-white hover:text-red-500 transition-colors"
													title="Revoke"
												>
													<Trash2 size={12} />
												</button>
												<button
													onClick={() => copyInviteUrl(invitation.token)}
													className="p-1.5 hover:bg-white hover:text-[#1A1A1A] transition-colors"
													title="Copy Link"
												>
													{copiedUrl === invitation.token ? (
														<Check size={12} className="text-green-600" />
													) : (
														<Copy size={12} />
													)}
												</button>
											</div>
										</div>
									))}

								{/* Active Members */}
								{filteredMembers.map((member) => (
									<div
										key={member.id}
										className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#F3F2EE] items-center hover:bg-[#FAFAF9] transition-colors group"
									>
										{/* User Info */}
										<div className="flex items-center col-span-5 gap-3">
											<div className="w-8 h-8 bg-[#F3F2EE] border border-[#E5E5E5] flex items-center justify-center font-bold text-xs text-[#1A1A1A]">
												{member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
											</div>
											<div>
												<div className="font-bold text-sm text-[#1A1A1A] leading-none mb-1">
													{member.name || "No name"}
												</div>
												<div className="text-[10px] text-[#888] font-mono leading-none">
													{member.email}
												</div>
											</div>
										</div>

										{/* Role */}
										<div className="col-span-2 text-center">
											<RoleBadge role={member.role} />
										</div>

										{/* Status */}
										<div className="flex justify-center col-span-2 text-center">
											<StatusBadge status="active" />
										</div>

										{/* Joined */}
										<div className="col-span-2 text-center font-mono text-xs text-[#555]">
											{formatDate(member.createdAt)}
										</div>

										{/* Actions */}
										<div className="flex justify-end col-span-1">
											{teamContext?.isOwner && (
												<button
													onClick={() => handleRemoveMember(member.id)}
													className="text-[#888] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
													title="Remove member"
												>
													<MoreHorizontal size={16} />
												</button>
											)}
										</div>
									</div>
								))}

								{/* Empty State */}
								{filteredMembers.length === 0 && invitations.length === 0 && (
									<div className="flex flex-col items-center justify-center p-12 text-center opacity-50">
										<div className="w-12 h-12 border border-dashed border-[#CCC] rounded-full flex items-center justify-center mb-3">
											<Users size={20} className="text-[#CCC]" />
										</div>
										<div className="text-xs font-mono text-[#888] uppercase">
											No team members found
										</div>
										{teamContext?.isOwner && (
											<div className="text-[10px] font-mono text-[#AAA] mt-1">
												Invite someone using the form above
											</div>
										)}
									</div>
								)}
							</>
						)}
					</div>

					{/* Footer */}
					<div className="p-3 border-t border-[#D1D1D1] bg-[#FAFAF9] px-6 flex justify-between items-center">
						<span className="text-[10px] font-mono text-[#888] uppercase">
							{totalRecords} Record{totalRecords !== 1 ? "s" : ""} Total
						</span>
					</div>
				</section>
			</div>
		</div>
	);
}
