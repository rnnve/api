import { Client, GatewayIntentBits } from "discord.js"
import type { Env } from "../types/env"
import type { RedisService } from "../redis/service"
import { setupHandlers } from "./handlers"

let client: Client | null = null

export function createBot(env: Env, redis: RedisService): Client {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
    ],
  })

  const userIds = [env.DISCORD_USER_ID, env.DISCORD_USER_ID_2].filter(Boolean)
  for (const id of userIds) {
    setupHandlers(client, redis, id, env.DISCORD_GUILD_ID || undefined)
  }
  return client
}

export function getBot(): Client | null {
  return client
}

export async function startBot(bot: Client): Promise<void> {
  const token = process.env.DISCORD_TOKEN
  if (!token) {
    console.warn("[Discord] DISCORD_TOKEN not set — bot will not start")
    return
  }
  await bot.login(token)
  console.log("[Discord] Bot started")
}

export function stopBot(bot: Client): void {
  bot.destroy()
  console.log("[Discord] Bot stopped")
}
