"use client";

import { AuthenticatedLayout } from "@/components/authenticated-layout";

export default function AuthenticatedRouteLayout({ children }: { children: React.ReactNode }) {
	return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
