import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type Category = {
	id: string;
	name: string;
	slug: string;
	description?: string;
	imageUrl?: string;
	subcategories: string[]; // Array of subcategory names
	displayOrder: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

type CategoriesContextValue = {
	categories: Category[];
	loading: boolean;
	refreshCategories: () => Promise<void>;
	getCategoryById: (id: string) => Category | undefined;
	getSubcategoriesByCategoryId: (categoryId: string) => string[];
};

const CategoriesContext = createContext<CategoriesContextValue | undefined>(undefined);

// Helper function to convert database row (snake_case) to Category (camelCase)
function dbRowToCategory(row: any): Category {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		description: row.description || undefined,
		imageUrl: row.image_url || undefined,
		subcategories: row.subcategories || [], // Array of subcategory names
		displayOrder: row.display_order || 0,
		isActive: row.is_active !== false,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);

	// Fetch categories from Supabase
	const refreshCategories = useCallback(async () => {
		try {
			if (!isSupabaseConfigured()) {
				console.warn('[CategoriesContext] Supabase not configured. Skipping categories fetch.');
				setCategories([]);
				setLoading(false);
				return;
			}

			const { data, error } = await supabase
				.from('product_categories')
				.select('*')
				.eq('is_active', true)
				.order('display_order', { ascending: true })
				.order('name', { ascending: true });

			if (error) {
				const isNetworkError = error?.message?.includes('Network request failed') ||
				                      error?.message?.includes('fetch') ||
				                      error?.code === 'ECONNABORTED' ||
				                      error?.code === 'ENOTFOUND';
				
				if (!isNetworkError) {
					console.error('[CategoriesContext] Error fetching categories:', error);
				} else {
					console.warn('[CategoriesContext] Network error fetching categories (may be offline)');
				}
				setCategories([]);
				return;
			}

			const fetchedCategories = (data || []).map(dbRowToCategory);
			setCategories(fetchedCategories);
		} catch (err: any) {
			const isNetworkError = err?.message?.includes('Network request failed') || 
			                      err?.message?.includes('fetch') ||
			                      err?.name === 'TypeError';
			
			if (!isNetworkError) {
				console.error('[CategoriesContext] Unexpected error fetching categories:', err);
			}
			setCategories([]);
		} finally {
			setLoading(false);
		}
	}, []);

	// Initial load
	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			await refreshCategories();
			setLoading(false);
		};
		loadData();
	}, [refreshCategories]);

	const getCategoryById = useCallback(
		(id: string): Category | undefined => {
			return categories.find((c) => c.id === id);
		},
		[categories]
	);

	const getSubcategoriesByCategoryId = useCallback(
		(categoryId: string): string[] => {
			const category = categories.find((c) => c.id === categoryId);
			return category?.subcategories || [];
		},
		[categories]
	);

	const value = useMemo(
		() => ({
			categories,
			loading,
			refreshCategories,
			getCategoryById,
			getSubcategoriesByCategoryId,
		}),
		[
			categories,
			loading,
			refreshCategories,
			getCategoryById,
			getSubcategoriesByCategoryId,
		]
	);

	return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
	const ctx = useContext(CategoriesContext);
	if (ctx === undefined) {
		throw new Error('useCategories must be used within CategoriesProvider');
	}
	return ctx;
}
