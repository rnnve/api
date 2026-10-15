import { Elysia, redirect, t } from "elysia"
import {
  SpotifyApiError,
  SpotifyAuthError,
  SpotifyConfigError,
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  getCurrentlyPlaying,
  getRecentlyPlayed,
  getSpotifyClientId,
  getStoredRefreshToken,
  resolveRedirectUri,
} from "../../lib/spotify"

const detail = (summary: string, description: string, tags = ["Spotify"]) => ({
  detail: { summary, description, tags },
})

function handleError(err: any, set: { status?: number | string }) {
  if (err instanceof SpotifyConfigError) {
    set.status = 503
    return { success: false, error: err.message }
  }
  if (err instanceof SpotifyAuthError) {
    set.status = 401
    return {
      success: false,
      error: err.message,
      loginUrl: "/api/v2/spotify/login",
    }
  }
  if (err instanceof SpotifyApiError) {
    set.status = err.status >= 400 && err.status < 600 ? err.status : 502
    return { success: false, error: err.message }
  }
  set.status = 500
  return { success: false, error: err?.message || "Internal server error" }
}

export const spotifyRoute = new Elysia({ prefix: "/api/v2/spotify" })
  .get(
    "",
    async ({ query, set }) => {
      const clientId = getSpotifyClientId()
      if (!clientId) {
        set.status = 503
        return {
          success: false,
          error: "Spotify client credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env",
        }
      }

      const refreshToken = await getStoredRefreshToken()
      if (!refreshToken) {
        return {
          success: true,
          authorized: false,
          message: "Spotify integration is ready but not authorized. Visit /api/v2/spotify/login to authenticate.",
          loginUrl: "/api/v2/spotify/login",
          endpoints: {
            nowPlaying: "/api/v2/spotify/now-playing",
            recent: "/api/v2/spotify/recent",
            login: "/api/v2/spotify/login",
          },
        }
      }

      try {
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getCurrentlyPlaying(skipCache)
        return {
          success: true,
          authorized: true,
          data,
        }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail(
        "Spotify Overview",
        "Returns the currently playing song if authorized, or authentication status with login link.",
      ),
      query: t.Object({
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass in-memory cache" })),
      }),
    },
  )
  .get(
    "/now-playing",
    async ({ query, set }) => {
      try {
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getCurrentlyPlaying(skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail(
        "Get Spotify Currently Playing Song",
        "Returns the user's currently playing track on Spotify. If nothing is playing, returns isPlaying: false with last played track if available.",
      ),
      query: t.Object({
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass in-memory cache" })),
      }),
    },
  )
  .get(
    "/currently-playing",
    async ({ query, set }) => {
      try {
        const skipCache = query.nocache === "true" || query.nocache === "1"
        const data = await getCurrentlyPlaying(skipCache)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail(
        "Get Spotify Currently Playing Song (Alias)",
        "Alias for /api/v2/spotify/now-playing.",
      ),
      query: t.Object({
        nocache: t.Optional(t.String({ description: "Set to 'true' to bypass in-memory cache" })),
      }),
    },
  )
  .get(
    "/recent",
    async ({ query, set }) => {
      try {
        const limit = query.limit ? Number(query.limit) : 10
        const data = await getRecentlyPlayed(limit)
        return { success: true, data }
      } catch (err) {
        return handleError(err, set)
      }
    },
    {
      ...detail("Get Spotify Recently Played Tracks", "Returns recently played tracks from Spotify."),
      query: t.Object({
        limit: t.Optional(t.String({ description: "Number of tracks to return (default 10)" })),
      }),
    },
  )
  .get(
    "/login",
    ({ request, redirect: redir, set }) => {
      try {
        const redirectUri = resolveRedirectUri(request)
        const authUrl = buildAuthorizeUrl(redirectUri)
        return redir(authUrl, 302)
      } catch (err: any) {
        return handleError(err, set)
      }
    },
    detail("Spotify OAuth Login", "Redirects to Spotify to authorize access to currently playing track."),
  )
  .get(
    "/auth/login",
    ({ request, redirect: redir, set }) => {
      try {
        const redirectUri = resolveRedirectUri(request)
        const authUrl = buildAuthorizeUrl(redirectUri)
        return redir(authUrl, 302)
      } catch (err: any) {
        return handleError(err, set)
      }
    },
    detail("Spotify OAuth Login (Alias)", "Alias for /api/v2/spotify/login."),
  )
  .get(
    "/callback",
    async ({ request, query, set }) => {
      const code = query.code
      const error = query.error

      if (error) {
        set.status = 400
        return { success: false, error: `Spotify authorization failed: ${error}` }
      }

      if (!code) {
        set.status = 400
        return { success: false, error: "Missing authorization code" }
      }

      try {
        const redirectUri = resolveRedirectUri(request)
        const tokens = await exchangeCodeForTokens(code, redirectUri)

        return {
          success: true,
          message: "Spotify authorized successfully! Your currently playing song is now live at /api/v2/spotify/now-playing.",
          refreshToken: tokens.refresh_token,
          tip: "To persist your session across restarts without Redis, you can also add this refresh token to your .env: SPOTIFY_REFRESH_TOKEN=" + (tokens.refresh_token || ""),
        }
      } catch (err: any) {
        return handleError(err, set)
      }
    },
    {
      ...detail("Spotify OAuth Callback", "Exchanges Spotify authorization code for access and refresh tokens."),
      query: t.Object({
        code: t.Optional(t.String({ description: "Authorization code returned by Spotify" })),
        error: t.Optional(t.String({ description: "Error returned by Spotify" })),
      }),
    },
  )
  .get(
    "/auth/callback",
    async ({ request, query, set }) => {
      const code = query.code
      const error = query.error

      if (error) {
        set.status = 400
        return { success: false, error: `Spotify authorization failed: ${error}` }
      }

      if (!code) {
        set.status = 400
        return { success: false, error: "Missing authorization code" }
      }

      try {
        const redirectUri = resolveRedirectUri(request)
        const tokens = await exchangeCodeForTokens(code, redirectUri)

        return {
          success: true,
          message: "Spotify authorized successfully! Your currently playing song is now live at /api/v2/spotify/now-playing.",
          refreshToken: tokens.refresh_token,
          tip: "To persist your session across restarts without Redis, you can also add this refresh token to your .env: SPOTIFY_REFRESH_TOKEN=" + (tokens.refresh_token || ""),
        }
      } catch (err: any) {
        return handleError(err, set)
      }
    },
    {
      ...detail("Spotify OAuth Callback (Alias)", "Alias for /api/v2/spotify/callback."),
      query: t.Object({
        code: t.Optional(t.String({ description: "Authorization code returned by Spotify" })),
        error: t.Optional(t.String({ description: "Error returned by Spotify" })),
      }),
    },
  )

export const spotifyRedirects = new Elysia()
  .get("/v2/spotify", ({ redirect: redir }) => redir("/api/v2/spotify", 308))
  .get("/v2/spotify/*", ({ params, redirect: redir }) => redir(`/api/v2/spotify/${params["*"]}`, 308))
