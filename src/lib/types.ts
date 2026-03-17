export interface PhotoPublic {
	id: string;
	eventId: string;
	watermarkUrl: string;
	width: number;
	height: number;
	bibNumbers: string[] | null;
	price: number;
	isPurchased?: boolean;
}

export interface EventPublic {
	id: string;
	slug: string;
	name: string;
	description: string | null;
	sport: string;
	location: string;
	city: string;
	eventDate: Date | string;
	coverUrl: string | null;
	status: 'draft' | 'active' | 'archived';
	packagePrice: number | null;
	photoCount?: number;
	isFuture?: boolean;
	previewPhotos?: string[]; // watermark URLs for card mosaic
}

export interface CartItem {
	photoId: string;
	eventName: string;
	watermarkUrl: string;
	price: number;
}

export interface OrderPublic {
	id: string;
	status: 'pending' | 'paid' | 'failed' | 'refunded';
	totalAmount: number;
	createdAt: Date | string;
	items: Array<{
		photoId: string;
		watermarkUrl: string;
		eventName: string;
		eventSlug: string;
		priceAtPurchase: number;
	}>;
}

export interface UserPublic {
	id: string;
	name: string;
	email: string;
	role: 'athlete' | 'photographer' | 'admin';
	avatarUrl: string | null;
}
