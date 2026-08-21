"use client";

import { CheckCircle, Loader2, MessageSquare, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/auth-client";
import { getConfig } from "@/lib/runtime-config";

const API_BASE = getConfig().apiUrl || "http://localhost:3001";

interface Invitation {
	id: string;
	email: string;
	role: string;
	status: string;
	expiresAt: string;
	inviterName: string | null;
	inviterEmail: string;
}

export default function InvitePage() {
	const params = useParams();
	const router = useRouter();
	const token = params.token as string;
	const { data: session, isPending: sessionLoading } = useSession();

	const [invitation, setInvitation] = useState<Invitation | null>(null);
	const [loading, setLoading] = useState(true);
	const [accepting, setAccepting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Fetch invitation details
	useEffect(() => {
		async function fetchInvitation() {
			try {
				const response = await fetch(`${API_BASE}/team/invitation/${token}`, {
					credentials: "include",
				});

				if (!response.ok) {
					const data = await response.json();
					setError(data.error || "Invalid invitation");
					return;
				}

				const data = await response.json();

				// Check if invitation is expired
				if (new Date(data.expiresAt) < new Date()) {
					setError("This invitation has expired");
					return;
				}

				// Check if invitation is no longer pending
				if (data.status !== "pending") {
					setError("This invitation is no longer valid");
					return;
				}

				setInvitation(data);
			} catch {
				setError("Failed to load invitation");
			} finally {
				setLoading(false);
			}
		}

		if (token) {
			fetchInvitation();
		}
	}, [token]);

	const handleAccept = async () => {
		if (!session?.user) {
			// Redirect to login with return URL
			router.push(`/login?redirect=/invite/${token}`);
			return;
		}

		setAccepting(true);
		setError(null);

		try {
			const response = await fetch(`${API_BASE}/team/accept/${token}`, {
				method: "POST",
				credentials: "include",
			});

			if (!response.ok) {
				const data = await response.json();
				setError(data.error || "Failed to accept invitation");
				return;
			}

			setSuccess(true);
			// Redirect to dashboard after a short delay
			setTimeout(() => {
				router.push("/dashboard");
			}, 2000);
		} catch {
			setError("Failed to accept invitation");
		} finally {
			setAccepting(false);
		}
	};

	// Loading state
	if (loading || sessionLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen px-4 bg-neutral-50 dark:bg-gray-800/30">
				<Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
				<Text className="mt-4 text-neutral-600">Loading invitation...</Text>
			</div>
		);
	}

	// Error state
	if (error && !invitation) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen px-4 bg-neutral-50 dark:bg-gray-800/30">
				<Link href="/" className="flex items-center gap-2 mb-8">
					<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-900">
						<MessageSquare className="w-5 h-5 text-white" />
					</div>
					<span className="text-xl font-semibold tracking-tight">Ansa</span>
				</Link>

				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="flex justify-center mb-4">
							<XCircle className="w-12 h-12 text-red-500" />
						</div>
						<CardTitle className="text-2xl">Invalid Invitation</CardTitle>
						<CardDescription>{error}</CardDescription>
					</CardHeader>
					<CardFooter className="justify-center">
						<Button asChild>
							<Link href="/dashboard">Go to Dashboard</Link>
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	// Success state
	if (success) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen px-4 bg-neutral-50 dark:bg-gray-800/30">
				<Link href="/" className="flex items-center gap-2 mb-8">
					<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-900">
						<MessageSquare className="w-5 h-5 text-white" />
					</div>
					<span className="text-xl font-semibold tracking-tight">Ansa</span>
				</Link>

				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="flex justify-center mb-4">
							<CheckCircle className="w-12 h-12 text-green-500" />
						</div>
						<CardTitle className="text-2xl">Welcome to the Team!</CardTitle>
						<CardDescription>
							You've successfully joined the team. Redirecting to dashboard...
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	// Invitation details
	return (
		<div className="flex flex-col items-center justify-center min-h-screen px-4 bg-neutral-50 dark:bg-gray-800/30">
			<Link href="/" className="flex items-center gap-2 mb-8">
				<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-900">
					<MessageSquare className="w-5 h-5 text-white" />
				</div>
				<span className="text-xl font-semibold tracking-tight">Ansa</span>
			</Link>

			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Team Invitation</CardTitle>
					<CardDescription>You've been invited to join a team on Ansa</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="p-4 rounded-lg bg-neutral-100">
						<Text size="sm" className="text-neutral-600">
							Invited by
						</Text>
						<Text className="font-medium">
							{invitation?.inviterName || invitation?.inviterEmail}
						</Text>
						{invitation?.inviterName && (
							<Text size="sm" className="text-neutral-500">
								{invitation.inviterEmail}
							</Text>
						)}
					</div>

					<div className="p-4 rounded-lg bg-neutral-100">
						<Text size="sm" className="text-neutral-600">
							Role
						</Text>
						<Text className="font-medium capitalize">{invitation?.role}</Text>
					</div>

					<div className="p-4 rounded-lg bg-neutral-100">
						<Text size="sm" className="text-neutral-600">
							Invited email
						</Text>
						<Text className="font-medium">{invitation?.email}</Text>
					</div>

					{error && <div className="p-3 text-sm text-red-600 rounded-lg bg-red-50">{error}</div>}

					{!session?.user && (
						<div className="p-3 text-sm rounded-lg bg-amber-50 text-amber-700">
							You need to sign in with <strong>{invitation?.email}</strong> to accept this
							invitation.
						</div>
					)}

					{session?.user && session.user.email !== invitation?.email && (
						<div className="p-3 text-sm rounded-lg bg-amber-50 text-amber-700">
							You're signed in as <strong>{session.user.email}</strong>, but this invitation was
							sent to <strong>{invitation?.email}</strong>. Please sign out and sign in with the
							correct account.
						</div>
					)}
				</CardContent>
				<CardFooter className="flex flex-col gap-3">
					{!session?.user ? (
						<>
							<Button
								className="w-full"
								onClick={() => router.push(`/login?redirect=/invite/${token}`)}
							>
								Sign in to Accept
							</Button>
							<Text size="sm" className="text-center text-neutral-500">
								Don't have an account?{" "}
								<Link
									href={`/signup?redirect=/invite/${token}`}
									className="text-primary hover:underline"
								>
									Sign up
								</Link>
							</Text>
						</>
					) : session.user.email === invitation?.email ? (
						<Button className="w-full" onClick={handleAccept} disabled={accepting}>
							{accepting ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Accepting...
								</>
							) : (
								"Accept Invitation"
							)}
						</Button>
					) : (
						<Button variant="outline" className="w-full" asChild>
							<Link href="/login">Sign in with a different account</Link>
						</Button>
					)}
				</CardFooter>
			</Card>
		</div>
	);
}
