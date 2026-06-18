// Global toast state — module-level $state creates a singleton that persists across route changes,
// which is the intended behavior for toasts that should survive navigation.
type ToastType = 'success' | 'error' | 'info';

type Toast = {
	id: number;
	message: string;
	type: ToastType;
};

let toasts = $state<Toast[]>([]);
let nextId = 0;

export function getToasts(): Toast[] {
	return toasts;
}

export function dismissToast(id: number) {
	toasts = toasts.filter((t) => t.id !== id);
}

export function toast(message: string, type: ToastType = 'info') {
	const id = nextId++;
	toasts = [...toasts, { id, message, type }];
	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
	}, 4000);
}

export function toastSuccess(message: string) {
	toast(message, 'success');
}

export function toastError(message: string) {
	toast(message, 'error');
}

export function toastInfo(message: string) {
	toast(message, 'info');
}
