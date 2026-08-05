import type { Client, Presence, User, PartialUser, Guild } from "discord.js"
import type { RedisService } from "../redis/service"
import { serializePresence, serializeProfileFromUser } from "./serializer"
import { fetchDiscordUser, calculatePremiumBadge } from "../lib/discord"

async function enrichPremiumBadge(
  token: string,
  userId: string,
  payload: { premiumBadge: string | null; premiumType: string | null },
): Promise<void> {
  const data = await fetchDiscordUser(token, userId)
  if (data) {
    const planType = payload.premiumType
    const fallback = planType === "Nitro" ? 2 : planType === "Nitro Classic" ? 1 : planType === "Nitro Basic" ? 3 : null
    payload.premiumBadge = calculatePremiumBadge(data, fallback)
  }
}

async function fetchAndPublishPresence(
  client: Client,
  redis: RedisService,
  targetUserId: string,
  guild?: Guild,
): Promise<boolean> {
  const guilds = guild ? [guild] : client.guilds.cache.values()
  for (const g of guilds) {
    try {
      const member = await g.members.fetch({ user: targetUserId, force: true })
      if (member.presence) {
        const payload = serializePresence(member.presence)
        if (payload) {
          if (client.token) await enrichPremiumBadge(client.token, targetUserId, payload)
          await redis.saveUser(targetUserId, payload)
          await redis.publishUpdate(targetUserId, payload)
          return true
        }
      }
    } catch {
      continue
    }
  }
  return false
}

export function setupHandlers(
  client: Client,
  redis: RedisService,
  targetUserId: string,
  guildId?: string,
): void {
  client.on("clientReady", async () => {
    console.log(`[Discord] Bot logged in as ${client.user?.tag}`)

    try {
      const user = await client.users.fetch(targetUserId, { force: true })
      console.log(`[Discord] Target user found: ${user.tag} (${user.id})`)

      const guild = guildId ? client.guilds.cache.get(guildId) : undefined
      if (guildId && !guild) {
        console.warn(`[Discord] Guild ${guildId} not found — bot may not be in it`)
      }

      const found = await fetchAndPublishPresence(client, redis, targetUserId, guild)
      if (found) return

      const fallback = serializeProfileFromUser(user, guild?.id ?? null, guild?.name ?? null)
      const data = {
        ...fallback,
        publicFlags: user.flags?.bitfield ?? 0,
        accentColor: fallback.accentColor
          ? `#${fallback.accentColor.toString(16).padStart(6, "0").toUpperCase()}`
          : null,
        status: "offline" as const,
        customStatus: null,
        spotify: null,
        activities: [],
        mobile: false,
        desktop: false,
        web: false,
        boostBadge: null,
        boostedSince: null,
        updatedAt: Date.now(),
      }
      if (client.token) await enrichPremiumBadge(client.token, targetUserId, data)
      await redis.saveUser(targetUserId, data)
      await redis.publishUpdate(targetUserId, data)
    } catch (err) {
      console.error("[Discord] Failed to fetch target user:", err)
    }
  })

  client.on("presenceUpdate", async (oldPresence: Presence | null, newPresence: Presence) => {
    if (newPresence.userId !== targetUserId) return
    if (guildId && newPresence.guild?.id !== guildId) return

    const payload = serializePresence(newPresence)
    if (!payload) return

    if (oldPresence) {
      const oldPayload = serializePresence(oldPresence)
      if (oldPayload && JSON.stringify(oldPayload) === JSON.stringify(payload)) return
    }

    if (client.token) await enrichPremiumBadge(client.token, targetUserId, payload)
    await redis.saveUser(targetUserId, payload)
    await redis.publishUpdate(targetUserId, payload)
  })

  client.on("guildCreate", async (guild: Guild) => {
    if (guildId && guild.id !== guildId) return
    console.log(`[Discord] Joined guild: ${guild.name} (${guild.id})`)
    await fetchAndPublishPresence(client, redis, targetUserId, guild)
  })

  client.on("userUpdate", async (_oldUser: User | PartialUser, newUser: User) => {
    if (newUser.id !== targetUserId) return

    const guild = guildId ? client.guilds.cache.get(guildId) ?? undefined : undefined
    const profile = serializeProfileFromUser(newUser, guild?.id ?? null, guild?.name ?? null)
    const existing = await redis.getUser(targetUserId)
    if (existing) {
      existing.username = profile.username
      existing.displayName = profile.displayName
      existing.globalName = profile.globalName
      existing.avatar = profile.avatar
      existing.banner = profile.banner
      existing.accentColor = profile.accentColor
        ? `#${profile.accentColor.toString(16).padStart(6, "0").toUpperCase()}`
        : null
      existing.badges = profile.badges
      existing.premiumType = profile.premiumType
      existing.premiumBadge = profile.premiumBadge
      existing.primaryGuild = profile.primaryGuild
      existing.publicFlags = newUser.flags?.bitfield ?? 0
      existing.createdAt = profile.createdAt
      existing.updatedAt = Date.now()
      if (client.token) await enrichPremiumBadge(client.token, targetUserId, existing)
      await redis.saveUser(targetUserId, existing)
      await redis.publishUpdate(targetUserId, existing)
    }
  })
}

export function setupBotHandlers(client: Client, redis: RedisService, botId: string): void {
  let lastPayload: string | null = null

  async function refresh(): Promise<void> {
    if (client.user?.id !== botId) return
    const user = client.user
    try {
      const payload = serializePresence(user.presence)
      if (!payload) return
      if (client.token) await enrichPremiumBadge(client.token, botId, payload)
      const serialized = JSON.stringify(payload)
      if (serialized === lastPayload) return
      lastPayload = serialized
      await redis.saveUser(botId, payload)
      await redis.publishUpdate(botId, payload)
    } catch (err) {
      console.error("[Discord] Failed to refresh bot presence:", err)
    }
  }

  client.on("clientReady", async () => {
    if (client.user?.id !== botId) return
    await refresh()
    setInterval(refresh, 30000)
  })
}
