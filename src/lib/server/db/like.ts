// Shared LIKE-pattern helper. Escape SQL LIKE wildcards (`%`, `_`, `\`) so a
// search string the user typed can never alter the pattern shape. Use this
// everywhere we build an `ilike('%...%')` query.
export function escapeLike(str: string): string {
	return str.replace(/[%_\\]/g, '\\$&');
}

export function likePattern(str: string): string {
	return `%${escapeLike(str)}%`;
}
