"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Markdown } from "tiptap-markdown";

export interface MarkdownEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	height?: number;
	className?: string;
	onSubmit?: () => void;
	onBlur?: () => void;
	disabled?: boolean;
}

export function MarkdownEditor({
	value,
	onChange,
	placeholder = "Type your message...",
	height = 200,
	className,
	onSubmit,
	onBlur,
	disabled = false,
}: MarkdownEditorProps) {
	const isInternalChange = useRef(false);
	const [isFocused, setIsFocused] = useState(false);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: false, // Disable headings for email composition
			}),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "text-primary underline",
				},
			}),
			Placeholder.configure({ placeholder }),
			Markdown,
		],
		content: value,
		editable: !disabled,
		onUpdate: ({ editor }) => {
			isInternalChange.current = true;
			const markdown = editor.storage.markdown.getMarkdown();
			onChange(markdown);
		},
		onFocus: () => {
			setIsFocused(true);
		},
		onBlur: () => {
			setIsFocused(false);
			onBlur?.();
		},
		editorProps: {
			attributes: {
				class: "outline-none min-h-[100px] p-3",
			},
		},
	});

	// Sync external value changes (e.g., "Use this" button, or clearing after submit)
	useEffect(() => {
		if (!editor) return;

		// Always allow clearing the editor (e.g., after submit)
		// Otherwise respect internal change flag to avoid cursor jumps
		if (value === "") {
			const currentMarkdown = editor.storage.markdown.getMarkdown();
			if (currentMarkdown !== "") {
				editor.commands.clearContent();
			}
			isInternalChange.current = false;
			return;
		}

		if (isInternalChange.current) {
			isInternalChange.current = false;
			return;
		}
		const currentMarkdown = editor.storage.markdown.getMarkdown();
		if (value !== currentMarkdown) {
			editor.commands.setContent(value);
		}
	}, [editor, value]);

	// Sync disabled state
	useEffect(() => {
		if (!editor) return;
		editor.setEditable(!disabled);
	}, [editor, disabled]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				onSubmit?.();
			}
		},
		[onSubmit],
	);

	const setLink = useCallback(() => {
		if (!editor) return;
		const previousUrl = editor.getAttributes("link").href;
		const url = window.prompt("URL", previousUrl);
		if (url === null) return;
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	}, [editor]);

	if (!editor) return null;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Tiptap editor handles its own focus and keyboard events
		<div className={className} onKeyDown={handleKeyDown}>
			{/* Toolbar - only visible when focused */}
			{isFocused && (
				<div
					className={`flex items-center gap-0.5 p-1.5 border border-b-0 rounded-t-md bg-muted/50 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
					onMouseDown={(e) => e.preventDefault()} // Prevent editor blur when clicking toolbar
				>
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleBold().run()}
						active={editor.isActive("bold")}
						title="Bold (⌘B)"
						disabled={disabled}
					>
						<BoldIcon />
					</ToolbarButton>
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleItalic().run()}
						active={editor.isActive("italic")}
						title="Italic (⌘I)"
						disabled={disabled}
					>
						<ItalicIcon />
					</ToolbarButton>
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleStrike().run()}
						active={editor.isActive("strike")}
						title="Strikethrough"
						disabled={disabled}
					>
						<StrikethroughIcon />
					</ToolbarButton>

					<Divider />

					<ToolbarButton
						onClick={setLink}
						active={editor.isActive("link")}
						title="Link"
						disabled={disabled}
					>
						<LinkIcon />
					</ToolbarButton>

					<Divider />

					<ToolbarButton
						onClick={() => editor.chain().focus().toggleBulletList().run()}
						active={editor.isActive("bulletList")}
						title="Bullet List"
						disabled={disabled}
					>
						<ListIcon />
					</ToolbarButton>
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
						active={editor.isActive("orderedList")}
						title="Numbered List"
						disabled={disabled}
					>
						<ListOrderedIcon />
					</ToolbarButton>

					<Divider />

					<ToolbarButton
						onClick={() => editor.chain().focus().toggleCodeBlock().run()}
						active={editor.isActive("codeBlock")}
						title="Code Block"
						disabled={disabled}
					>
						<CodeIcon />
					</ToolbarButton>
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleBlockquote().run()}
						active={editor.isActive("blockquote")}
						title="Quote"
						disabled={disabled}
					>
						<QuoteIcon />
					</ToolbarButton>
				</div>
			)}

			{/* Editor */}
			<div
				className={`border ${isFocused ? "rounded-b-md" : "rounded-md"} bg-background overflow-auto ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
				style={{ minHeight: height }}
			>
				<EditorContent
					editor={editor}
					className="text-sm prose-sm prose dark:prose-invert max-w-none"
				/>
			</div>
		</div>
	);
}

// Toolbar button component
function ToolbarButton({
	onClick,
	active,
	title,
	children,
	disabled = false,
}: {
	onClick: () => void;
	active: boolean;
	title: string;
	children: React.ReactNode;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
			title={title}
			disabled={disabled}
			className={`p-1.5 rounded-sm transition-colors ${
				active
					? "bg-accent text-accent-foreground"
					: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
			} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
		>
			{children}
		</button>
	);
}

function Divider() {
	return <div className="w-px h-5 mx-1 bg-border" />;
}

// Icons
const BoldIcon = () => (
	<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
		<path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
		<path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
	</svg>
);

const ItalicIcon = () => (
	<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M19 4h-9M14 20H5M15 4L9 20" />
	</svg>
);

const StrikethroughIcon = () => (
	<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M16 4H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H8" />
		<path d="M4 12h16" />
	</svg>
);

const LinkIcon = () => (
	<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
		<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
	</svg>
);

const ListIcon = () => (
	<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
	</svg>
);

const ListOrderedIcon = () => (
	<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M10 6h11M10 12h11M10 18h11" />
		<path d="M4 6h1v4M4 10h2M4 14h2l-2 4h2" />
	</svg>
);

const CodeIcon = () => (
	<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<polyline points="16 18 22 12 16 6" />
		<polyline points="8 6 2 12 8 18" />
	</svg>
);

const QuoteIcon = () => (
	<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
		<path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
	</svg>
);
