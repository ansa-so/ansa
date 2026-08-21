"use client";

import { PageHeader } from "@ansa/ui";
import { formatDate } from "@ansa/utils";
import {
	AlertTriangle,
	Check,
	Copy,
	Globe,
	Key,
	Loader2,
	Plus,
	Shield,
	Terminal,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	type ApiKey,
	type ApiKeyWithSecret,
	createApiKey,
	deleteApiKey,
	listApiKeys,
} from "@/lib/api";

// --- COMPONENTS ---

function StatusBadge({ status }: { status: "active" | "revoked" }) {
	if (status === "active") {
		return (
			<span className="flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 bg-green-50 border border-green-200 text-green-700">
				<Shield size={10} /> Active
			</span>
		);
	}
	if (status === "revoked") {
		return (
			<span className="flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 bg-red-50 border border-red-200 text-red-700 opacity-70">
				<AlertTriangle size={10} /> Revoked
			</span>
		);
	}
	return null;
}

function KeyRow({
	apiKey,
	onDelete,
	isDeleting,
}: {
	apiKey: ApiKey;
	onDelete: () => void;
	isDeleting: boolean;
}) {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(`${apiKey.keyPrefix}...`);
		setCopied(true);
		toast.success("Key prefix copied to clipboard");
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#F3F2EE] items-center transition-colors group bg-white hover:bg-[#FAFAF9]">
			{/* Name & ID */}
			<div className="col-span-4">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 border flex items-center justify-center bg-[#F3F2EE] border-[#E5E5E5] text-[#1A1A1A]">
						<Key size={14} />
					</div>
					<div>
						<div className="font-bold text-sm text-[#1A1A1A] mb-0.5">{apiKey.name}</div>
						<div className="flex items-center gap-2">
							<span className="text-[10px] font-mono text-[#888]">{apiKey.id.slice(0, 8)}...</span>
						</div>
					</div>
				</div>
			</div>

			{/* Key Mask */}
			<div className="col-span-3">
				<div className="font-mono text-xs text-[#555] bg-[#FAFAF9] border border-[#F3F2EE] px-2 py-1.5 rounded-sm w-fit flex items-center gap-2 group-hover:border-[#D1D1D1] transition-colors">
					<span>{apiKey.keyPrefix}...</span>
					<button
						type="button"
						onClick={handleCopy}
						className="hover:text-[#1A1A1A] transition-colors"
					>
						{copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
					</button>
				</div>
			</div>

			{/* Dates */}
			<div className="col-span-3 text-center">
				<div className="text-[10px] text-[#888] font-mono uppercase mb-0.5">Last Used</div>
				<div className="text-xs font-medium">
					{apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt, { includeTime: false }) : "Never"}
				</div>
			</div>

			{/* Status */}
			<div className="flex justify-center col-span-1">
				<StatusBadge status="active" />
			</div>

			{/* Actions */}
			<div className="flex justify-end col-span-1">
				<button
					type="button"
					onClick={onDelete}
					disabled={isDeleting}
					className="p-2 border border-transparent hover:border-red-200 hover:bg-red-50 text-[#888] hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
					title="Delete Key"
				>
					{isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
				</button>
			</div>
		</div>
	);
}

export default function ApiKeysPage() {
	const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [deleting, setDeleting] = useState<string | null>(null);

	// Dialog states
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [showSecretDialog, setShowSecretDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);

	// Form states
	const [newKeyName, setNewKeyName] = useState("");
	const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyWithSecret | null>(null);
	const [copied, setCopied] = useState(false);

	const loadApiKeys = useCallback(async () => {
		try {
			setLoading(true);
			const keys = await listApiKeys();
			setApiKeys(keys);
		} catch (error) {
			console.error("Failed to load API keys:", error);
			toast.error("Failed to load API keys");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadApiKeys();
	}, [loadApiKeys]);

	const handleCreateKey = async () => {
		if (!newKeyName.trim()) {
			toast.error("Please enter a name for the API key");
			return;
		}

		try {
			setCreating(true);
			const key = await createApiKey(newKeyName.trim());
			setNewlyCreatedKey(key);
			setShowCreateDialog(false);
			setShowSecretDialog(true);
			setNewKeyName("");
			await loadApiKeys();
			toast.success("API key created successfully");
		} catch (error) {
			console.error("Failed to create API key:", error);
			toast.error(error instanceof Error ? error.message : "Failed to create API key");
		} finally {
			setCreating(false);
		}
	};

	const handleDeleteKey = async () => {
		if (!keyToDelete) return;

		try {
			setDeleting(keyToDelete.id);
			await deleteApiKey(keyToDelete.id);
			await loadApiKeys();
			toast.success("API key deleted successfully");
		} catch (error) {
			console.error("Failed to delete API key:", error);
			toast.error(error instanceof Error ? error.message : "Failed to delete API key");
		} finally {
			setDeleting(null);
			setShowDeleteDialog(false);
			setKeyToDelete(null);
		}
	};

	const handleCopyKey = () => {
		if (newlyCreatedKey?.key) {
			navigator.clipboard.writeText(newlyCreatedKey.key);
			setCopied(true);
			toast.success("API key copied to clipboard");
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<>
			<div className="min-h-screen">
				<PageHeader
					title="API Keys"
					icon={
						<span className="flex items-center gap-2">
							<span>Create and manage API keys for programmatic access</span>
						</span>
					}
					action={
						<button
							type="button"
							onClick={() => setShowCreateDialog(true)}
							className="bg-[#1A1A1A] text-white px-6 h-10 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-lg"
						>
							<Plus size={14} /> Create New Key
						</button>
					}
				/>

				<div className="w-full p-8 space-y-8">
					{/* Developer Context (Code Snippet) */}
					<section className="bg-[#1A1A1A] text-[#E5E5E5] p-6 shadow-sm relative overflow-hidden group">
						{/* Header decoration */}
						<div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
							<div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#888]">
								<Terminal size={12} /> Authentication Header
							</div>
							<div className="flex gap-1.5">
								<div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
								<div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
							</div>
						</div>

						{/* Code content */}
						<div className="relative z-10 font-mono text-sm">
							<span className="text-purple-400">Authorization:</span>{" "}
							<span className="text-green-400">Bearer</span>{" "}
							<span className="text-[#888]">ansa_sk_live_...</span>
						</div>

						{/* Hint */}
						<div className="flex items-start gap-3 pt-4 mt-4 border-t border-white/10">
							<div className="mt-0.5 text-yellow-500">
								<AlertTriangle size={14} />
							</div>
							<p className="text-[10px] text-[#888] leading-relaxed max-w-lg">
								Your API keys carry many privileges, so be sure to keep them secure! Do not share
								your secret API keys in publicly accessible areas such as GitHub, client-side code,
								and so forth.
							</p>
						</div>

						{/* Background Pattern */}
						<div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-[#333]/20 to-transparent pointer-events-none" />
					</section>

					{/* Credential Registry (Table) */}
					<section className="bg-white border border-[#D1D1D1] shadow-sm flex flex-col min-h-[300px]">
						{/* Toolbar */}
						<div className="px-6 py-4 border-b border-[#F3F2EE] flex justify-between items-center bg-[#FAFAF9]">
							<h3 className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
								<Shield size={14} className="text-[#888]" /> Credential Registry
							</h3>
						</div>

						{/* Content */}
						{loading ? (
							<div className="flex items-center justify-center flex-1 py-12">
								<Loader2 className="w-6 h-6 animate-spin text-[#888]" />
							</div>
						) : apiKeys.length === 0 ? (
							<div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
								<div className="w-12 h-12 mb-4 flex items-center justify-center bg-[#F3F2EE] border border-[#E5E5E5]">
									<Key className="w-6 h-6 text-[#888]" />
								</div>
								<div className="text-lg font-medium text-[#1A1A1A] mb-2">No API keys yet</div>
								<p className="text-sm text-[#888] max-w-sm mb-6">
									Create an API key to authenticate requests to the Ansa API from your applications.
								</p>
								<button
									type="button"
									onClick={() => setShowCreateDialog(true)}
									className="bg-[#1A1A1A] text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2"
								>
									<Plus size={12} /> Create Your First API Key
								</button>
							</div>
						) : (
							<>
								{/* Table Header */}
								<div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
									<div className="col-span-4">Key Name / ID</div>
									<div className="col-span-3">Token Prefix</div>
									<div className="col-span-3 text-center">Activity</div>
									<div className="col-span-1 text-center">Status</div>
									<div className="col-span-1 text-right">Action</div>
								</div>

								{/* Table Body */}
								<div className="flex-1">
									{apiKeys.map((key) => (
										<KeyRow
											key={key.id}
											apiKey={key}
											onDelete={() => {
												setKeyToDelete(key);
												setShowDeleteDialog(true);
											}}
											isDeleting={deleting === key.id}
										/>
									))}
								</div>

								{/* Footer */}
								<div className="p-3 border-t border-[#D1D1D1] bg-[#FAFAF9] px-6 flex justify-between items-center">
									<span className="text-[10px] font-mono text-[#888] uppercase">
										{apiKeys.length} Active Credential{apiKeys.length !== 1 ? "s" : ""}
									</span>
									<div className="flex items-center gap-2 text-[10px] text-[#555]">
										<Globe size={10} />
										<span>Base URL:</span>
										<span className="font-mono bg-[#E5E5E5] px-1">https://api.ansa.ai/v1</span>
									</div>
								</div>
							</>
						)}
					</section>
				</div>
			</div>

			{/* Create API Key Dialog */}
			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create API Key</DialogTitle>
						<DialogDescription>
							Enter a name to help you identify this API key later.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Label htmlFor="keyName" className="mb-2">
							Name
						</Label>
						<Input
							id="keyName"
							placeholder="e.g., Production, Development, My App"
							value={newKeyName}
							onChange={(e) => setNewKeyName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleCreateKey();
								}
							}}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCreateDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleCreateKey} disabled={creating || !newKeyName.trim()}>
							{creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							Create Key
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Show Secret Dialog */}
			<Dialog open={showSecretDialog} onOpenChange={setShowSecretDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Save Your API Key</DialogTitle>
						<DialogDescription>
							<span className="font-medium text-amber-600 dark:text-amber-400">
								This is the only time you'll see this key.
							</span>{" "}
							Copy it now and store it securely.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Label>API Key</Label>
						<div className="flex gap-2 mt-2">
							<Input value={newlyCreatedKey?.key || ""} readOnly className="font-mono text-sm" />
							<Button variant="outline" onClick={handleCopyKey}>
								<Copy className="w-4 h-4" />
								{copied ? "Copied!" : "Copy"}
							</Button>
						</div>
					</div>
					<DialogFooter>
						<Button
							onClick={() => {
								setShowSecretDialog(false);
								setNewlyCreatedKey(null);
							}}
						>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete API Key</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete the API key "{keyToDelete?.name}"? Any applications
							using this key will no longer be able to authenticate.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setKeyToDelete(null)}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteKey} className="bg-red-600 hover:bg-red-700">
							Delete Key
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
