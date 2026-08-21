"use client";

import { Check, Copy, Terminal } from "lucide-react";
import {
	Children,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useCallback,
	useState,
} from "react";

function extractLanguage(children: ReactNode): string | null {
	const child = Children.only(children) as ReactElement<{
		className?: string;
	}>;
	if (isValidElement(child) && typeof child.props.className === "string") {
		const match = child.props.className.match(/language-(\w+)/);
		if (match) return match[1];
	}
	return null;
}

function extractText(node: ReactNode): string {
	if (typeof node === "string") return node;
	if (typeof node === "number") return String(node);
	if (!node) return "";
	if (Array.isArray(node)) return node.map(extractText).join("");
	if (isValidElement(node)) {
		return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
	}
	return "";
}

export function CodeBlockPre({ children }: { children: ReactNode }) {
	const [copied, setCopied] = useState(false);
	const language = extractLanguage(children);
	const text = extractText(children);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [text]);

	return (
		<div className="group/code my-6 border border-[#333] bg-[#1A1A1A]">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-[#333] px-4 py-2">
				<div className="flex items-center gap-2">
					<Terminal size={12} className="text-[#555]" />
					<span className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
						{language || "code"}
					</span>
				</div>
				<button
					type="button"
					onClick={handleCopy}
					className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#555] transition-colors hover:text-[#E5E5E5]"
				>
					{copied ? (
						<>
							<Check size={12} />
							<span>Copied</span>
						</>
					) : (
						<>
							<Copy size={12} />
							<span>Copy</span>
						</>
					)}
				</button>
			</div>
			{/* Code */}
			<pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-[#E5E5E5]">
				{children}
			</pre>
		</div>
	);
}
