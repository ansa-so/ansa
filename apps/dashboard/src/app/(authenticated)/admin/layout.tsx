"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkAdminAccess } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	const { data: session, isPending } = useSession();
	const router = useRouter();
	const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

	useEffect(() => {
		if (!isPending && session) {
			checkAdminAccess()
				.then((result) => {
					if (!result.isAdmin) {
						router.push("/dashboard");
					} else {
						setIsAdmin(true);
					}
				})
				.catch(() => router.push("/dashboard"));
		} else if (!isPending && !session) {
			router.push("/");
		}
	}, [session, isPending, router]);

	if (isPending || isAdmin === null) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return <>{children}</>;
}
