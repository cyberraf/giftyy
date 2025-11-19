export type SimpleProduct = { id: string; name: string; price: string; image: string; discount?: number };

export type CollectionCategory =
	| 'celebrations'
	| 'family'
	| 'life-events'
	| 'seasonal-faith'
	| 'interests';

export type GiftCollection = {
	id: string;
	title: string;
	color: string;
	category: CollectionCategory;
	description: string;
	products: SimpleProduct[];
};

export const PRODUCTS: SimpleProduct[] = [
	{ id: '1', name: 'Curated Gift Box', price: '$49.99', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop' },
	{ id: '2', name: 'Memory Frame', price: '$29.99', image: 'https://images.unsplash.com/photo-1517456793572-8c0a0f4e6223?q=80&w=800&auto=format&fit=crop' },
	{ id: '3', name: 'Experience Voucher', price: '$89.00', image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=800&auto=format&fit=crop' },
	{ id: '4', name: 'Personalized Mug', price: '$19.99', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop' },
	{ id: '5', name: 'Scented Candle Set', price: '$24.99', image: 'https://images.unsplash.com/photo-1519681398221-94f8192a6d05?q=80&w=800&auto=format&fit=crop' },
	{ id: '6', name: 'Custom Photo Book', price: '$39.99', image: 'https://images.unsplash.com/photo-1457694587812-e8bf29a43845?q=80&w=800&auto=format&fit=crop' },
	{ id: '7', name: 'Chocolate Assortment', price: '$14.99', image: 'https://images.unsplash.com/photo-1481391032119-d89fee407e44?q=80&w=800&auto=format&fit=crop' },
	{ id: '8', name: 'Flower Bouquet', price: '$35.00', image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=800&auto=format&fit=crop' },
	{ id: '9', name: 'Spa Gift Basket', price: '$59.00', image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=800&auto=format&fit=crop' },
	{ id: '10', name: 'Handmade Journal', price: '$21.00', image: 'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?q=80&w=800&auto=format&fit=crop' },
	{ id: '11', name: 'Tea Sampler', price: '$18.50', image: 'https://images.unsplash.com/photo-1451748266019-527af3d64c05?q=80&w=800&auto=format&fit=crop' },
	{ id: '12', name: 'Cozy Blanket', price: '$42.00', image: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=800&auto=format&fit=crop' },
	{ id: '13', name: 'Leather Wallet', price: '$55.00', image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=800&auto=format&fit=crop' },
	{ id: '14', name: 'Portable Speaker', price: '$69.99', image: 'https://images.unsplash.com/photo-1518441982129-5bcf8f6dbfa0?q=80&w=800&auto=format&fit=crop' },
];

export const BIRTHDAY: SimpleProduct[] = [
	{ id: 'b1', name: 'Birthday Box', price: '$39.99', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop' },
	{ id: 'b2', name: 'Cake & Card', price: '$29.00', image: 'https://images.unsplash.com/photo-1541823709867-1b206113eafd?q=80&w=800&auto=format&fit=crop' },
	{ id: 'b3', name: 'Party Kit', price: '$49.00', image: 'https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=800&auto=format&fit=crop' },
];

export const VALENTINE: SimpleProduct[] = [
	{ id: 'v1', name: 'Roses & Chocolate', price: '$45.00', image: 'https://images.unsplash.com/photo-1519681399049-bbf3b0b0f6b0?q=80&w=800&auto=format&fit=crop' },
	{ id: 'v2', name: 'Love Letter Frame', price: '$34.00', image: 'https://images.unsplash.com/photo-1519681396690-4f6b1a3a0b51?q=80&w=800&auto=format&fit=crop' },
	{ id: 'v3', name: 'Couple’s Experience', price: '$99.00', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=800&auto=format&fit=crop' },
];

export const FATHERS: SimpleProduct[] = [
	{ id: 'f1', name: 'BBQ Tool Set', price: '$44.00', image: 'https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=800&auto=format&fit=crop' },
	{ id: 'f2', name: 'Leather Dopp Kit', price: '$52.00', image: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?q=80&w=800&auto=format&fit=crop' },
	{ id: 'f3', name: 'Whiskey Glasses', price: '$27.00', image: 'https://images.unsplash.com/photo-1514369118554-e20d93546b30?q=80&w=800&auto=format&fit=crop' },
];

export const MOTHERS: SimpleProduct[] = [
	{ id: 'm1', name: 'Spa Day Set', price: '$48.00', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop' },
	{ id: 'm2', name: 'Silk Scarf', price: '$36.00', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop' },
	{ id: 'm3', name: 'Tea & Cookies', price: '$25.00', image: 'https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=800&auto=format&fit=crop' },
];

export const CHRISTMAS: SimpleProduct[] = [
	{ id: 'c1', name: 'Holiday Hamper', price: '$69.00', image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?q=80&w=800&auto=format&fit=crop' },
	{ id: 'c2', name: 'Cozy Hat & Gloves', price: '$32.00', image: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?q=80&w=800&auto=format&fit=crop' },
	{ id: 'c3', name: 'Ornament Set', price: '$19.50', image: 'https://images.unsplash.com/photo-1479722842840-c0a823bd0cd6?q=80&w=800&auto=format&fit=crop' },
];

export const FOR_HER: SimpleProduct[] = [
	{ id: 'h1', name: 'Luxury Perfume Set', price: '$89.00', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=800&auto=format&fit=crop', discount: 15 },
	{ id: 'h2', name: 'Silk Scarf Collection', price: '$45.00', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop' },
	{ id: 'h3', name: 'Jewelry Box', price: '$65.00', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=800&auto=format&fit=crop', discount: 10 },
];

export const FOR_HIM: SimpleProduct[] = [
	{ id: 'mh1', name: 'Leather Wallet', price: '$55.00', image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=800&auto=format&fit=crop' },
	{ id: 'mh2', name: 'Premium Watch', price: '$199.00', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop', discount: 20 },
	{ id: 'mh3', name: 'Grooming Kit', price: '$39.00', image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=800&auto=format&fit=crop' },
];

export const FOR_KIDS: SimpleProduct[] = [
	{ id: 'k1', name: 'Educational Toy Set', price: '$34.00', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop' },
	{ id: 'k2', name: 'Art Supplies Kit', price: '$28.00', image: 'https://images.unsplash.com/photo-1606166186600-95e0b1e2b5b5?q=80&w=800&auto=format&fit=crop', discount: 12 },
	{ id: 'k3', name: 'Storybook Collection', price: '$42.00', image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=800&auto=format&fit=crop' },
];

export const FOR_TEENS: SimpleProduct[] = [
	{ id: 't1', name: 'Wireless Earbuds', price: '$79.00', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop', discount: 18 },
	{ id: 't2', name: 'Gaming Accessories', price: '$49.00', image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=800&auto=format&fit=crop' },
	{ id: 't3', name: 'Trendy Backpack', price: '$59.00', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop' },
];

type CollectionDefinition = {
	id: string;
	title: string;
	color: string;
	category: CollectionCategory;
	description: string;
	sources: SimpleProduct[][];
};

function createCollectionProducts(prefix: string, sources: SimpleProduct[][], limit = 4): SimpleProduct[] {
	const seen = new Set<string>();
	const items: SimpleProduct[] = [];

	for (const source of sources) {
		for (const product of source) {
			const key = product.id || `${product.name}-${product.image}`;
			if (seen.has(key)) continue;
			items.push({
				...product,
				id: `${prefix}-${items.length}-${product.id}`,
			});
			seen.add(key);
			if (items.length >= limit) {
				return items.slice(0, limit);
			}
		}
	}

	for (const fallback of PRODUCTS) {
		const key = fallback.id;
		if (seen.has(key)) continue;
		items.push({
			...fallback,
			id: `${prefix}-${items.length}-${fallback.id}`,
		});
		seen.add(key);
		if (items.length >= limit) {
			break;
		}
	}

	return items.slice(0, limit);
}

const COLLECTION_DEFINITIONS: CollectionDefinition[] = [
	{
		id: 'christmas',
		title: 'Christmas Magic',
		color: '#0B6C5B',
		category: 'celebrations',
		description: 'Festive picks wrapped in holiday sparkle.',
		sources: [CHRISTMAS, PRODUCTS.slice(8, 12)],
	},
	{
		id: 'his-birthday',
		title: 'His Birthday',
		color: '#1E3A5F',
		category: 'family',
		description: 'Surprises tailored for the men you celebrate.',
		sources: [FATHERS, PRODUCTS.slice(10, 14)],
	},
	{
		id: 'her-birthday',
		title: 'Her Birthday',
		color: '#C85A9D',
		category: 'family',
		description: 'Thoughtful indulgences for the women in your world.',
		sources: [FOR_HER, BIRTHDAY, PRODUCTS.slice(0, 4)],
	},
	{
		id: 'mothers-day',
		title: "Mother's Day",
		color: '#F7A4BE',
		category: 'family',
		description: 'Ways to spoil the moms and mother-figures you love.',
		sources: [MOTHERS, FOR_HER, PRODUCTS.slice(2, 6)],
	},
	{
		id: 'fathers-day',
		title: "Father's Day",
		color: '#0F4C5C',
		category: 'family',
		description: 'Grill, chill, and celebrate every kind of dad.',
		sources: [FATHERS, PRODUCTS.slice(6, 10)],
	},
	{
		id: 'anniversaries',
		title: 'Anniversaries',
		color: '#BE123C',
		category: 'celebrations',
		description: 'Celebrate milestones with romance-ready picks.',
		sources: [VALENTINE, PRODUCTS.slice(10, 14)],
	},
	{
		id: 'new-year',
		title: 'New Year Fresh Start',
		color: '#1E293B',
		category: 'celebrations',
		description: 'Reset and refresh with treats for the year ahead.',
		sources: [PRODUCTS.slice(0, 4), PRODUCTS.slice(6, 10)],
	},
	{
		id: 'eid-ramadan',
		title: 'Eid & Ramadan',
		color: '#0D9488',
		category: 'seasonal-faith',
		description: 'Share blessings and sweets for cherished traditions.',
		sources: [PRODUCTS.slice(4, 8), PRODUCTS.slice(8, 12)],
	},
	{
		id: 'graduations',
		title: 'Graduations',
		color: '#7C3AED',
		category: 'life-events',
		description: 'Honor hard work with congratulatory surprises.',
		sources: [PRODUCTS.slice(6, 10), PRODUCTS.slice(10, 14)],
	},
	{
		id: 'promotions',
		title: 'Promotions',
		color: '#2563EB',
		category: 'life-events',
		description: 'Raise a glass to new chapters in their career.',
		sources: [PRODUCTS.slice(2, 6), PRODUCTS.slice(6, 10)],
	},
	{
		id: 'get-well',
		title: 'Get Well Soon',
		color: '#14B8A6',
		category: 'life-events',
		description: 'Comforting bundles to help them feel better, faster.',
		sources: [PRODUCTS.slice(0, 4), PRODUCTS.slice(8, 12)],
	},
	{
		id: 'baby-shower',
		title: 'Baby Shower',
		color: '#F0ABFC',
		category: 'life-events',
		description: 'Playful presents for parents-to-be and their little one.',
		sources: [PRODUCTS.slice(1, 5), PRODUCTS.slice(8, 12)],
	},
	{
		id: 'new-baby',
		title: 'New Baby',
		color: '#60A5FA',
		category: 'life-events',
		description: 'Celebrate the newest arrival with gentle, joyful picks.',
		sources: [PRODUCTS.slice(0, 4), PRODUCTS.slice(4, 8)],
	},
	{
		id: 'weddings',
		title: 'Weddings',
		color: '#F97316',
		category: 'celebrations',
		description: 'Elevated gifts made for tying the knot.',
		sources: [VALENTINE, PRODUCTS.slice(2, 6)],
	},
	{
		id: 'new-mom',
		title: 'New Mom',
		color: '#DB2777',
		category: 'family',
		description: 'Nurturing treats to celebrate her newest role.',
		sources: [MOTHERS, PRODUCTS.slice(0, 4)],
	},
	{
		id: 'grandparents',
		title: 'Grandparents',
		color: '#78350F',
		category: 'family',
		description: 'Heartfelt comforts tailored for the elders you adore.',
		sources: [PRODUCTS.slice(6, 10), PRODUCTS.slice(0, 4)],
	},
	{
		id: 'toddlers',
		title: 'For Toddlers',
		color: '#F59E0B',
		category: 'interests',
		description: 'Playful picks guaranteed to spark tiny imaginations.',
		sources: [PRODUCTS.slice(4, 8), PRODUCTS.slice(8, 12)],
	},
	{
		id: 'techies',
		title: 'For Techies',
		color: '#1D4ED8',
		category: 'interests',
		description: 'Sleek gadgets and smart accessories for early adopters.',
		sources: [PRODUCTS.slice(12, 14), PRODUCTS.slice(2, 6)],
	},
];

export const COLLECTION_CATEGORY_METADATA: Array<{
	key: CollectionCategory;
	label: string;
	description: string;
}> = [
	{ key: 'celebrations', label: 'Celebrations & Holidays', description: 'Festive sets for birthdays, anniversaries, and parties.' },
	{ key: 'family', label: 'Family & Relationships', description: 'Tailored collections for the people closest to you.' },
	{ key: 'life-events', label: 'Life Events', description: 'Help them mark big milestones and new beginnings.' },
	{ key: 'seasonal-faith', label: 'Seasonal & Faith', description: 'Thoughtful picks that honor traditions and sacred moments.' },
	{ key: 'interests', label: 'Interests & Age Groups', description: 'Curated gifts for hobbies, passions, and playful spirits.' },
];

export const COLLECTIONS: GiftCollection[] = COLLECTION_DEFINITIONS.map((definition) => ({
	id: definition.id,
	title: definition.title,
	color: definition.color,
	category: definition.category,
	description: definition.description,
	products: createCollectionProducts(definition.id, definition.sources),
}));

