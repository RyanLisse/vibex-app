import { ProductVariantSchema } from './src/schemas/complex-examples.ts'

const validVariant = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  sku: 'PROD-001',
  name: 'Small Red Shirt',
  price: 29.99,
  compareAtPrice: 39.99,
  inventory: {
    quantity: 100,
    tracked: true,
    policy: 'deny',
    lowStockThreshold: 10,
  },
  attributes: { color: 'red', size: 'small' },
  images: [
    {
      id: 'img-1',
      url: 'https://example.com/image.jpg',
      altText: 'Red shirt',
      position: 0,
    },
  ],
  weight: { value: 0.5, unit: 'kg' },
  dimensions: { length: 30, width: 20, height: 2, unit: 'cm' },
}

const result = ProductVariantSchema.safeParse(validVariant)
if (!result.success) {
  console.log('Validation errors:', JSON.stringify(result.error.issues, null, 2))
} else {
  console.log('Validation successful!')
}
