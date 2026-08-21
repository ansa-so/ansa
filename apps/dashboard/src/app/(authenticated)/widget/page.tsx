"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function WidgetPage() {
	useEffect(() => {
		redirect("/settings");
	}, []);

	return null;
}
