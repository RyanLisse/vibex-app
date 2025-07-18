import { z } from 'zod'

export const exampleItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  priority: z.enum(['low', 'medium', 'high']),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const exampleFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
})

export const exampleFilterSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  searchTerm: z.string().optional(),
})

export type ExampleItem = z.infer<typeof exampleItemSchema>
export type ExampleFormData = z.infer<typeof exampleFormSchema>
export type ExampleFilter = z.infer<typeof exampleFilterSchema>
