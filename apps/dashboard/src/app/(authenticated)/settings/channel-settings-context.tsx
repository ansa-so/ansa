"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAgent } from "@/lib/agent-context";
import { getEmailSettings, getMessengerSettings } from "@/lib/api";

interface ChannelSettingsContextType {
	emailEnabled: boolean;
	messengerEnabled: boolean;
	isLoading: boolean;
	refetch: () => Promise<void>;
}

const ChannelSettingsContext = createContext<ChannelSettingsContextType | null>(null);

export function ChannelSettingsProvider({ children }: { children: React.ReactNode }) {
	const { currentAgent } = useAgent();
	const [emailEnabled, setEmailEnabled] = useState(false);
	const [messengerEnabled, setMessengerEnabled] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const fetchSettings = useCallback(async () => {
		if (!currentAgent) {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		try {
			const [emailSettings, messengerSettings] = await Promise.all([
				getEmailSettings(currentAgent.id).catch(() => null),
				getMessengerSettings(currentAgent.id).catch(() => null),
			]);

			setEmailEnabled(emailSettings?.enabled ?? false);
			setMessengerEnabled(messengerSettings?.enabled ?? false);
		} catch (err) {
			console.error("Failed to fetch channel settings:", err);
			// Default to false on error (channel-only view)
			setEmailEnabled(false);
			setMessengerEnabled(false);
		} finally {
			setIsLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		fetchSettings();
	}, [fetchSettings]);

	return (
		<ChannelSettingsContext.Provider
			value={{
				emailEnabled,
				messengerEnabled,
				isLoading,
				refetch: fetchSettings,
			}}
		>
			{children}
		</ChannelSettingsContext.Provider>
	);
}

export function useChannelSettings() {
	const context = useContext(ChannelSettingsContext);
	if (!context) {
		throw new Error("useChannelSettings must be used within a ChannelSettingsProvider");
	}
	return context;
}
