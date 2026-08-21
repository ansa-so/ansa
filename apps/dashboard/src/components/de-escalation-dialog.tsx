"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DeEscalationDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: (resolutionNote?: string) => void;
	loading?: boolean;
}

export function DeEscalationDialog({
	open,
	onClose,
	onConfirm,
	loading = false,
}: DeEscalationDialogProps) {
	const [resolutionNote, setResolutionNote] = useState("");

	const handleConfirm = () => {
		onConfirm(resolutionNote.trim() || undefined);
		setResolutionNote("");
	};

	const handleClose = () => {
		if (!loading) {
			setResolutionNote("");
			onClose();
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>De-escalate Conversation</DialogTitle>
					<DialogDescription>
						This will transfer the conversation back to the AI assistant. You can optionally add a
						note explaining why the conversation was de-escalated.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2">
					<Label htmlFor="resolution-note">Resolution Note (Optional)</Label>
					<Textarea
						id="resolution-note"
						placeholder="e.g., Issue resolved, customer satisfied, transferred back to AI..."
						value={resolutionNote}
						onChange={(e) => setResolutionNote(e.target.value)}
						rows={4}
						disabled={loading}
					/>
					<p className="text-xs text-muted-foreground">
						This note will be visible in the escalation history for tracking purposes.
					</p>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose} disabled={loading}>
						Cancel
					</Button>
					<Button onClick={handleConfirm} disabled={loading}>
						{loading ? "De-escalating..." : "De-escalate"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
