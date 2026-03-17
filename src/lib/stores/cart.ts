import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { CartItem } from '$lib/types.js';

function createCartStore() {
	const STORAGE_KEY = 'promoment_cart';

	function load(): CartItem[] {
		if (!browser) return [];
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			return raw ? JSON.parse(raw) : [];
		} catch {
			return [];
		}
	}

	function save(items: CartItem[]) {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
		} catch {
			// ignore
		}
	}

	const { subscribe, set, update } = writable<CartItem[]>(load());

	return {
		subscribe,
		addToCart(item: CartItem) {
			update((items) => {
				if (items.some((i) => i.photoId === item.photoId)) return items;
				const updated = [...items, item];
				save(updated);
				return updated;
			});
		},
		removeFromCart(photoId: string) {
			update((items) => {
				const updated = items.filter((i) => i.photoId !== photoId);
				save(updated);
				return updated;
			});
		},
		clearCart() {
			set([]);
			save([]);
		},
		isInCart(photoId: string): boolean {
			let result = false;
			subscribe((items) => {
				result = items.some((i) => i.photoId === photoId);
			})();
			return result;
		}
	};
}

export const cart = createCartStore();

export const cartCount = derived(cart, ($cart) => $cart.length);

export const cartTotal = derived(cart, ($cart) =>
	$cart.reduce((sum, item) => sum + item.price, 0)
);

export const cartIds = derived(cart, ($cart) => $cart.map((i) => i.photoId));

export function formatPrice(cents: number): string {
	return new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: 'BRL'
	}).format(cents / 100);
}
