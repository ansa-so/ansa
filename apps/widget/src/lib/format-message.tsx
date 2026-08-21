import React from "react";
import { CodeBlock } from "../components/CodeBlock";

// Simple markdown renderer for common patterns
export function renderMarkdown(text: string, isDark: boolean): React.ReactNode {
	if (!text) return text;

	// Split by code blocks first to preserve them (both complete and incomplete for streaming)
	// Match complete code blocks: ```...``` OR incomplete ones: ```... (no closing)
	const parts = text.split(/(```[\s\S]*?```|```[\s\S]*$)/g);

	return parts.map((part, i) => {
		// Code blocks (complete or incomplete during streaming)
		if (part.startsWith("```")) {
			// Try complete code block first
			const completeMatch = part.match(/```(\w*)\n?([\s\S]*?)```/);
			if (completeMatch) {
				const language = completeMatch[1] || "";
				const code = completeMatch[2].trim();
				return <CodeBlock key={i} code={code} language={language} isDark={isDark} />;
			}

			// Handle incomplete code block (streaming) - no closing ```
			const incompleteMatch = part.match(/```(\w*)\n?([\s\S]*)$/);
			if (incompleteMatch) {
				const language = incompleteMatch[1] || "";
				const code = incompleteMatch[2] || "";
				// Show the code block even while streaming (content may be empty or partial)
				return <CodeBlock key={i} code={code} language={language} isDark={isDark} />;
			}
		}

		// Process inline markdown
		const lines = part.split("\n");

		// Group consecutive list items
		const elements: React.ReactNode[] = [];
		let currentListItems: { key: string; content: React.ReactNode; number?: number }[] = [];
		let lastWasEmpty = false; // Track consecutive empty lines

		const flushList = () => {
			if (currentListItems.length > 0) {
				const isNumbered = currentListItems[0].number !== undefined;
				elements.push(
					<div
						key={`list-${elements.length}`}
						style={{
							marginTop: "8px",
							backgroundColor: isDark ? "rgba(55, 65, 81, 0.5)" : "#FAFAF9",
							borderRadius: "12px",
							border: isDark ? "1px solid #4B5563" : "1px solid #E5E5E5",
							overflow: "hidden",
						}}
					>
						{currentListItems.map((item, idx) => (
							<div
								key={item.key}
								style={{
									display: "flex",
									alignItems: "flex-start",
									gap: "12px",
									padding: "12px",
									borderBottom:
										idx < currentListItems.length - 1
											? isDark
												? "1px solid #4B5563"
												: "1px solid #E5E5E5"
											: "none",
									fontSize: "14px",
								}}
							>
								<div
									style={{
										marginTop: "2px",
										width: "20px",
										height: "20px",
										borderRadius: "50%",
										backgroundColor: isDark ? "#9CA3AF" : "#1A1A1A",
										color: isDark ? "#1F2937" : "white",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										flexShrink: 0,
										fontSize: isNumbered ? "11px" : undefined,
										fontWeight: isNumbered ? 700 : undefined,
									}}
								>
									{isNumbered ? (
										item.number
									) : (
										<svg
											width="8"
											height="8"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="3"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<polyline points="20 6 9 17 4 12" />
										</svg>
									)}
								</div>
								<span style={{ color: isDark ? "#D1D5DB" : "#555", lineHeight: "1.4" }}>
									{item.content}
								</span>
							</div>
						))}
					</div>,
				);
				currentListItems = [];
			}
		};

		lines.forEach((line, j) => {
			// Check for bullet list items (- or *)
			const bulletMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
			if (bulletMatch) {
				// Flush if switching from numbered to bullet list
				if (currentListItems.length > 0 && currentListItems[0].number !== undefined) {
					flushList();
				}
				currentListItems.push({
					key: `${i}-${j}`,
					content: processInlineMarkdown(bulletMatch[1], i, j, isDark),
				});
				lastWasEmpty = false;
				return;
			}

			// Check for numbered list items (1., 2., 3.)
			const numberedMatch = line.match(/^[\s]*(\d+)\.\s+(.+)$/);
			if (numberedMatch) {
				// Flush if switching from bullet to numbered list
				if (currentListItems.length > 0 && currentListItems[0].number === undefined) {
					flushList();
				}
				currentListItems.push({
					key: `${i}-${j}`,
					content: processInlineMarkdown(numberedMatch[2], i, j, isDark),
					number: parseInt(numberedMatch[1], 10),
				});
				lastWasEmpty = false;
				return;
			}

			// Not a list item, flush any pending list
			flushList();

			// Empty line - skip consecutive empty lines and lines at boundaries
			if (!line.trim()) {
				// Only add a break if: not at start, not at end, and last wasn't empty
				if (j > 0 && j < lines.length - 1 && !lastWasEmpty && elements.length > 0) {
					elements.push(<br key={`${i}-${j}`} />);
				}
				lastWasEmpty = true;
				return;
			}

			lastWasEmpty = false;

			// Regular line - process <br> tags first
			const lineWithBr = processBrTags(line, i, j, isDark);
			elements.push(
				<span key={`${i}-${j}`}>
					{lineWithBr}
					{j < lines.length - 1 && lines[j + 1]?.trim() && <br />}
				</span>,
			);
		});

		// Flush any remaining list items
		flushList();

		return <React.Fragment key={i}>{elements}</React.Fragment>;
	});
}

// Process <br> tags and inline markdown
function processBrTags(line: string, i: number, j: number, isDark: boolean): React.ReactNode {
	// Split by <br>, <br/>, or <br /> tags
	const parts = line.split(/<br\s*\/?>/gi);

	if (parts.length === 1) {
		// No <br> tags found, process inline markdown directly
		return processInlineMarkdown(line, i, j, isDark);
	}

	// Process each part and insert <br /> between them
	return parts.map((part, k) => (
		<React.Fragment key={`${i}-${j}-br-${k}`}>
			{processInlineMarkdown(part, i, j, isDark)}
			{k < parts.length - 1 && <br />}
		</React.Fragment>
	));
}

// Process inline markdown (bold, italic, links, code)
function processInlineMarkdown(
	line: string,
	i: number,
	j: number,
	isDark: boolean,
): React.ReactNode {
	// Combine all patterns and process
	const allPatterns =
		/(\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;

	const parts = line.split(allPatterns);

	return parts.map((part, k) => {
		if (!part) return null;

		// Bold
		if (
			(part.startsWith("**") && part.endsWith("**")) ||
			(part.startsWith("__") && part.endsWith("__"))
		) {
			return <strong key={`${i}-${j}-${k}`}>{part.slice(2, -2)}</strong>;
		}

		// Italic (single * or _)
		if (
			(part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) ||
			(part.startsWith("_") && part.endsWith("_") && !part.startsWith("__"))
		) {
			return <em key={`${i}-${j}-${k}`}>{part.slice(1, -1)}</em>;
		}

		// Link
		const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
		if (linkMatch) {
			return (
				<a
					key={`${i}-${j}-${k}`}
					href={linkMatch[2]}
					target="_blank"
					rel="noopener noreferrer"
					style={{ color: isDark ? "#60a5fa" : "#2563eb", textDecoration: "underline" }}
				>
					{linkMatch[1]}
				</a>
			);
		}

		// Inline code
		if (part.startsWith("`") && part.endsWith("`")) {
			return (
				<code
					key={`${i}-${j}-${k}`}
					style={{
						backgroundColor: isDark ? "#374151" : "#e5e7eb",
						padding: "2px 6px",
						borderRadius: "4px",
						fontSize: "0.9em",
					}}
				>
					{part.slice(1, -1)}
				</code>
			);
		}

		// Plain text
		return part;
	});
}

export default renderMarkdown;
