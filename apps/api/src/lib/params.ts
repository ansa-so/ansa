import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Read a required path parameter, failing the request if it is absent.
 *
 * Hono widens `c.req.param()` to `string | undefined` as soon as middleware sits
 * in the handler chain, because it can no longer prove the route pattern
 * statically. Passing that straight into a query is a real bug and not just a
 * typing nuisance: Drizzle renders `eq(column, undefined)` as `column = null`,
 * which matches nothing and reads as "not found" rather than "bad request".
 */
export function requireParam(c: Context, name: string): string {
	const value = c.req.param(name);
	if (!value) {
		throw new HTTPException(400, { message: `Missing required path parameter: ${name}` });
	}
	return value;
}
