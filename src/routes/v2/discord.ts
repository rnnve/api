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
  targetUserId: string
  prefix: string
  clients: Map<string, SSEClient>
}

export interface DiscordTargets {
  user1?: string
  user2?: string
  bot?: string
}

const TARGET_PREFIXES: Record<keyof DiscordTargets, string> = {
  user1: "/v2/discord/user/1",
  user2: "/v2/discord/user/2",
  bot: "/v2/discord/bot",
}

const detail = (summary: string, description: string, tags = ["Discord"]) => ({
  detail: { summary, description, tags },
})

function createTargetPlugin({ redis, targetUserId, prefix, clients }: DiscordTargetPluginOptions) {
  function createSSEStream(request: Request): ReadableStream {
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
      "/",
      async () => {
        const user = await redis.getUser(targetUserId)
        if (!user) return { success: false, error: "No cached data for tracked user" }
        return { success: true, data: user } satisfies ApiResponse<DiscordUserPayload>
      },
      detail("Get tracked target", "Returns cached data for the configured tracked target."),
    )
    .get(
      "/profile",
      async ({ set }) => {
        const profile = await redis.getProfile(targetUserId)
        if (!profile) {
          set.status = 404
          return { success: false, error: "No cached data for tracked user" }
        }
        return { success: true, data: profile } satisfies ApiResponse<DiscordProfile>
      },
      detail("Get tracked user profile", "Returns cached profile information (username, avatar, banner, accent color, badges, guild)."),
    )
    .get(
      "/presence",
      async ({ set }) => {
        const presence = await redis.getPresence(targetUserId)
        if (!presence) {
          set.status = 404
          return { success: false, error: "No cached data for tracked user" }
        }
        return { success: true, data: presence }
      },
      detail("Get tracked user presence", "Returns cached presence data (status, activities, Spotify, devices)."),
    )
    .get(
      "/status",
      async ({ set }) => {
        const user = await redis.getUser(targetUserId)
        if (!user) {
          set.status = 404
          return { success: false, error: "No cached data for tracked user" }
        }
        return {
          success: true,
          data: { id: user.id, status: user.status },
        }
      },
      detail("Get tracked user status", "Returns a lightweight payload with only user ID and current status."),
    )
    .get(
      "/badges",
      async ({ set }) => {
        const user = await redis.getUser(targetUserId)
        if (!user) {
          set.status = 404
          return { success: false, error: "No cached data for tracked user" }
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
      detail("Get tracked user badges", "Returns the user's Discord badges (resolved names) and raw public_flags bitfield."),
    )
    .get(
      "/guild",
      async ({ set }) => {
        const user = await redis.getUser(targetUserId)
        if (!user) {
          set.status = 404
          return { success: false, error: "No cached data for tracked user" }
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
      detail("Get tracked user guild info", "Returns the user's current guild context and primary guild (clan) tag."),
    )
    .get(
      "/live",
      ({ request }) => {
        const stream = createSSEStream(request)
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
          "Emits `presence_update` events when the user's presence changes. " +
          "Includes a heartbeat comment every 30 seconds.",
      ),
    )
}

function createRedirects() {
  return new Elysia()
    .get("/v2/discord", () => redirect("/v2/discord/user/1", 308))
    .get("/v2/discord/*", ({ params }) => redirect(`/v2/discord/user/1/${params["*"]}`, 308))
    .get("/v2/nd/discord", () => redirect("/v2/discord/user/2", 308))
    .get("/v2/nd/discord/*", ({ params }) => redirect(`/v2/discord/user/2/${params["*"]}`, 308))
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

  const app = new Elysia()
  for (const [key, userId] of Object.entries(targets) as [keyof DiscordTargets, string | undefined][]) {
    if (!userId) continue
    app.use(createTargetPlugin({ redis, targetUserId: userId, prefix: TARGET_PREFIXES[key], clients }))
  }
  app.use(createRedirects())
  return app
}
