import type React from "react";

// Process inline markdown (bold, italic, links, code)
function processInlineMarkdown(line: string, i: number, j: number): React.ReactNode {
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
					className="text-blue-600 dark:text-blue-400 underline"
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
					className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm"
				>
					{part.slice(1, -1)}
				</code>
			);
		}

		// Plain text
		return part;
	});
}

// Simple markdown renderer for common patterns
export function renderMarkdown(text: string): React.ReactNode {
	if (!text) return text;

	// Split by code blocks first to preserve them
	const parts = text.split(/(```[\s\S]*?```)/g);

	return parts.map((part, i) => {
		// Code blocks
		if (part.startsWith("```")) {
			const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
			if (match) {
				const code = match[2].trim();
				return (
					<pre
						key={i}
						className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto text-sm my-2"
					>
						<code>{code}</code>
					</pre>
				);
			}
		}

		// Process inline markdown
		const lines = part.split("\n");

		// Group consecutive list items
		const elements: React.ReactNode[] = [];
		let currentListItems: { key: string; content: React.ReactNode }[] = [];

		const flushList = () => {
			if (currentListItems.length > 0) {
				elements.push(
					<ul key={`list-${elements.length}`} className="my-2 pl-5 list-disc">
						{currentListItems.map((item) => (
							<li key={item.key} className="mb-1">
								{item.content}
							</li>
						))}
					</ul>,
				);
				currentListItems = [];
			}
		};

		lines.forEach((line, j) => {
			// Check for list items (- or *)
			const listMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
			if (listMatch) {
				currentListItems.push({
					key: `${i}-${j}`,
					content: processInlineMarkdown(listMatch[1], i, j),
				});
				return;
			}

			// Not a list item, flush any pending list
			flushList();

			// Empty line
			if (!line.trim()) {
				elements.push(<br key={`${i}-${j}`} />);
				return;
			}

			// Regular line
			elements.push(
				<span key={`${i}-${j}`}>
					{processInlineMarkdown(line, i, j)}
					{j < lines.length - 1 && <br />}
				</span>,
			);
		});

		// Flush any remaining list items
		flushList();

		return <span key={i}>{elements}</span>;
	});
}
