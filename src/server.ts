import { Elysia } from "elysia"
import app from "./index"
import { validateEnv } from "./types/env"
import { connectAll, disconnectAll, getClient, getPublisher, getSubscriber } from "./redis/client"
import { RedisService } from "./redis/service"
import { createDiscordRoutes } from "./routes/v2/discord"
import { discordAuth } from "./routes/v2/discord-auth"
import { createBot, startBot, stopBot, getBot } from "./bot/client"

const env = validateEnv()

async function main(): Promise<void> {
  await connectAll(env)
  const redis = new RedisService(getClient(), getPublisher())
  const subscriber = getSubscriber()
  app.use(createDiscordRoutes(redis, subscriber, {
    user1: env.DISCORD_USER_ID || undefined,
    user2: env.DISCORD_USER_ID_2 || undefined,
    bot: env.DISCORD_BOT_ID || undefined,
  }))
  app.use(discordAuth)

  if (env.DISCORD_TOKEN) {
    const bot = createBot(env, redis)
    startBot(bot).catch((err) => console.error("[Discord] Failed to start bot:", err))
  }

  app.listen(env.PORT)
  console.log(`Server running on http://localhost:${env.PORT}`)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})

const shutdown = async () => {
  console.log("\nShutting down...")
  const bot = getBot()
  if (bot) stopBot(bot)
  await disconnectAll()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
