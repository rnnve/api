import { Client, GatewayIntentBits } from "discord.js"
import type { Env } from "../types/env"
import { parseBotConfigs } from "../types/env"
import type { RedisService } from "../redis/service"
import { setupHandlers, setupBotHandlers } from "./handlers"

let client: Client | null = null

export function createBot(env: Env, redis: RedisService): Client {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
    ],
  })

  const guildId = env.DISCORD_GUILD_ID || undefined
  const userIds = [env.DISCORD_USER_ID, env.DISCORD_USER_ID_2].filter(Boolean)
  for (const id of userIds) {
    setupHandlers(client, redis, id, guildId)
  }

  const bots = parseBotConfigs(env.DISCORD_BOTS_ID)
  for (const bot of bots) {
    setupHandlers(client, redis, bot.id, guildId)
    setupBotHandlers(client, redis, bot.id)
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
