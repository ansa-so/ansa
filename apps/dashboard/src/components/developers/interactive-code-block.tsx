"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

function highlightCode(code: string, lang: string): string {
	let html = code;
	const tokens: Array<{ placeholder: string; html: string }> = [];

	if (lang === "bash") {
		// Use placeholders to avoid regex conflicts
		html = html.replace(/(curl|https?:\/\/[^\s\\]+)/g, (match) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `<span style="color: #7DD3FC">${match}</span>` });
			return placeholder;
		});
		html = html.replace(/(-H|-d)/g, (match) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `<span style="color: #C084FC">${match}</span>` });
			return placeholder;
		});
		html = html.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `<span style="color: #86EFAC">${match}</span>` });
			return placeholder;
		});
		html = html.replace(/(\$\w+)/g, (match) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `<span style="color: #FCD34D">${match}</span>` });
			return placeholder;
		});
	}

	if (lang === "javascript") {
		html = html.replace(/(\/\/[^\n]*)/g, (match) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `<span style="color: #6B7280">${match}</span>` });
			return placeholder;
		});
		html = html.replace(/\b(const|let|var|function|await|async)\b/g, (match) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `<span style="color: #C084FC">${match}</span>` });
			return placeholder;
		});
		html = html.replace(/\b(ansa)\b/g, (match) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `<span style="color: #7DD3FC">${match}</span>` });
			return placeholder;
		});
		html = html.replace(/\.(identify|open|showForm|trigger|showBubbles)\b/g, (match) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `.<span style="color: #FCD34D">${match.slice(1)}</span>` });
			return placeholder;
		});
		html = html.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `<span style="color: #86EFAC">${match}</span>` });
			return placeholder;
		});
		html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, (match) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `<span style="color: #F9A8D4">${match}</span>` });
			return placeholder;
		});
	}

	if (lang === "json") {
		html = html.replace(/(\/\/[^\n]*)/g, (match) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `<span style="color: #6B7280">${match}</span>` });
			return placeholder;
		});
		html = html.replace(/(POST|GET|PUT|DELETE)(\s+)(\/[^\s]*)/g, (match, method, space, path) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({
				placeholder,
				html: `<span style="color: #C084FC">${method}</span>${space}<span style="color: #7DD3FC">${path}</span>`,
			});
			return placeholder;
		});
		html = html.replace(/("(?:[^"\\]|\\.)*")(\s*):/g, (match, key, space) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `<span style="color: #FCD34D">${key}</span>${space}:` });
			return placeholder;
		});
		html = html.replace(/:\s*("(?:[^"\\]|\\.)*")/g, (match, value) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `: <span style="color: #86EFAC">${value}</span>` });
			return placeholder;
		});
		html = html.replace(/:\s*(true|false|null)\b/g, (match, value) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `: <span style="color: #F9A8D4">${value}</span>` });
			return placeholder;
		});
		html = html.replace(/:\s*(\d+(?:\.\d+)?)\b/g, (match, value) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `: <span style="color: #F9A8D4">${value}</span>` });
			return placeholder;
		});
		html = html.replace(/({{[^}]+}})/g, (match) => {
			const placeholder = `__TOKEN_${tokens.length}__`;
			tokens.push({ placeholder, html: `<span style="color: #FCD34D">${match}</span>` });
			return placeholder;
		});
	}

	// Replace all placeholders with actual HTML
	tokens.forEach(({ placeholder, html: tokenHtml }) => {
		html = html.replace(placeholder, tokenHtml);
	});

	return html;
}

const snippets: Record<
	string,
	{
		lang: string;
		label: string;
		code: string;
	}
> = {
	completion: {
		lang: "bash",
		label: "POST /chat",
		code: `curl https://api.ansa.so/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $ANSA_API_KEY" \\
  -d '{
    "message": "Reset my password",
    "agentId": "agent_123",
    "streaming": true
  }'`,
	},
	identity: {
		lang: "javascript",
		label: "User Identity",
		code: `// Identify user for personalization
ansa.identify({
  userId: "user_123",
  userMetadata: {
    name: "Jane Smith",
    email: "jane@example.com",
    plan: "enterprise",
    accountId: "acc_456"
  }
});

// Identity is available in HTTP tools and triggers
// Use {{userId}} and {{userMetadata.plan}} in tool configs`,
	},
	widget: {
		lang: "javascript",
		label: "Widget Control",
		code: `// Programmatic widget control
ansa.open("How can I help you?");

// Show a form
ansa.showForm({
  name: "contact_form",
  toolId: "tool_abc123"
});

// Fire custom events for triggers
ansa.trigger("purchase_completed", {
  orderId: "12345",
  amount: 299.99
});

// Display notification bubbles
ansa.showBubbles(["Need help? Chat with us!"], 5000);`,
	},
	httpTool: {
		lang: "json",
		label: "HTTP Tool",
		code: `// Create a tool that connects to your API
POST /tools

{
  "agentId": "agent_123",
  "name": "get_order_status",
  "description": "Check order status for customer",
  "executionType": "http",
  "httpUrl": "https://api.yourstore.com/orders/{{orderId}}",
  "httpMethod": "GET",
  "httpHeaders": {
    "Authorization": "Bearer {{userMetadata.apiToken}}"
  }
}`,
	},
	webhook: {
		lang: "json",
		label: "Form Webhooks",
		code: `// Configure form with webhook and Slack notification
{
  "formSchema": {
    "fields": [
      { "name": "email", "type": "email", "label": "Email" },
      { "name": "message", "type": "textarea", "label": "Message" }
    ]
  },
  "formWebhookUrl": "https://your-api.com/leads",
  "formPostActions": [
    {
      "type": "slack",
      "webhookUrl": "https://hooks.slack.com/services/...",
      "messageTemplate": "New lead: {{email}}\\n{{message}}"
    }
  ]
}`,
	},
};

export function InteractiveCodeBlock() {
	const [activeTab, setActiveTab] = useState("completion");
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="lg:col-span-7 bg-[#1A1A1A] text-[#F3F2EE] p-1 rounded-lg lg:rounded-none relative shadow-2xl overflow-hidden min-h-[500px] flex">
			{/* Sidebar inside Code Block */}
			<div className="w-48 border-r border-[#333] bg-[#111] flex flex-col pt-4">
				<div className="px-4 mb-4 text-[10px] font-mono text-[#666] uppercase tracking-widest">
					Examples
				</div>
				{[
					{ id: "completion", label: "Chat Completion" },
					{ id: "identity", label: "User Identity" },
					{ id: "widget", label: "Widget Control" },
					{ id: "httpTool", label: "HTTP Tool" },
					{ id: "webhook", label: "Form Webhooks" },
				].map((item) => (
					<button
						key={item.id}
						type="button"
						onClick={() => setActiveTab(item.id)}
						className={`
                    w-full text-left px-4 py-3 text-xs font-mono transition-colors border-l-2
                    ${
											activeTab === item.id
												? "border-green-500 bg-[#1A1A1A] text-white"
												: "border-transparent text-[#666] hover:text-[#BBB] hover:bg-[#1A1A1A]"
										}
                  `}
					>
						{item.label}
					</button>
				))}
			</div>

			{/* Code Display */}
			<div className="flex flex-col flex-1">
				<div className="h-12 border-b border-[#333] flex items-center justify-between px-6 bg-[#151515]">
					<div className="flex items-center gap-2">
						<div className="w-2.5 h-2.5 rounded-full bg-red-500/20 text-red-500" />
						<div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 text-yellow-500" />
						<div className="w-2.5 h-2.5 rounded-full bg-green-500/20 text-green-500" />
					</div>
					<div className="font-mono text-[10px] text-[#666] uppercase">
						{snippets[activeTab].label}
					</div>
					<button
						type="button"
						onClick={handleCopy}
						className="text-[#666] hover:text-white transition-colors"
					>
						{copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
					</button>
				</div>
				<div className="flex-1 p-6 overflow-auto font-mono text-sm custom-scrollbar">
					<pre
						className="text-[#CCC] whitespace-pre-wrap leading-relaxed"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlighting of hardcoded docs snippets defined in this file
						dangerouslySetInnerHTML={{
							__html: highlightCode(snippets[activeTab].code, snippets[activeTab].lang),
						}}
					/>
				</div>
				<div className="h-8 border-t border-[#333] bg-[#111] flex items-center px-4 gap-4 text-[10px] font-mono text-[#555]">
					<span>STATUS: 200 OK</span>
					<span>LATENCY: 42ms</span>
					<span>REGION: us-east-1</span>
				</div>
			</div>
		</div>
	);
}
