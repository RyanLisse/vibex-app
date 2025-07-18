import { defineConfig } from '@browserbasehq/stagehand'
import { z } from 'zod'

// Define schemas for data extraction
export const PageDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  headings: z.array(z.string()),
  links: z.array(
    z.object({
      text: z.string(),
      href: z.string().url(),
    })
  ),
})

export const FormDataSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(10),
  submitted: z.boolean(),
})

export const ContactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

export default defineConfig({
  env: 'BROWSERBASE',
  apiKey: process.env.BROWSERBASE_API_KEY,
  projectId: process.env.BROWSERBASE_PROJECT_ID,
  verbose: 1,
  headless: process.env.CI === 'true',
  defaultTimeout: 30_000,
  enableCaching: true,
  modelName: 'gpt-4o',
  domSettleTimeoutMs: 30_000,
})
