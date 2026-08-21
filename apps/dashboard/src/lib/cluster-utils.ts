/**
 * UUID validation regex pattern
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID
 */
export function isValidUUID(value: string | null | undefined): boolean {
	if (!value) return false;
	return UUID_REGEX.test(value);
}
