"use client";

import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { identifyUser, resetUser } from "@/lib/analytics";
import { getUsage, updateTimezone } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { useConfig } from "@/lib/config-context";
import { ConversationListProvider } from "@/lib/conversation-list-context";
import { cn } from "@/lib/utils";

function MainContent({ children, className }: { children: React.ReactNode; className?: string }) {
	return (
		<div className={cn("transition-all duration-200 h-full flex flex-col", className)}>
			{children}
		</div>
	);
}

export function AuthenticatedLayout({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const { data: session, isPending } = useSession();
	const { isSelfHosted } = useConfig();
	const [isCheckingSubscription, setIsCheckingSubscription] = useState(!isSelfHosted);

	useEffect(() => {
		// Redirect unauthenticated users to marketing homepage or login
		if (!isPending && !session) {
			resetUser(); // Clear PostHog identity on logout
			router.push("/login");
		}
	}, [session, isPending, pathname, router]);

	// Identify user in PostHog after authentication
	useEffect(() => {
		if (session?.user) {
			identifyUser(session.user.id, {
				email: session.user.email,
				name: session.user.name ?? undefined,
				createdAt: session.user.createdAt,
			});
		}
	}, [session?.user]);

	// Auto-detect and update user's timezone once per session
	useEffect(() => {
		if (session) {
			const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			// Store in sessionStorage to avoid repeated API calls
			const lastTimezone = sessionStorage.getItem("ansa_timezone");
			if (detectedTimezone && lastTimezone !== detectedTimezone) {
				updateTimezone(detectedTimezone)
					.then(() => {
						sessionStorage.setItem("ansa_timezone", detectedTimezone);
					})
					.catch((err) => {
						console.warn("[auth] Failed to update timezone:", err);
					});
			}
		}
	}, [session]);

	useEffect(() => {
		// Only fetch usage for non-self-hosted installations
		if (session && !isSelfHosted) {
			getUsage()
				.then((data) => {
					// Redirect to choose-plan if user hasn't selected any plan yet
					// Allow access to choose-plan, checkout-success, and shopify plans pages
					const allowedPaths = ["/choose-plan", "/checkout-success", "/integrations/shopify/plans"];
					const isAllowedPath = allowedPaths.some((path) => pathname.startsWith(path));
					if (!data.hasPlanSelected && !isAllowedPath) {
						router.push("/choose-plan");
					}
					setIsCheckingSubscription(false);
				})
				.catch((err) => {
					console.error(err);
					setIsCheckingSubscription(false);
				});
		} else {
			setIsCheckingSubscription(false);
		}
	}, [session, isSelfHosted, pathname, router]);

	if (isPending || isCheckingSubscription) {
		return <div className="max-w-4xl p-8">Loading...</div>;
	}

	if (!session) {
		return null;
	}

	return (
		<ConversationListProvider>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset className="overflow-hidden">
					{/* Mobile sidebar trigger */}
					<div className="md:hidden fixed top-4 left-4 z-50">
						<SidebarTrigger variant="outline">
							<Menu className="h-5 w-5" />
						</SidebarTrigger>
					</div>
					<div
						className={cn(
							"flex-1 min-h-0",
							className?.includes("overflow-hidden") ? "overflow-hidden" : "overflow-auto",
						)}
					>
						<MainContent className={className}>{children}</MainContent>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</ConversationListProvider>
	);
}
