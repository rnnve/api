import type {
  LastfmImage,
  LastfmNowPlaying,
  LastfmPeriod,
  LastfmRecentTracksResponse,
  LastfmTopAlbumsResponse,
  LastfmTopArtistsResponse,
  LastfmTopTracksResponse,
  LastfmTrack,
  LastfmUserProfile,
} from "../types/lastfm"
import { getEnv } from "../types/env"

const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/"

export class LastfmConfigError extends Error {
  constructor(message = "Last.fm API key is not configured. Set LASTFM_API_KEY in .env") {
    super(message)
    this.name = "LastfmConfigError"
  }
}

export class LastfmApiError extends Error {
  constructor(
    message: string,
    public code: number,
  ) {
    super(message)
    this.name = "LastfmApiError"
  }
}

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export function clearLastfmCache(): void {
  cache.clear()
}

export function getLastfmApiKey(): string {
  try {
    const env = getEnv()
    if (env.LASTFM_API_KEY) return env.LASTFM_API_KEY
  } catch {
    // getEnv might throw if validateEnv() has not been called yet
  }
  return process.env.LASTFM_API_KEY || ""
}

export function getDefaultUsername(): string {
  try {
    const env = getEnv()
    if (env.LASTFM_USERNAME) return env.LASTFM_USERNAME
  } catch {
    // getEnv might throw if validateEnv() has not been called yet
  }
  return process.env.LASTFM_USERNAME || ""
}

function ensureArray<T>(item: T | T[] | undefined | null): T[] {
  if (item === undefined || item === null) return []
  return Array.isArray(item) ? item : [item]
}

function extractImages(images?: Array<{ size?: string; "#text"?: string }>): LastfmImage {
  const result: LastfmImage = {
    small: null,
    medium: null,
    large: null,
    extraLarge: null,
    mega: null,
  }
  if (!Array.isArray(images)) return result
  for (const img of images) {
    const url = img["#text"]?.trim() || null
    if (!url) continue
    switch (img.size) {
      case "small":
        result.small = url
        break
      case "medium":
        result.medium = url
        break
      case "large":
        result.large = url
        break
      case "extralarge":
        result.extraLarge = url
        break
      case "mega":
        result.mega = url
        break
    }
  }
  return result
}

function extractArtistName(artist: any): string {
  if (!artist) return ""
  if (typeof artist === "string") return artist
  return artist["#text"] || artist.name || ""
}

function extractAlbumName(album: any): string | null {
  if (!album) return null
  if (typeof album === "string") return album
  const name = album["#text"] || album.name
  return name && name.trim() ? name.trim() : null
}

function parseTrack(raw: any): LastfmTrack {
  const isNowPlaying = raw["@attr"]?.nowplaying === "true"
  let date = null
  if (!isNowPlaying && raw.date) {
    const uts = Number(raw.date.uts) || 0
    date = {
      uts,
      text: raw.date["#text"] ?? "",
    }
  }

  return {
    name: raw.name ?? "",
    artist: extractArtistName(raw.artist),
    album: extractAlbumName(raw.album),
    url: raw.url ?? "",
    image: extractImages(raw.image),
    nowPlaying: isNowPlaying,
    date,
    mbid: raw.mbid && raw.mbid.trim() ? raw.mbid.trim() : null,
  }
}

export async function callLastfmApi(
  method: string,
  params: Record<string, string | number | undefined>,
  options: {
    apiKey?: string
    ttlMs?: number
    skipCache?: boolean
  } = {},
): Promise<any> {
  const apiKey = options.apiKey || getLastfmApiKey()
  if (!apiKey) {
    throw new LastfmConfigError()
  }

  const queryParams = new URLSearchParams({
    method,
    api_key: apiKey,
    format: "json",
  })

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      queryParams.set(key, String(val))
    }
  }

  const cacheKey = `${method}:${queryParams.toString()}`
  const now = Date.now()

  if (!options.skipCache) {
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      return cached.data
    }
  }

  const url = `${LASTFM_API_BASE}?${queryParams.toString()}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  let res: Response
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Personal-API/1.0",
      },
    })
  } catch (err: any) {
    clearTimeout(timeout)
    if (err?.name === "AbortError") {
      throw new Error("Last.fm API request timed out")
    }
    throw new Error(`Failed to connect to Last.fm API: ${err?.message || err}`)
  } finally {
    clearTimeout(timeout)
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    throw new Error(`Failed to parse Last.fm API response (status ${res.status})`)
  }

  if (data?.error) {
    throw new LastfmApiError(data.message || `Last.fm error ${data.error}`, Number(data.error))
  }

  if (!res.ok) {
    throw new Error(`Last.fm API error (status ${res.status})`)
  }

  const ttl = options.ttlMs ?? 10000
  if (ttl > 0) {
    cache.set(cacheKey, { data, expiresAt: now + ttl })
  }

  return data
}

export async function getRecentTracks(
  username: string,
  limit = 10,
  page = 1,
  skipCache = false,
): Promise<LastfmRecentTracksResponse> {
  const clampedLimit = Math.max(1, Math.min(limit, 50))
  const clampedPage = Math.max(1, page)

  const raw = await callLastfmApi(
    "user.getrecenttracks",
    {
      user: username,
      limit: clampedLimit,
      page: clampedPage,
      extended: 1,
    },
    { ttlMs: 10000, skipCache },
  )

  const container = raw.recenttracks ?? {}
  const rawTracks = ensureArray(container.track)
  const tracks = rawTracks.map(parseTrack)
  const attr = container["@attr"] ?? {}

  return {
    user: attr.user || username,
    tracks,
    pagination: {
      user: attr.user || username,
      page: Number(attr.page) || clampedPage,
      perPage: Number(attr.perPage) || tracks.length,
      totalPages: Number(attr.totalPages) || 1,
      total: Number(attr.total) || tracks.length,
    },
  }
}

export async function getNowPlaying(username: string, skipCache = false): Promise<LastfmNowPlaying> {
  const recent = await getRecentTracks(username, 1, 1, skipCache)
  const firstTrack = recent.tracks[0] ?? null
  const nowPlaying = Boolean(firstTrack?.nowPlaying)

  return {
    user: recent.user || username,
    nowPlaying,
    track: firstTrack,
  }
}

export async function getUserProfile(username: string, skipCache = false): Promise<LastfmUserProfile> {
  const raw = await callLastfmApi(
    "user.getinfo",
    { user: username },
    { ttlMs: 60000, skipCache },
  )

  const u = raw.user ?? {}
  return {
    username: u.name ?? username,
    realname: u.realname && u.realname.trim() ? u.realname.trim() : null,
    url: u.url ?? `https://www.last.fm/user/${username}`,
    image: extractImages(u.image),
    country: u.country && u.country !== "None" ? u.country : null,
    age: u.age && u.age !== "0" ? Number(u.age) : null,
    gender: u.gender && u.gender !== "None" ? u.gender : null,
    playcount: Number(u.playcount) || 0,
    artistCount: u.artist_count ? Number(u.artist_count) : null,
    trackCount: u.track_count ? Number(u.track_count) : null,
    albumCount: u.album_count ? Number(u.album_count) : null,
    playlists: Number(u.playlists) || 0,
    registered: u.registered
      ? {
          uts: Number(u.registered.unixtime) || 0,
          text: u.registered["#text"] ?? "",
        }
      : null,
  }
}

export async function getTopTracks(
  username: string,
  period: LastfmPeriod = "7day",
  limit = 10,
  page = 1,
  skipCache = false,
): Promise<LastfmTopTracksResponse> {
  const clampedLimit = Math.max(1, Math.min(limit, 100))
  const clampedPage = Math.max(1, page)

  const raw = await callLastfmApi(
    "user.gettoptracks",
    {
      user: username,
      period,
      limit: clampedLimit,
      page: clampedPage,
    },
    { ttlMs: 300000, skipCache },
  )

  const container = raw.toptracks ?? {}
  const rawTracks = ensureArray(container.track)
  const tracks = rawTracks.map((t: any) => ({
    name: t.name ?? "",
    artist: extractArtistName(t.artist),
    playcount: Number(t.playcount) || 0,
    listeners: t.listeners ? Number(t.listeners) : null,
    url: t.url ?? "",
    mbid: t.mbid && t.mbid.trim() ? t.mbid.trim() : null,
    rank: Number(t["@attr"]?.rank) || 0,
    image: extractImages(t.image),
  }))
  const attr = container["@attr"] ?? {}

  return {
    user: attr.user || username,
    tracks,
    pagination: {
      user: attr.user || username,
      page: Number(attr.page) || clampedPage,
      perPage: Number(attr.perPage) || tracks.length,
      totalPages: Number(attr.totalPages) || 1,
      total: Number(attr.total) || tracks.length,
    },
  }
}

export async function getTopArtists(
  username: string,
  period: LastfmPeriod = "7day",
  limit = 10,
  page = 1,
  skipCache = false,
): Promise<LastfmTopArtistsResponse> {
  const clampedLimit = Math.max(1, Math.min(limit, 100))
  const clampedPage = Math.max(1, page)

  const raw = await callLastfmApi(
    "user.gettopartists",
    {
      user: username,
      period,
      limit: clampedLimit,
      page: clampedPage,
    },
    { ttlMs: 300000, skipCache },
  )

  const container = raw.topartists ?? {}
  const rawArtists = ensureArray(container.artist)
  const artists = rawArtists.map((a: any) => ({
    name: a.name ?? "",
    playcount: Number(a.playcount) || 0,
    url: a.url ?? "",
    mbid: a.mbid && a.mbid.trim() ? a.mbid.trim() : null,
    rank: Number(a["@attr"]?.rank) || 0,
    image: extractImages(a.image),
  }))
  const attr = container["@attr"] ?? {}

  return {
    user: attr.user || username,
    artists,
    pagination: {
      user: attr.user || username,
      page: Number(attr.page) || clampedPage,
      perPage: Number(attr.perPage) || artists.length,
      totalPages: Number(attr.totalPages) || 1,
      total: Number(attr.total) || artists.length,
    },
  }
}

export async function getTopAlbums(
  username: string,
  period: LastfmPeriod = "7day",
  limit = 10,
  page = 1,
  skipCache = false,
): Promise<LastfmTopAlbumsResponse> {
  const clampedLimit = Math.max(1, Math.min(limit, 100))
  const clampedPage = Math.max(1, page)

  const raw = await callLastfmApi(
    "user.gettopalbums",
    {
      user: username,
      period,
      limit: clampedLimit,
      page: clampedPage,
    },
    { ttlMs: 300000, skipCache },
  )

  const container = raw.topalbums ?? {}
  const rawAlbums = ensureArray(container.album)
  const albums = rawAlbums.map((a: any) => ({
    name: a.name ?? "",
    artist: extractArtistName(a.artist),
    playcount: Number(a.playcount) || 0,
    url: a.url ?? "",
    mbid: a.mbid && a.mbid.trim() ? a.mbid.trim() : null,
    rank: Number(a["@attr"]?.rank) || 0,
    image: extractImages(a.image),
  }))
  const attr = container["@attr"] ?? {}

  return {
    user: attr.user || username,
    albums,
    pagination: {
      user: attr.user || username,
      page: Number(attr.page) || clampedPage,
      perPage: Number(attr.perPage) || albums.length,
      totalPages: Number(attr.totalPages) || 1,
      total: Number(attr.total) || albums.length,
    },
  }
}
