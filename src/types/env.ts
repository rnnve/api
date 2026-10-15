import { z } from "zod"

const envSchema = z.object({
  DISCORD_TOKEN: z.string().default(""),
  DISCORD_USER_ID: z.string().default(""),
  DISCORD_USER_ID_2: z.string().default(""),
  DISCORD_BOTS_ID: z.string().default(""),
  DISCORD_GUILD_ID: z.string().default(""),
  DISCORD_CLIENT_ID: z.string().default(""),
  DISCORD_CLIENT_SECRET: z.string().default(""),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  PORT: z.coerce.number().default(6770),
  LASTFM_API_KEY: z.string().default(""),
  LASTFM_USERNAME: z.string().default(""),
})

export type Env = z.infer<typeof envSchema>

export interface BotConfig {
  alias: string
  id: string
}

export function parseBotConfigs(raw: string): BotConfig[] {
  if (!raw.trim()) return []
  const result: BotConfig[] = []
  for (const part of raw.split(",")) {
    const entry = part.trim()
    if (!entry) continue
    const sep = entry.indexOf(":")
    if (sep <= 0 || sep === entry.length - 1) {
      console.warn(`[Env] Skipping invalid DISCORD_BOTS_ID entry "${entry}" (expected alias:id)`)
      continue
    }
    result.push({ alias: entry.slice(0, sep).trim(), id: entry.slice(sep + 1).trim() })
  }
  return result
}

let _env: Env | null = null

export function validateEnv(): Env {
  if (_env) return _env
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error("Invalid environment variables:")
    const flat = result.error.flatten()
    for (const [key, msgs] of Object.entries(flat.fieldErrors)) {
      console.error(`  ${key}: ${msgs.join(", ")}`)
    }
    process.exit(1)
  }
  _env = result.data
  return _env
}

export function getEnv(): Env {
  if (!_env) throw new Error("Environment not validated. Call validateEnv() first.")
  return _env
}
