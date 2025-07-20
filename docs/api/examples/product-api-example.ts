/**
 * Example: Product API with Advanced Features
 *
 * This example demonstrates advanced patterns including:
 * - Caching
 * - Batch operations
 * - File uploads
 * - Complex filtering
 * - Performance optimization
 */

import { z } from "zod";
// app/api/products/route.ts
import {
	BaseAPIHandler,
	RateLimitError,
	ResponseBuilder,
} from "@/lib/api/base";
import { productService } from "@/services/product-service";

// Advanced query schema with multiple filters
const ProductQuerySchema = z.object({
	// Pagination
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),

	// Sorting
	sortBy: z
		.enum(["createdAt", "price", "name", "popularity"])
		.default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),

	// Filters
	search: z.string().optional(),
	category: z.string().optional(),
	minPrice: z.coerce.number().min(0).optional(),
	maxPrice: z.coerce.number().min(0).optional(),
	inStock: z.coerce.boolean().optional(),
	tags: z.string().optional(), // comma-separated

	// Field selection
	fields: z.string().optional(), // comma-separated field list
});

// GET /api/products - Advanced product listing
export const GET = BaseAPIHandler.GET(async (context) => {
	const params = BaseAPIHandler.validateQuery(
		new URLSearchParams(context.query),
		ProductQuerySchema,
	);

	// Parse tags if provided
	if (params.tags) {
		params.tags = params.tags.split(",").map((t) => t.trim());
	}

	// Parse fields if provided
	const fields = params.fields?.split(",").map((f) => f.trim());

	const result = await productService.searchProducts(params, fields, context);

	// Add cache headers for static content
	const response = ResponseBuilder.fromQueryResult(result);
	response.headers.set("Cache-Control", "public, max-age=60, must-revalidate");

	return response;
});

// POST /api/products - Create with image upload
export const POST = BaseAPIHandler.POST(
	async (context) => {
		const formData = await context.request.formData();

		// Extract and validate product data
		const productData = {
			name: formData.get("name") as string,
			description: formData.get("description") as string,
			price: Number(formData.get("price")),
			category: formData.get("category") as string,
			stock: Number(formData.get("stock")),
			tags: JSON.parse((formData.get("tags") as string) || "[]"),
		};

		// Validate with schema
		const CreateProductSchema = z.object({
			name: z.string().min(1).max(200),
			description: z.string().max(2000),
			price: z.number().positive(),
			category: z.string(),
			stock: z.number().int().min(0),
			tags: z.array(z.string()),
		});

		const validated = CreateProductSchema.parse(productData);

		// Handle image upload
		const image = formData.get("image") as File | null;
		let imageUrl: string | undefined;

		if (image) {
			imageUrl = await productService.uploadProductImage(image, context);
		}

		const product = await productService.createProduct(
			{ ...validated, imageUrl },
			context,
		);

		return ResponseBuilder.created(product);
	},
	{ requireAuth: true },
);

import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { LRUCache } from "lru-cache";
import { db } from "@/db/config";
import { products, productTags } from "@/db/schema";
// services/product-service.ts
import {
	BaseAPIService,
	createQueryBuilder,
	NotFoundError,
	type ServiceContext,
	ValidationError,
} from "@/lib/api/base";
import { uploadToS3 } from "@/lib/storage";

interface Product {
	id: string;
	name: string;
	description: string;
	price: number;
	category: string;
	stock: number;
	imageUrl?: string;
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
}

class ProductService extends BaseAPIService {
	// In-memory cache for frequently accessed products
	private cache = new LRUCache<string, Product>({
		max: 1000,
		ttl: 1000 * 60 * 5, // 5 minutes
		updateAgeOnGet: true,
	});

	// Cache for search results
	private searchCache = new LRUCache<string, any>({
		max: 100,
		ttl: 1000 * 60 * 2, // 2 minutes
	});

	constructor() {
		super({ serviceName: "products" });
	}

	async searchProducts(
		params: any,
		fields: string[] | undefined,
		context: ServiceContext,
	) {
		return this.executeWithTracing("searchProducts", context, async (span) => {
			// Generate cache key
			const cacheKey = JSON.stringify({ params, fields });

			// Check search cache
			const cached = this.searchCache.get(cacheKey);
			if (cached) {
				span.setAttributes({ "cache.hit": true });
				return cached;
			}

			span.setAttributes({ "cache.hit": false });

			// Build query
			const query = createQueryBuilder(products);

			// Apply search across multiple fields
			if (params.search) {
				query.search(
					[products.name, products.description, products.category],
					params.search,
				);
			}

			// Category filter
			if (params.category) {
				query.where(products.category, params.category);
			}

			// Price range
			if (params.minPrice !== undefined) {
				query.whereGte(products.price, params.minPrice);
			}
			if (params.maxPrice !== undefined) {
				query.whereLte(products.price, params.maxPrice);
			}

			// Stock filter
			if (params.inStock !== undefined) {
				if (params.inStock) {
					query.whereGte(products.stock, 1);
				} else {
					query.where(products.stock, 0);
				}
			}

			// Apply sorting
			const sortColumn = {
				createdAt: products.createdAt,
				price: products.price,
				name: products.name,
				popularity: products.popularity,
			}[params.sortBy];

			query.orderBy(sortColumn, params.sortOrder);

			// Field selection
			if (fields && fields.length > 0) {
				const selectFields = fields.reduce((acc, field) => {
					if (products[field]) {
						acc[field] = products[field];
					}
					return acc;
				}, {});
				query.select(selectFields);
			}

			// Pagination
			query.paginate(params.page, params.limit);

			// Execute query
			const result = await query.executePaginated();

			// Filter by tags if needed (post-processing)
			if (params.tags && params.tags.length > 0) {
				const productIds = result.items.map((p) => p.id);

				const tagsData = await db.query.productTags.findMany({
					where: and(
						inArray(productTags.productId, productIds),
						inArray(productTags.tag, params.tags),
					),
				});

				const productTagMap = new Map<string, Set<string>>();
				tagsData.forEach((pt) => {
					if (!productTagMap.has(pt.productId)) {
						productTagMap.set(pt.productId, new Set());
					}
					productTagMap.get(pt.productId)!.add(pt.tag);
				});

				// Filter products that have all requested tags
				result.items = result.items.filter((product) => {
					const productTagSet = productTagMap.get(product.id);
					return params.tags.every((tag) => productTagSet?.has(tag));
				});
			}

			// Cache result
			this.searchCache.set(cacheKey, result);

			span.setAttributes({
				"search.query": params.search || "",
				"search.filters": Object.keys(params).filter(
					(k) => params[k] !== undefined,
				).length,
				"search.results": result.items.length,
				"search.total": result.pagination.total,
			});

			return result;
		});
	}

	async createProduct(data: any, context: ServiceContext): Promise<Product> {
		return this.executeWithTracing("createProduct", context, async (span) => {
			const productId = crypto.randomUUID();

			// Start transaction
			const product = await db.transaction(async (tx) => {
				// Create product
				const [newProduct] = await tx
					.insert(products)
					.values({
						id: productId,
						name: data.name,
						description: data.description,
						price: data.price,
						category: data.category,
						stock: data.stock,
						imageUrl: data.imageUrl,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.returning();

				// Create tags
				if (data.tags && data.tags.length > 0) {
					await tx.insert(productTags).values(
						data.tags.map((tag) => ({
							productId,
							tag,
						})),
					);

					newProduct.tags = data.tags;
				}

				return newProduct;
			});

			// Clear search cache on create
			this.searchCache.clear();

			// Record event
			await this.recordEvent(
				"product_created",
				`New product created: ${product.name}`,
				{
					productId: product.id,
					category: product.category,
					price: product.price,
					createdBy: context.userId,
				},
			);

			span.setAttributes({
				"product.id": product.id,
				"product.category": product.category,
				"product.tags": data.tags?.length || 0,
			});

			return product;
		});
	}

	async uploadProductImage(
		file: File,
		context: ServiceContext,
	): Promise<string> {
		return this.executeWithTracing(
			"uploadProductImage",
			context,
			async (span) => {
				// Validate file
				const MAX_SIZE = 10 * 1024 * 1024; // 10MB
				const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

				if (file.size > MAX_SIZE) {
					throw new ValidationError("Image file too large (max 10MB)");
				}

				if (!ALLOWED_TYPES.includes(file.type)) {
					throw new ValidationError(
						"Invalid image type (JPEG, PNG, WebP only)",
					);
				}

				span.setAttributes({
					"upload.size": file.size,
					"upload.type": file.type,
				});

				// Upload to S3
				const key = `products/${crypto.randomUUID()}-${file.name}`;
				const url = await uploadToS3(file, key);

				return url;
			},
		);
	}

	// Batch operations
	async batchUpdatePrices(
		updates: Array<{ id: string; price: number }>,
		context: ServiceContext,
	) {
		return this.executeWithTracing(
			"batchUpdatePrices",
			context,
			async (span) => {
				span.setAttributes({ "batch.size": updates.length });

				const results = await db.transaction(async (tx) => {
					const promises = updates.map(async ({ id, price }) => {
						try {
							const [updated] = await tx
								.update(products)
								.set({ price, updatedAt: new Date() })
								.where(eq(products.id, id))
								.returning();

							// Invalidate cache
							this.cache.delete(id);

							return { success: true, data: updated };
						} catch (error) {
							return { success: false, error: error.message, id };
						}
					});

					return Promise.all(promises);
				});

				// Clear search cache after batch update
				this.searchCache.clear();

				const succeeded = results.filter((r) => r.success).length;
				const failed = results.filter((r) => !r.success).length;

				span.setAttributes({
					"batch.succeeded": succeeded,
					"batch.failed": failed,
				});

				await this.recordEvent(
					"batch_price_update",
					`Updated prices for ${succeeded} products`,
					{
						succeeded,
						failed,
						total: updates.length,
					},
				);

				return results;
			},
		);
	}

	// Optimized single product fetch with caching
	async getProduct(id: string, context: ServiceContext): Promise<Product> {
		return this.executeWithTracing("getProduct", context, async (span) => {
			// Check cache first
			const cached = this.cache.get(id);
			if (cached) {
				span.setAttributes({ "cache.hit": true });
				return cached;
			}

			span.setAttributes({ "cache.hit": false });

			// Fetch from database with tags
			const product = await db.query.products.findFirst({
				where: eq(products.id, id),
			});

			if (!product) {
				throw new NotFoundError("Product", id);
			}

			// Fetch tags
			const tags = await db.query.productTags.findMany({
				where: eq(productTags.productId, id),
			});

			const fullProduct = {
				...product,
				tags: tags.map((t) => t.tag),
			};

			// Cache the result
			this.cache.set(id, fullProduct);

			return fullProduct;
		});
	}
}

export const productService = new ProductService();

// app/api/products/batch/route.ts - Batch operations
export const POST = BaseAPIHandler.POST(
	async (context) => {
		const BatchUpdateSchema = z.object({
			updates: z
				.array(
					z.object({
						id: z.string().uuid(),
						price: z.number().positive(),
					}),
				)
				.min(1)
				.max(100),
		});

		const { updates } = await BaseAPIHandler.validateBody(
			context.request,
			BatchUpdateSchema,
		);

		const results = await productService.batchUpdatePrices(updates, context);

		return ResponseBuilder.batch(results, "Batch price update completed");
	},
	{
		requireAuth: true,
		rateLimit: { requests: 10, window: "1h" },
	},
);
