import { Elysia, redirect } from "elysia"
import type { Redis } from "ioredis"
import type { RedisService } from "../../redis/service"
import { PRESENCE_CHANNEL } from "../../redis/service"
import type { DiscordUserPayload, DiscordProfile, ApiResponse } from "../../types/discord"

interface SSEClient {
  userId: string
  controller: ReadableStreamDefaultController
  heartbeat: ReturnType<typeof setInterval>
}

interface DiscordTargetPluginOptions {
  redis: RedisService
  prefix: string
  clients: Map<string, SSEClient>
  resolve: (params: Record<string, string>) => string | null
  paramName?: string
}

export interface BotTarget {
  alias: string
  id: string
}

export interface DiscordTargets {
  user1?: string
  user2?: string
  bots: BotTarget[]
}

const USER1_PREFIX = "/v2/discord/user/1"
const USER2_PREFIX = "/v2/discord/user/2"
const BOT_PREFIX = "/v2/bot"

const detail = (summary: string, description: string, tags = ["Discord"]) => ({
  detail: { summary, description, tags },
})

function createTargetPlugin({ redis, prefix, clients, resolve, paramName }: DiscordTargetPluginOptions) {
  const root = paramName ? `/:${paramName}` : "/"
  const sub = (path: string) => (paramName ? `/:${paramName}/${path}` : `/${path}`)

  function createSSEStream(request: Request, targetUserId: string): ReadableStream {
    return new ReadableStream({
      start: (controller) => {
        const sid = Math.random().toString(36).slice(2, 10)
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"))
          } catch {
            clearInterval(heartbeat)
            clients.delete(sid)
          }
        }, 30000)

        clients.set(sid, { userId: targetUserId, controller, heartbeat })

        controller.enqueue(new TextEncoder().encode(": connected\n\n"))

        redis.getUser(targetUserId).then((user) => {
          if (user) {
            const event = `event: presence_update\ndata: ${JSON.stringify({ success: true, data: user })}\n\n`
            try {
              controller.enqueue(new TextEncoder().encode(event))
            } catch {
              /* client disconnected */
            }
          }
        })

        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat)
          clients.delete(sid)
        }, { once: true })
      },
    })
  }

  return new Elysia({ prefix })
    .get(
      root,
      async ({ params }) => {
        const targetUserId = resolve(params)
        if (!targetUserId) return { success: false, error: "Unknown tracked target" }
        const user = await redis.getUser(targetUserId)
        if (!user) return { success: false, error: "No cached data for tracked target" }
        return { success: true, data: user } satisfies ApiResponse<DiscordUserPayload>
      },
      detail("Get tracked target", "Returns cached data for the configured tracked target."),
    )
    .get(
      sub("profile"),
      async ({ params, set }) => {
        const targetUserId = resolve(params)
        if (!targetUserId) {
          set.status = 404
          return { success: false, error: "Unknown tracked target" }
        }
        const profile = await redis.getProfile(targetUserId)
        if (!profile) {
          set.status = 404
          return { success: false, error: "No cached data for tracked target" }
        }
        return { success: true, data: profile } satisfies ApiResponse<DiscordProfile>
      },
      detail("Get tracked target profile", "Returns cached profile information (username, avatar, banner, accent color, badges, guild)."),
    )
    .get(
      sub("presence"),
      async ({ params, set }) => {
        const targetUserId = resolve(params)
        if (!targetUserId) {
          set.status = 404
          return { success: false, error: "Unknown tracked target" }
        }
        const presence = await redis.getPresence(targetUserId)
        if (!presence) {
          set.status = 404
          return { success: false, error: "No cached data for tracked target" }
        }
        return { success: true, data: presence }
      },
      detail("Get tracked target presence", "Returns cached presence data (status, activities, Spotify, devices)."),
    )
    .get(
      sub("status"),
      async ({ params, set }) => {
        const targetUserId = resolve(params)
        if (!targetUserId) {
          set.status = 404
          return { success: false, error: "Unknown tracked target" }
        }
        const user = await redis.getUser(targetUserId)
        if (!user) {
          set.status = 404
          return { success: false, error: "No cached data for tracked target" }
        }
        return {
          success: true,
          data: { id: user.id, status: user.status },
        }
      },
      detail("Get tracked target status", "Returns a lightweight payload with only target ID and current status."),
    )
    .get(
      sub("badges"),
      async ({ params, set }) => {
        const targetUserId = resolve(params)
        if (!targetUserId) {
          set.status = 404
          return { success: false, error: "Unknown tracked target" }
        }
        const user = await redis.getUser(targetUserId)
        if (!user) {
          set.status = 404
          return { success: false, error: "No cached data for tracked target" }
        }
        return {
          success: true,
          data: {
            id: user.id,
            badges: user.badges,
            publicFlags: user.publicFlags,
          },
        }
      },
      detail("Get tracked target badges", "Returns the target's Discord badges (resolved names) and raw public_flags bitfield."),
    )
    .get(
      sub("guild"),
      async ({ params, set }) => {
        const targetUserId = resolve(params)
        if (!targetUserId) {
          set.status = 404
          return { success: false, error: "Unknown tracked target" }
        }
        const user = await redis.getUser(targetUserId)
        if (!user) {
          set.status = 404
          return { success: false, error: "No cached data for tracked target" }
        }
        return {
          success: true,
          data: {
            id: user.id,
            guildId: user.guildId,
            guildName: user.guildName,
            primaryGuild: user.primaryGuild,
          },
        }
      },
      detail("Get tracked target guild info", "Returns the target's current guild context and primary guild (clan) tag."),
    )
    .get(
      sub("live"),
      ({ request, params }) => {
        const targetUserId = resolve(params)
        if (!targetUserId) {
          return new Response(JSON.stringify({ success: false, error: "Unknown tracked target" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          })
        }
        const stream = createSSEStream(request, targetUserId)
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        })
      },
      detail(
        "Live presence stream (SSE)",
        "Opens a Server-Sent Events connection that streams presence updates in real time. " +
          "Emits `presence_update` events when the target's presence changes. " +
          "Includes a heartbeat comment every 30 seconds.",
      ),
    )
}

function createRedirects(firstBotAlias?: string) {
  return new Elysia()
    .get("/v2/discord", () => redirect("/v2/discord/user/1", 308))
    .get("/v2/discord/*", ({ params }) => redirect(`/v2/discord/user/1/${params["*"]}`, 308))
    .get("/v2/nd/discord", () => redirect("/v2/discord/user/2", 308))
    .get("/v2/nd/discord/*", ({ params }) => redirect(`/v2/discord/user/2/${params["*"]}`, 308))
    .get("/v2/discord/bot", () => {
      if (!firstBotAlias) return { success: false, error: "No bots configured" }
      return redirect(`/v2/bot/${firstBotAlias}`, 308)
    })
    .get("/v2/bot", () => {
      if (!firstBotAlias) return { success: false, error: "No bots configured" }
      return redirect(`/v2/bot/${firstBotAlias}`, 308)
    })
}

export function createDiscordRoutes(redis: RedisService, subscriber: Redis, targets: DiscordTargets) {
  const clients = new Map<string, SSEClient>()

  subscriber.subscribe(PRESENCE_CHANNEL, (err) => {
    if (err) console.error("[SSE] Redis subscribe error:", err)
    else console.log(`[SSE] Subscribed to ${PRESENCE_CHANNEL}`)
  })

  subscriber.on("message", (channel, message) => {
    if (channel !== PRESENCE_CHANNEL) return

    let payload: DiscordUserPayload
    try {
      payload = JSON.parse(message)
    } catch {
      return
    }

    const event = `event: presence_update\ndata: ${JSON.stringify({ success: true, data: payload })}\n\n`
    const encoded = new TextEncoder().encode(event)

    for (const [id, client] of clients) {
      if (client.userId !== payload.id) continue
      try {
        client.controller.enqueue(encoded)
      } catch {
        clearInterval(client.heartbeat)
        clients.delete(id)
      }
    }
  })

  const botIdByAlias = new Map(targets.bots.map((bot) => [bot.alias, bot.id]))

  const app = new Elysia()
  if (targets.user1) {
    app.use(createTargetPlugin({
      redis,
      prefix: USER1_PREFIX,
      clients,
      resolve: () => targets.user1!,
    }))
  }
  if (targets.user2) {
    app.use(createTargetPlugin({
      redis,
      prefix: USER2_PREFIX,
      clients,
      resolve: () => targets.user2!,
    }))
  }
  if (targets.bots.length > 0) {
    app.use(createTargetPlugin({
      redis,
      prefix: BOT_PREFIX,
      clients,
      resolve: ({ alias }) => botIdByAlias.get(alias) ?? null,
      paramName: "alias",
    }))
  }
  app.use(createRedirects(targets.bots[0]?.alias))
  return app
}
