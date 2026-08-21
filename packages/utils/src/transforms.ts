/**
 * Tool block transformation utilities
 *
 * Shared utilities for transforming toolBlocks into widget-compatible
 * formBlock and blocks structures.
 */

import type { DisplayConfig, FormPostAction, ToolBlockData } from "@ansa/types";

/**
 * Represents a form block that can be rendered by the widget
 */
export interface FormBlock {
	type: "form";
	toolId: string;
	toolName: string;
	formSchema: unknown;
	executionMode: string;
	clientHandler?: string;
	toolArgs?: Record<string, unknown>;
	formPostActions?: FormPostAction[];
}

/**
 * Result of extracting form blocks from tool blocks
 */
export interface ExtractFormBlockResult {
	formBlock: FormBlock | null;
	nonFormBlocks: ToolBlockData[];
}

/**
 * Extract a FormBlock from toolBlocks array.
 * Separates form-type tool blocks from other tool blocks for widget rendering.
 *
 * @param toolBlocks - Array of tool block data from a chat message
 * @returns Object containing the extracted formBlock (if any) and remaining non-form blocks
 *
 * @example
 * ```ts
 * const { formBlock, nonFormBlocks } = extractFormBlock(message.toolBlocks);
 * if (formBlock) {
 *   // Render form UI
 * }
 * if (nonFormBlocks.length > 0) {
 *   // Render other tool results (products, tables, etc.)
 * }
 * ```
 */
export function extractFormBlock(
	toolBlocks: ToolBlockData[] | null | undefined,
): ExtractFormBlockResult {
	if (!toolBlocks || toolBlocks.length === 0) {
		return { formBlock: null, nonFormBlocks: [] };
	}

	const formToolBlock = toolBlocks.find((block) => block.displayConfig?.type === "form");

	if (formToolBlock && typeof formToolBlock.result === "object" && formToolBlock.result) {
		const formData = formToolBlock.result as {
			formSchema?: unknown;
			formExecutionMode?: string;
			formClientHandler?: string;
			formPostActions?: FormPostAction[];
			toolId?: string;
			toolArgs?: Record<string, unknown>;
		};

		const formBlock: FormBlock = {
			type: "form",
			toolId: formData.toolId || "",
			toolName: formToolBlock.toolName,
			formSchema: formData.formSchema,
			executionMode: formData.formExecutionMode || "webhook",
			clientHandler: formData.formClientHandler,
			toolArgs: formData.toolArgs,
			formPostActions: formData.formPostActions,
		};

		const nonFormBlocks = toolBlocks.filter((block) => block.displayConfig?.type !== "form");

		return { formBlock, nonFormBlocks };
	}

	return { formBlock: null, nonFormBlocks: toolBlocks };
}
