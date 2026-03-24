import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { CartItem } from '$lib/types.js';

function createCartStore() {
	let storageKey = 'cart_guest';

	function load(): CartItem[] {
		if (!browser) return [];
		try {
			const raw = localStorage.getItem(storageKey);
			return raw ? JSON.parse(raw) : [];
		} catch {
			return [];
		}
	}

	function save(items: CartItem[]) {
		if (!browser) return;
		try {
			localStorage.setItem(storageKey, JSON.stringify(items));
		} catch {
			// ignore
		}
	}

	const { subscribe, set, update } = writable<CartItem[]>(load());

	return {
		subscribe,
		initForUser(userId: string) {
			storageKey = `cart_${userId}`;
			set(load());
		},
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
