import type {
  SpotifyCurrentlyPlaying,
  SpotifyRecentlyPlayedResponse,
  SpotifyTokenResponse,
  SpotifyTrack,
  SpotifyTrackImages,
} from "../types/spotify"
import { getEnv } from "../types/env"
import { getClient } from "../redis/client"

const SPOTIFY_API_BASE = "https://api.spotify.com/v1"
const SPOTIFY_ACCOUNTS_BASE = "https://accounts.spotify.com"
const SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-read-recently-played",
]

const REDIS_REFRESH_TOKEN_KEY = "spotify:refresh_token"
const REDIS_ACCESS_TOKEN_KEY = "spotify:access_token"

export class SpotifyConfigError extends Error {
  constructor(message = "Spotify client credentials are not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env") {
    super(message)
    this.name = "SpotifyConfigError"
  }
}

export class SpotifyAuthError extends Error {
  constructor(message = "Spotify is not authorized. Visit /api/v2/spotify/login to connect your account or set SPOTIFY_REFRESH_TOKEN in .env") {
    super(message)
    this.name = "SpotifyAuthError"
  }
}

export class SpotifyApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = "SpotifyApiError"
  }
}

let inMemoryRefreshToken: string | null = null
let inMemoryAccessToken: { token: string; expiresAt: number } | null = null

interface CacheEntry<T> {
  data: T
  expiresAt: number
}
const cache = new Map<string, CacheEntry<unknown>>()

export function clearSpotifyCache(): void {
  cache.clear()
  inMemoryAccessToken = null
  inMemoryRefreshToken = null
}

export function getSpotifyClientId(): string {
  try {
    const env = getEnv()
    if (env.SPOTIFY_CLIENT_ID) return env.SPOTIFY_CLIENT_ID
  } catch {
    // getEnv might throw if validateEnv() has not been called
  }
  return process.env.SPOTIFY_CLIENT_ID || ""
}

export function getSpotifyClientSecret(): string {
  try {
    const env = getEnv()
    if (env.SPOTIFY_CLIENT_SECRET) return env.SPOTIFY_CLIENT_SECRET
  } catch {
    // getEnv might throw if validateEnv() has not been called
  }
  return process.env.SPOTIFY_CLIENT_SECRET || ""
}

export function getSpotifyRedirectUri(): string {
  try {
    const env = getEnv()
    if (env.SPOTIFY_REDIRECT_URI) return env.SPOTIFY_REDIRECT_URI
  } catch {
    // getEnv might throw if validateEnv() has not been called
  }
  return process.env.SPOTIFY_REDIRECT_URI || ""
}

export function resolveRedirectUri(request?: Request): string {
  const envUri = getSpotifyRedirectUri()
  if (envUri) return envUri
  if (request) {
    const url = new URL(request.url)
    return `${url.origin}/api/v2/spotify/callback`
  }
  return "http://localhost:6770/api/v2/spotify/callback"
}

export async function getStoredRefreshToken(): Promise<string | null> {
  if (inMemoryRefreshToken) return inMemoryRefreshToken

  try {
    const env = getEnv()
    if (env.SPOTIFY_REFRESH_TOKEN) return env.SPOTIFY_REFRESH_TOKEN
  } catch {
    // ignore
  }
  if (process.env.SPOTIFY_REFRESH_TOKEN) return process.env.SPOTIFY_REFRESH_TOKEN

  try {
    const redis = getClient()
    const token = await redis.get(REDIS_REFRESH_TOKEN_KEY)
    if (token) {
      inMemoryRefreshToken = token
      return token
    }
  } catch {
    // Redis might not be initialized
  }

  return null
}

export async function saveRefreshToken(token: string): Promise<void> {
  inMemoryRefreshToken = token
  try {
    const redis = getClient()
    await redis.set(REDIS_REFRESH_TOKEN_KEY, token)
  } catch {
    // Redis might not be initialized
  }
}

export async function saveAccessToken(token: string, expiresInSeconds: number): Promise<void> {
  const expiresAt = Date.now() + expiresInSeconds * 1000
  inMemoryAccessToken = { token, expiresAt }
  try {
    const redis = getClient()
    await redis.set(REDIS_ACCESS_TOKEN_KEY, token, "EX", Math.max(1, expiresInSeconds - 60))
  } catch {
    // Redis might not be initialized
  }
}

export async function getStoredAccessToken(): Promise<string | null> {
  if (inMemoryAccessToken && inMemoryAccessToken.expiresAt > Date.now() + 60000) {
    return inMemoryAccessToken.token
  }

  try {
    const redis = getClient()
    const token = await redis.get(REDIS_ACCESS_TOKEN_KEY)
    if (token) return token
  } catch {
    // ignore
  }

  return null
}

export function buildAuthorizeUrl(redirectUri: string): string {
  const clientId = getSpotifyClientId()
  if (!clientId) {
    throw new SpotifyConfigError("SPOTIFY_CLIENT_ID is not configured")
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    show_dialog: "true",
  })

  return `${SPOTIFY_ACCOUNTS_BASE}/authorize?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<SpotifyTokenResponse> {
  const clientId = getSpotifyClientId()
  const clientSecret = getSpotifyClientSecret()

  if (!clientId || !clientSecret) {
    throw new SpotifyConfigError()
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const res = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new SpotifyApiError(`Failed to exchange authorization code: ${errBody}`, res.status)
  }

  const data = (await res.json()) as SpotifyTokenResponse
  if (data.refresh_token) {
    await saveRefreshToken(data.refresh_token)
  }
  if (data.access_token) {
    await saveAccessToken(data.access_token, data.expires_in)
  }

  return data
}

export async function refreshAccessToken(): Promise<string> {
  const clientId = getSpotifyClientId()
  const clientSecret = getSpotifyClientSecret()

  if (!clientId || !clientSecret) {
    throw new SpotifyConfigError()
  }

  const refreshToken = await getStoredRefreshToken()
  if (!refreshToken) {
    throw new SpotifyAuthError()
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const res = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new SpotifyApiError(`Failed to refresh Spotify token: ${errBody}`, res.status)
  }

  const data = (await res.json()) as SpotifyTokenResponse
  if (data.refresh_token) {
    await saveRefreshToken(data.refresh_token)
  }
  if (data.access_token) {
    await saveAccessToken(data.access_token, data.expires_in)
  }

  return data.access_token
}

export async function getValidAccessToken(): Promise<string> {
  const cached = await getStoredAccessToken()
  if (cached) return cached
  return await refreshAccessToken()
}

function extractTrackImages(images?: Array<{ url: string; height?: number; width?: number }>): SpotifyTrackImages {
  const result: SpotifyTrackImages = {
    small: null,
    medium: null,
    large: null,
  }

  if (!Array.isArray(images) || images.length === 0) return result

  // Spotify images are sorted descending by size: [0] is large (~640), [1] is medium (~300), [2] is small (~64)
  if (images.length === 1) {
    result.large = images[0]?.url || null
    result.medium = images[0]?.url || null
    result.small = images[0]?.url || null
  } else if (images.length === 2) {
    result.large = images[0]?.url || null
    result.medium = images[0]?.url || null
    result.small = images[1]?.url || null
  } else {
    result.large = images[0]?.url || null
    result.medium = images[1]?.url || null
    result.small = images[images.length - 1]?.url || null
  }

  return result
}

export function parseSpotifyTrack(item: any): SpotifyTrack {
  const artists = (item.artists || []).map((a: any) => ({
    name: a.name || "",
    id: a.id || "",
    url: a.external_urls?.spotify || "",
  }))

  const images = extractTrackImages(item.album?.images)
  const cover = images.large || images.medium || images.small || null

  return {
    id: item.id || "",
    name: item.name || "",
    artist: artists.map((a: any) => a.name).join(", "),
    artists,
    album: item.album?.name || "",
    cover,
    images,
    durationMs: item.duration_ms || 0,
    url: item.external_urls?.spotify || "",
    uri: item.uri || "",
  }
}

export async function fetchSpotifyApi(endpoint: string, retried = false): Promise<{ status: number; data: any }> {
  const token = await getValidAccessToken()

  const url = endpoint.startsWith("http") ? endpoint : `${SPOTIFY_API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (res.status === 401 && !retried) {
    // Token may have expired, force refresh and retry once
    inMemoryAccessToken = null
    await refreshAccessToken()
    return fetchSpotifyApi(endpoint, true)
  }

  if (res.status === 204) {
    return { status: 204, data: null }
  }

  if (!res.ok) {
    const errorText = await res.text()
    throw new SpotifyApiError(`Spotify API error: ${errorText}`, res.status)
  }

  const data = await res.json()
  return { status: res.status, data }
}

export async function getRecentlyPlayed(limit = 1): Promise<SpotifyRecentlyPlayedResponse> {
  const { data } = await fetchSpotifyApi(`/me/player/recently-played?limit=${Math.max(1, Math.min(limit, 50))}`)
  const items = data?.items || []

  const tracks: SpotifyTrack[] = items.map((entry: any) => {
    const track = parseSpotifyTrack(entry.track)
    track.playedAt = entry.played_at || null
    return track
  })

  return { tracks }
}

export async function getCurrentlyPlaying(skipCache = false): Promise<SpotifyCurrentlyPlaying> {
  const now = Date.now()
  const cacheKey = "currently-playing"

  if (!skipCache) {
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      return cached.data as SpotifyCurrentlyPlaying
    }
  }

  // Use /me/player to get device and playback context in addition to track
  let res = await fetchSpotifyApi("/me/player")

  // Fallback to /me/player/currently-playing if /me/player returned 204
  if (res.status === 204 || !res.data) {
    res = await fetchSpotifyApi("/me/player/currently-playing")
  }

  let result: SpotifyCurrentlyPlaying

  if (res.status === 204 || !res.data || !res.data.item) {
    // Nothing currently playing; try to get last played track
    let lastPlayed: SpotifyTrack | null = null
    try {
      const recent = await getRecentlyPlayed(1)
      lastPlayed = recent.tracks[0] || null
    } catch {
      // ignore recently played errors
    }

    result = {
      isPlaying: false,
      track: null,
      progressMs: null,
      device: null,
      startedAt: null,
      endsAt: null,
      contextType: null,
      contextUrl: null,
      lastPlayed,
    }
  } else {
    const d = res.data
    const isPlaying = Boolean(d.is_playing)
    const track = parseSpotifyTrack(d.item)
    const progressMs = typeof d.progress_ms === "number" ? d.progress_ms : null

    const startedAt = isPlaying && progressMs !== null ? now - progressMs : null
    const endsAt = isPlaying && progressMs !== null && track.durationMs ? startedAt! + track.durationMs : null

    const device = d.device
      ? {
          name: d.device.name || "Unknown",
          type: d.device.type || "Unknown",
          volumePercent: typeof d.device.volume_percent === "number" ? d.device.volume_percent : null,
        }
      : null

    result = {
      isPlaying,
      track,
      progressMs,
      device,
      startedAt,
      endsAt,
      contextType: d.context?.type || null,
      contextUrl: d.context?.external_urls?.spotify || d.context?.href || null,
    }
  }

  // Cache for 3 seconds to avoid hammering Spotify when polled frequently
  cache.set(cacheKey, { data: result, expiresAt: now + 3000 })

  return result
}
