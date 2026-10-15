import { Elysia, redirect, t } from "elysia"
import {
  LastfmApiError,
  LastfmConfigError,
  callLastfmApi,
  getDefaultUsername,
  getNowPlaying,
  getRecentTracks,
  getTopAlbums,
  getTopArtists,
  getTopTracks,
  getUserProfile,
} from "../../lib/lastfm"
import type { LastfmPeriod } from "../../types/lastfm"

const detail = (summary: string, description: string, tags = ["Last.fm"]) => ({
  detail: { summary, description, tags },
})

function handleError(err: any, set: { status?: number | string }) {
  if (err instanceof LastfmConfigError) {
    set.status = 503
    return { success: false, error: err.message }
  }
  if (err instanceof LastfmApiError) {
    if (err.code === 6) {
      set.status = 404
    } else if (err.code === 10) {
      set.status = 401
    } else if (err.code === 26) {
      set.status = 403
    } else {
      set.status = 400
    }
    return { success: false, error: err.message, code: err.code }
  }
  set.status = 500
  return { success: false, error: err?.message || "Internal server error" }
}

function resolveUser(explicit?: string): string | null {
  if (explicit && explicit.trim()) return explicit.trim()
  const def = getDefaultUsername()
  return def && def.trim() ? def.trim() : null
}

const VALID_PERIODS = new Set<LastfmPeriod>(["overall", "7day", "1month", "3month", "6month", "12month"])

function normalizePeriod(period?: string): LastfmPeriod {
  if (period && VALID_PERIODS.has(period as LastfmPeriod)) {
    return period as LastfmPeriod
  }
  return "7day"
}

export const lastfmRoute = new Elysia({ prefix: "/api/v2/lastfm" })
  .get(
    "",
    async ({ query, set }) => {
      const user = resolveUser(query.user)
      if (!user) {
        return {
          success: true,
          message: "Last.fm API service is active",
          user: null,
          usage: "Provide ?user=<username> to query Last.fm, or set LASTFM_USERNAME in .env",
          endpoints: {
            nowPlaying: "/api/v2/lastfm/now-playing",
            recentTracks: "/api/v2/lastfm/recent",
            topTracks: "/api/v2/lastfm/top-tracks",
            topArtists: "/api/v2/lastfm/top-artists",
            topAlbums: "/api/v2/lastfm/top-albums",
            profile: "/api/v2/lastfm/profile",
            raw: "/api/v2/lastfm/raw",
          },
        }
      }

      try {
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getNowPlaying(user, skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail(
        "Last.fm Overview / Now Playing",
        "Returns the currently playing (or most recently played) track for the configured or requested user.",
      ),
      query: t.Object({
        user: t.Optional(t.String({ description: "Last.fm username. Defaults to LASTFM_USERNAME in .env" })),
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass in-memory cache" })),
      }),
    },
  )
  .get(
    "/now-playing",
    async ({ query, set }) => {
      const user = resolveUser(query.user)
      if (!user) {
        set.status = 400
        return {
          success: false,
          error: "Username is required. Provide ?user=<username> or configure LASTFM_USERNAME in .env",
        }
      }

      try {
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getNowPlaying(user, skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail(
        "Get Last.fm Now Playing",
        "Returns currently playing track information. If no track is playing, returns the most recent track.",
      ),
      query: t.Object({
        user: t.Optional(t.String({ description: "Last.fm username. Defaults to LASTFM_USERNAME in .env" })),
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass in-memory cache" })),
      }),
    },
  )
  .get(
    "/recent",
    async ({ query, set }) => {
      const user = resolveUser(query.user)
      if (!user) {
        set.status = 400
        return {
          success: false,
          error: "Username is required. Provide ?user=<username> or configure LASTFM_USERNAME in .env",
        }
      }

      try {
        const limit = query.limit ? Number(query.limit) : 10
        const page = query.page ? Number(query.page) : 1
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getRecentTracks(user, limit, page, skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail("Get Recent Tracks", "Returns a list of recent tracks/scrobbles with pagination."),
      query: t.Object({
        user: t.Optional(t.String({ description: "Last.fm username. Defaults to LASTFM_USERNAME in .env" })),
        limit: t.Optional(t.String({ description: "Number of tracks to return (1-50, default 10)" })),
        page: t.Optional(t.String({ description: "Page number (default 1)" })),
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass in-memory cache" })),
      }),
    },
  )
  .get(
    "/recent-tracks",
    async ({ query, set }) => {
      const user = resolveUser(query.user)
      if (!user) {
        set.status = 400
        return {
          success: false,
          error: "Username is required. Provide ?user=<username> or configure LASTFM_USERNAME in .env",
        }
      }

      try {
        const limit = query.limit ? Number(query.limit) : 10
        const page = query.page ? Number(query.page) : 1
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getRecentTracks(user, limit, page, skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail("Get Recent Tracks (Alias)", "Alias for /api/v2/lastfm/recent"),
      query: t.Object({
        user: t.Optional(t.String({ description: "Last.fm username. Defaults to LASTFM_USERNAME in .env" })),
        limit: t.Optional(t.String({ description: "Number of tracks to return (1-50, default 10)" })),
        page: t.Optional(t.String({ description: "Page number (default 1)" })),
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass in-memory cache" })),
      }),
    },
  )
  .get(
    "/top-tracks",
    async ({ query, set }) => {
      const user = resolveUser(query.user)
      if (!user) {
        set.status = 400
        return {
          success: false,
          error: "Username is required. Provide ?user=<username> or configure LASTFM_USERNAME in .env",
        }
      }

      try {
        const period = normalizePeriod(query.period)
        const limit = query.limit ? Number(query.limit) : 10
        const page = query.page ? Number(query.page) : 1
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getTopTracks(user, period, limit, page, skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail(
        "Get Top Tracks",
        "Returns the user's top tracks over a given period (overall, 7day, 1month, 3month, 6month, 12month).",
      ),
      query: t.Object({
        user: t.Optional(t.String({ description: "Last.fm username. Defaults to LASTFM_USERNAME in .env" })),
        period: t.Optional(
          t.String({
            description: "Time period: overall | 7day | 1month | 3month | 6month | 12month (default 7day)",
          }),
        ),
        limit: t.Optional(t.String({ description: "Number of tracks (1-100, default 10)" })),
        page: t.Optional(t.String({ description: "Page number (default 1)" })),
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass cache" })),
      }),
    },
  )
  .get(
    "/top-artists",
    async ({ query, set }) => {
      const user = resolveUser(query.user)
      if (!user) {
        set.status = 400
        return {
          success: false,
          error: "Username is required. Provide ?user=<username> or configure LASTFM_USERNAME in .env",
        }
      }

      try {
        const period = normalizePeriod(query.period)
        const limit = query.limit ? Number(query.limit) : 10
        const page = query.page ? Number(query.page) : 1
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getTopArtists(user, period, limit, page, skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail(
        "Get Top Artists",
        "Returns the user's top artists over a given period (overall, 7day, 1month, 3month, 6month, 12month).",
      ),
      query: t.Object({
        user: t.Optional(t.String({ description: "Last.fm username. Defaults to LASTFM_USERNAME in .env" })),
        period: t.Optional(
          t.String({
            description: "Time period: overall | 7day | 1month | 3month | 6month | 12month (default 7day)",
          }),
        ),
        limit: t.Optional(t.String({ description: "Number of artists (1-100, default 10)" })),
        page: t.Optional(t.String({ description: "Page number (default 1)" })),
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass cache" })),
      }),
    },
  )
  .get(
    "/top-albums",
    async ({ query, set }) => {
      const user = resolveUser(query.user)
      if (!user) {
        set.status = 400
        return {
          success: false,
          error: "Username is required. Provide ?user=<username> or configure LASTFM_USERNAME in .env",
        }
      }

      try {
        const period = normalizePeriod(query.period)
        const limit = query.limit ? Number(query.limit) : 10
        const page = query.page ? Number(query.page) : 1
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getTopAlbums(user, period, limit, page, skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail(
        "Get Top Albums",
        "Returns the user's top albums over a given period (overall, 7day, 1month, 3month, 6month, 12month).",
      ),
      query: t.Object({
        user: t.Optional(t.String({ description: "Last.fm username. Defaults to LASTFM_USERNAME in .env" })),
        period: t.Optional(
          t.String({
            description: "Time period: overall | 7day | 1month | 3month | 6month | 12month (default 7day)",
          }),
        ),
        limit: t.Optional(t.String({ description: "Number of albums (1-100, default 10)" })),
        page: t.Optional(t.String({ description: "Page number (default 1)" })),
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass cache" })),
      }),
    },
  )
  .get(
    "/profile",
    async ({ query, set }) => {
      const user = resolveUser(query.user)
      if (!user) {
        set.status = 400
        return {
          success: false,
          error: "Username is required. Provide ?user=<username> or configure LASTFM_USERNAME in .env",
        }
      }

      try {
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getUserProfile(user, skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail("Get Last.fm Profile", "Returns user profile details including playcounts, join date, and stats."),
      query: t.Object({
        user: t.Optional(t.String({ description: "Last.fm username. Defaults to LASTFM_USERNAME in .env" })),
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass cache" })),
      }),
    },
  )
  .get(
    "/user",
    async ({ query, set }) => {
      const user = resolveUser(query.user)
      if (!user) {
        set.status = 400
        return {
          success: false,
          error: "Username is required. Provide ?user=<username> or configure LASTFM_USERNAME in .env",
        }
      }

      try {
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getUserProfile(user, skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail("Get Last.fm Profile (Alias)", "Alias for /api/v2/lastfm/profile"),
      query: t.Object({
        user: t.Optional(t.String({ description: "Last.fm username. Defaults to LASTFM_USERNAME in .env" })),
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass cache" })),
      }),
    },
  )
  .get(
    "/user/:username",
    async ({ params, query, set }) => {
      try {
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getUserProfile(params.username, skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail("Get Last.fm Profile by Username", "Returns profile for a specific Last.fm username."),
      params: t.Object({
        username: t.String({ description: "Last.fm username" }),
      }),
      query: t.Object({
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass cache" })),
      }),
    },
  )
  .get(
    "/user/:username/now-playing",
    async ({ params, query, set }) => {
      try {
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getNowPlaying(params.username, skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail("Get Last.fm Now Playing by Username", "Returns now playing track for a specific Last.fm username."),
      params: t.Object({
        username: t.String({ description: "Last.fm username" }),
      }),
      query: t.Object({
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass cache" })),
      }),
    },
  )
  .get(
    "/user/:username/recent",
    async ({ params, query, set }) => {
      try {
        const limit = query.limit ? Number(query.limit) : 10
        const page = query.page ? Number(query.page) : 1
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getRecentTracks(params.username, limit, page, skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail("Get Recent Tracks by Username", "Returns recent tracks for a specific Last.fm username."),
      params: t.Object({
        username: t.String({ description: "Last.fm username" }),
      }),
      query: t.Object({
        limit: t.Optional(t.String({ description: "Number of tracks to return (1-50, default 10)" })),
        page: t.Optional(t.String({ description: "Page number (default 1)" })),
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass in-memory cache" })),
      }),
    },
  )
  .get(
    "/raw",
    async ({ query, set }) => {
      const { method, nocache, ...params } = query as Record<string, string | undefined>
      if (!method) {
        set.status = 400
        return { success: false, error: "Query parameter 'method' is required (e.g. ?method=user.getinfo)" }
      }

      try {
        const skipCache = nocache === "true" || nocache === "1"
        const data = await callLastfmApi(method, params, { skipCache })
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail(
        "Last.fm Raw API Proxy",
        "Pass-through proxy to any Last.fm API 2.0 method with provided query parameters.",
      ),
      query: t.Object({
        method: t.String({ description: "Last.fm API method, e.g. 'artist.getInfo' or 'user.getinfo'" }),
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass cache" })),
      }, { additionalProperties: true }),
    },
  )

export const lastfmRedirects = new Elysia()
  .get("/v2/lastfm", ({ redirect }) => redirect("/api/v2/lastfm", 308))
  .get("/v2/lastfm/*", ({ params, redirect }) => redirect(`/api/v2/lastfm/${params["*"]}`, 308))
