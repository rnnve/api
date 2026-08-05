import { z } from "zod"

const envSchema = z.object({
  DISCORD_TOKEN: z.string().default(""),
  DISCORD_USER_ID: z.string().default(""),
  DISCORD_USER_ID_2: z.string().default(""),
  DISCORD_BOT_ID: z.string().default(""),
  DISCORD_GUILD_ID: z.string().default(""),
  DISCORD_CLIENT_ID: z.string().default(""),
  DISCORD_CLIENT_SECRET: z.string().default(""),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  PORT: z.coerce.number().default(6770),
})

export type Env = z.infer<typeof envSchema>

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
