"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { getConfig } from "@/lib/runtime-config";

export function MarketingChatWidget() {
	const [scriptUrl, setScriptUrl] = useState<string | null>(null);

	useEffect(() => {
		const config = getConfig();
		if (!config.dashboardAgentId) return;

		const baseUrl = config.cdnUrl || config.widgetUrl;
		const url = new URL("embed.js", `${baseUrl.replace(/\/$/, "")}/`);
		url.searchParams.set("agentId", config.dashboardAgentId);
		setScriptUrl(url.toString());
	}, []);

	return scriptUrl ? (
		<Script id="ansa-marketing-widget" src={scriptUrl} strategy="afterInteractive" />
	) : null;
}
