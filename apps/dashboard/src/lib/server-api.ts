import { cookies } from "next/headers";
import { getConfig } from "@/lib/runtime-config";

const API_BASE = getConfig().apiUrl || "http://localhost:3001";

async function fetchWithAuth(url: string, options: RequestInit = {}) {
	const cookieStore = await cookies();
	const cookieHeader = cookieStore
		.getAll()
		.map((c) => `${c.name}=${c.value}`)
		.join("; ");

	const response = await fetch(url, {
		...options,
		headers: {
			...options.headers,
			Cookie: cookieHeader,
		},
	});

	return response;
}

// ============ Agents API ============

export interface Agent {
	id: string;
	userId: string;
	name: string;
	slug: string;
	aiQuality: string;
	temperature: number;
	systemPrompt: string;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
}

export async function listAgents(): Promise<Agent[]> {
	const response = await fetchWithAuth(`${API_BASE}/agents`);

	if (!response.ok) {
		return [];
	}

	return response.json();
}

export async function getAgent(id: string): Promise<Agent | null> {
	const response = await fetchWithAuth(`${API_BASE}/agents/${id}`);

	if (!response.ok) {
		return null;
	}

	return response.json();
}

export async function getDefaultAgent(): Promise<Agent | null> {
	const agents = await listAgents();
	if (agents.length === 0) return null;
	return agents.find((a) => a.isDefault) || agents[0];
}

// ============ Q&A Sources API ============

export interface QaSource {
	id: string;
	agentId: string;
	questions: string[];
	answer: string;
	createdAt: string;
	updatedAt: string;
}

export async function listQaSources(agentId: string): Promise<QaSource[]> {
	const response = await fetchWithAuth(`${API_BASE}/qa-sources?agentId=${agentId}`);

	if (!response.ok) {
		return [];
	}

	return response.json();
}

// ============ Text Sources API ============

export interface TextSource {
	id: string;
	agentId: string;
	title: string;
	content?: string;
	createdAt: string;
	updatedAt: string;
}

export async function listTextSources(agentId: string): Promise<TextSource[]> {
	const response = await fetchWithAuth(`${API_BASE}/text-sources?agentId=${agentId}`);

	if (!response.ok) {
		return [];
	}

	return response.json();
}

// ============ Documents API ============

export interface Document {
	id: string;
	agentId: string;
	name: string;
	type: string;
	size: number;
	createdAt: string;
}

export async function listDocuments(agentId: string): Promise<Document[]> {
	const response = await fetchWithAuth(`${API_BASE}/documents?agentId=${agentId}`);

	if (!response.ok) {
		return [];
	}

	return response.json();
}

// ============ Conversations API ============

export interface Conversation {
	id: string;
	agentId: string;
	title: string;
	createdAt: string;
	updatedAt: string;
}

export async function listConversations(agentId: string): Promise<Conversation[]> {
	const response = await fetchWithAuth(`${API_BASE}/conversations?agentId=${agentId}`);

	if (!response.ok) {
		return [];
	}

	return response.json();
}

// ============ Usage API ============

export interface UsageData {
	messagesUsed: number;
	messagesLimit: number;
	planId: string;
	billingPeriodStart: string;
	billingPeriodEnd: string;
}

export async function getUsage(): Promise<UsageData | null> {
	const response = await fetchWithAuth(`${API_BASE}/usage`);

	if (!response.ok) {
		return null;
	}

	return response.json();
}

// ============ Session API ============

export interface Session {
	user: {
		id: string;
		name: string;
		email: string;
		image?: string;
	};
}

export async function getSession(): Promise<Session | null> {
	const response = await fetchWithAuth(`${API_BASE}/auth/get-session`);

	if (!response.ok) {
		return null;
	}

	return response.json();
}

// ============ Marketplace API (Server-safe) ============

export interface ToolTemplate {
	id: string;
	slug: string;
	name: string;
	description: string;
	longDescription: string | null;
	category: string;
	icon: string;
	isFree: boolean;
	installCount: number;
	requiredConfig: Array<{
		key: string;
		label: string;
		type: "text" | "password" | "url";
		placeholder?: string;
		helpText?: string;
		helpUrl?: string;
	}> | null;
}

// Server-safe version that doesn't use Shopify context (marketplace is public)
export async function listMarketplaceTools(): Promise<ToolTemplate[]> {
	const response = await fetch(`${API_BASE}/marketplace/tools`);

	if (!response.ok) {
		return [];
	}

	return response.json();
}

export async function getMarketplaceTool(slug: string): Promise<ToolTemplate | null> {
	const response = await fetch(`${API_BASE}/marketplace/tools/${encodeURIComponent(slug)}`);

	if (!response.ok) {
		return null;
	}

	return response.json();
}
