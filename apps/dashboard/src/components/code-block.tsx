"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type TokenType =
	| "keyword"
	| "string"
	| "comment"
	| "function"
	| "variable"
	| "property"
	| "operator"
	| "plain";

interface Token {
	type: TokenType;
	value: string;
}

const tokenColors: Record<TokenType, string> = {
	keyword: "text-purple-600",
	string: "text-green-600",
	comment: "text-[#888]",
	function: "text-blue-600",
	variable: "text-orange-600",
	property: "text-cyan-600",
	operator: "text-pink-600",
	plain: "text-[#1A1A1A]",
};

// Simple tokenizer for syntax highlighting
function tokenizeLine(line: string, language: string): Token[] {
	const tokens: Token[] = [];

	if (language === "typescript" || language === "javascript") {
		let remaining = line;
		while (remaining.length > 0) {
			// Comments
			if (remaining.startsWith("//")) {
				tokens.push({ type: "comment", value: remaining });
				break;
			}
			// Strings (single or double quotes)
			const stringMatch = remaining.match(/^(['"`])(?:[^\\]|\\.)*?\1/);
			if (stringMatch) {
				tokens.push({ type: "string", value: stringMatch[0] });
				remaining = remaining.slice(stringMatch[0].length);
				continue;
			}
			// Keywords
			const keywordMatch = remaining.match(
				/^(import|from|const|let|var|await|async|function|return|new|export|default|if|else|for|while|window|document|true|false)\b/,
			);
			if (keywordMatch) {
				tokens.push({ type: "keyword", value: keywordMatch[0] });
				remaining = remaining.slice(keywordMatch[0].length);
				continue;
			}
			// Function calls
			const funcMatch = remaining.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
			if (funcMatch) {
				tokens.push({ type: "function", value: funcMatch[1] });
				remaining = remaining.slice(funcMatch[1].length);
				continue;
			}
			// Property access
			const propMatch = remaining.match(/^\.([a-zA-Z_$][a-zA-Z0-9_$]*)/);
			if (propMatch) {
				tokens.push({ type: "plain", value: "." });
				tokens.push({ type: "property", value: propMatch[1] });
				remaining = remaining.slice(propMatch[0].length);
				continue;
			}
			// Operators
			const opMatch = remaining.match(/^(=>|===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|^~?:])/);
			if (opMatch) {
				tokens.push({ type: "operator", value: opMatch[0] });
				remaining = remaining.slice(opMatch[0].length);
				continue;
			}
			// Default: single character
			tokens.push({ type: "plain", value: remaining[0] });
			remaining = remaining.slice(1);
		}
	} else {
		// Default: no highlighting
		tokens.push({ type: "plain", value: line });
	}

	return tokens;
}

interface CodeBlockProps {
	code: string;
	language?: string;
	showLineNumbers?: boolean;
	showHeader?: boolean;
	className?: string;
}

export function CodeBlock({
	code,
	language = "javascript",
	showLineNumbers = true,
	showHeader = true,
	className = "",
}: CodeBlockProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const lines = code.split("\n");

	return (
		<div className={`relative overflow-hidden border border-[#D1D1D1] bg-white ${className}`}>
			{showHeader && (
				<div className="flex items-center justify-between border-b border-[#D1D1D1] bg-[#FAFAF9] px-3 py-1.5">
					<div className="flex items-center gap-2">
						<span className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
							{language}
						</span>
					</div>
					<button
						type="button"
						onClick={handleCopy}
						className="flex items-center gap-1 px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-[#888] hover:text-[#1A1A1A] transition-colors"
					>
						{copied ? (
							<>
								<Check className="w-3 h-3" />
								Copied!
							</>
						) : (
							<>
								<Copy className="w-3 h-3" />
								Copy
							</>
						)}
					</button>
				</div>
			)}
			<div className="bg-[#F3F2EE]">
				<pre className="p-3 text-[10px] font-mono leading-relaxed">
					{lines.map((line, lineIdx) => (
						<div key={lineIdx} className="flex">
							{showLineNumbers && (
								<span className="inline-block w-5 mr-4 text-right select-none shrink-0 text-[#888]">
									{lineIdx + 1}
								</span>
							)}
							<code className="break-all whitespace-pre-wrap">
								{tokenizeLine(line, language).map((token, tokenIdx) => (
									<span key={tokenIdx} className={tokenColors[token.type]}>
										{token.value}
									</span>
								))}
							</code>
						</div>
					))}
				</pre>
			</div>
		</div>
	);
}
