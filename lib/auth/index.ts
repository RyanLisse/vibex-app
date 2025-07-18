import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'

const OauthSchema = z.object({
  type: z.literal('oauth'),
  refresh: z.string(),
  access: z.string(),
  expires: z.number(),
})

const ApiSchema = z.object({
  type: z.literal('api'),
  key: z.string(),
})

export type AuthInfo = z.infer<typeof OauthSchema> | z.infer<typeof ApiSchema>

const InfoSchema = z.discriminatedUnion('type', [OauthSchema, ApiSchema])

// Use a data directory within the project for Next.js compatibility
const dataDir = path.join(process.cwd(), '.auth')
const filepath = path.join(dataDir, 'auth.json')

async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true })
  } catch {
    // Directory might already exist
  }
}

export const Auth = {
  async get(providerID: string): Promise<AuthInfo | undefined> {
    await ensureDataDir()
    try {
      const data = await fs.readFile(filepath, 'utf-8')
      const parsed = JSON.parse(data)
      const info = InfoSchema.safeParse(parsed[providerID])
      return info.success ? info.data : undefined
    } catch {
      return
    }
  },

  async all(): Promise<Record<string, AuthInfo>> {
    await ensureDataDir()
    try {
      const data = await fs.readFile(filepath, 'utf-8')
      return JSON.parse(data)
    } catch {
      return {}
    }
  },

  async set(key: string, info: AuthInfo) {
    await ensureDataDir()
    const data = await Auth.all()
    await fs.writeFile(filepath, JSON.stringify({ ...data, [key]: info }, null, 2))
    await fs.chmod(filepath, 0o600)
  },

  async remove(key: string) {
    await ensureDataDir()
    const data = await Auth.all()
    delete data[key]
    await fs.writeFile(filepath, JSON.stringify(data, null, 2))
    await fs.chmod(filepath, 0o600)
  },
}
