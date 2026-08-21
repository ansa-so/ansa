"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { type AppConfig, getConfig } from "./api";

interface ConfigContextValue {
	config: AppConfig | null;
	loading: boolean;
	isSelfHosted: boolean;
	widgetUrl: string;
	cdnUrl: string;
	docsUrl: string;
	apiUrl: string;
}

const ConfigContext = createContext<ConfigContextValue>({
	config: null,
	loading: true,
	isSelfHosted: true, // Default to true
	widgetUrl: "http://localhost:3002",
	cdnUrl: "http://localhost:3002",
	docsUrl: "http://localhost:3003",
	apiUrl: "http://localhost:3001",
});

export function ConfigProvider({ children }: { children: ReactNode }) {
	const [config, setConfig] = useState<AppConfig | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getConfig()
			.then(setConfig)
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	return (
		<ConfigContext.Provider
			value={{
				config,
				loading,
				isSelfHosted: config?.selfHosted ?? true,
				widgetUrl: config?.widgetUrl ?? "http://localhost:3002",
				cdnUrl: config?.cdnUrl ?? "http://localhost:3002",
				docsUrl: config?.docsUrl ?? "http://localhost:3003",
				apiUrl: config?.apiUrl ?? "http://localhost:3001",
			}}
		>
			{children}
		</ConfigContext.Provider>
	);
}

export function useConfig() {
	return useContext(ConfigContext);
}
