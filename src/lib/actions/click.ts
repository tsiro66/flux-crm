// Svelte action: suppress click navigation when the user dragged to select
// text (or clicked a nested interactive element) so selecting info from a
// row doesn't accidentally trigger the row's click handler.
//
// Usage on a clickable row:
//   <tr use:ignoreDragClick onclick={() => goto(`/...`)}>
//
// It works by recording the mousedown position; if pointerup moved beyond a
// small threshold we treat it as a drag-select and stop the subsequent click.
// We also bail when the target is inside a link/button/input/checkbox so the
// existing stopPropagation handlers on those still win.
export function ignoreDragClick(node: HTMLElement) {
	let down: { x: number; y: number; target: EventTarget | null } | null = null;
	const MOVE_THRESHOLD = 5;

	function isInteractive(target: EventTarget | null): boolean {
		if (!(target instanceof Element)) return false;
		return !!target.closest('a,button,input,select,textarea,[role="button"]');
	}

	function onPointerDown(e: PointerEvent) {
		down = { x: e.clientX, y: e.clientY, target: e.target };
	}

	function onPointerUp(e: PointerEvent) {
		if (!down) return;
		const dx = Math.abs(e.clientX - down.x);
		const dy = Math.abs(e.clientY - down.y);
		const dragged = dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD;
		const interactive = isInteractive(e.target);
		// If this was a drag-select (or landed on an interactive child), arm a
		// one-shot click blocker that stops the row click from firing.
		if (dragged || interactive) {
			const blocker = (ev: MouseEvent) => {
				ev.stopPropagation();
				ev.preventDefault();
				node.removeEventListener('click', blocker, true);
			};
			node.addEventListener('click', blocker, true);
			// Safety cleanup in case no click follows (e.g. pointer left the row).
			setTimeout(() => node.removeEventListener('click', blocker, true), 0);
		}
		down = null;
	}

	node.addEventListener('pointerdown', onPointerDown);
	node.addEventListener('pointerup', onPointerUp);

	return {
		destroy() {
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointerup', onPointerUp);
		}
	};
}
