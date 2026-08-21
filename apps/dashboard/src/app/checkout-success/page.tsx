"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Title } from "@/components/ui/title";
import { listAgents } from "@/lib/api";
import { getConfig } from "@/lib/runtime-config";

const API_BASE = getConfig().apiUrl || "http://localhost:3001";

function CheckoutSuccessContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const sessionId = searchParams.get("session_id");
	const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
	const [attempts, setAttempts] = useState(0);

	const checkSubscription = async () => {
		try {
			const response = await fetch(`${API_BASE}/usage`, {
				credentials: "include",
			});
			const data = await response.json();

			if (data.hasSubscription) {
				setStatus("success");
				// Redirect after short delay - check agents to determine destination
				setTimeout(async () => {
					try {
						const agents = await listAgents();
						router.push(agents.length === 0 ? "/onboarding" : "/dashboard");
					} catch {
						// If we can't fetch agents, default to onboarding
						router.push("/onboarding");
					}
				}, 2000);
			} else {
				setAttempts((prev) => prev + 1);
			}
		} catch (error) {
			console.error("Error checking subscription:", error);
			setAttempts((prev) => prev + 1);
		}
	};

	useEffect(() => {
		const activate = async () => {
			if (sessionId) {
				try {
					const res = await fetch(`${API_BASE}/stripe/activate-session`, {
						method: "POST",
						credentials: "include",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ sessionId }),
					});
					if (!res.ok) {
						const body = await res.json().catch(() => ({}));
						console.error("activate-session failed:", res.status, body);
					}
				} catch (error) {
					console.error("Error calling activate-session:", error);
				}
			}
			checkSubscription();
		};
		activate();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sessionId]);

	useEffect(() => {
		if (status === "loading" && attempts > 0 && attempts < 10) {
			const timer = setTimeout(() => {
				checkSubscription();
			}, 2000);
			return () => clearTimeout(timer);
		}
		if (attempts >= 10) {
			setStatus("error");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [attempts, status]);

	if (status === "loading") {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen gap-4">
				<Loader2 className="w-12 h-12 animate-spin text-primary" />
				<Title tag="h1" size="2xl">
					Processing your subscription...
				</Title>
				<Text>Please wait while we activate your account.</Text>
			</div>
		);
	}

	if (status === "error") {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen gap-4">
				<Title tag="h1" size="2xl">
					Something went wrong
				</Title>
				<Text>
					Your payment was successful, but we couldn&apos;t activate your subscription yet.
				</Text>
				<Text size="sm">Please try refreshing the page or contact support.</Text>
				<div className="flex gap-2">
					<Button onClick={() => window.location.reload()}>Refresh</Button>
					<Button variant="outline" onClick={() => router.push("/dashboard")}>
						Go to Dashboard
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-4">
			<CheckCircle className="w-16 h-16 text-green-500" />
			<Title tag="h1" size="2xl">
				Welcome to Ansa!
			</Title>
			<Text>Your subscription is now active. Redirecting to dashboard...</Text>
		</div>
	);
}

export default function CheckoutSuccessPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-screen">
					<Loader2 className="w-12 h-12 animate-spin text-primary" />
				</div>
			}
		>
			<CheckoutSuccessContent />
		</Suspense>
	);
}
