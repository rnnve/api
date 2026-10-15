import { describe, expect, it, beforeEach, afterEach } from "bun:test"
import app from "../src/index"
import { clearSpotifyCache, saveRefreshToken } from "../src/lib/spotify"

describe("Spotify API Integration", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    clearSpotifyCache()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    clearSpotifyCache()
    process.env = { ...originalEnv }
  })

  it("exposes spotify endpoints in root / response", async () => {
    const res = await app.handle(new Request("http://localhost/"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.endpoints.spotify).toBeDefined()
    expect(json.endpoints.spotify.root).toBe("/api/v2/spotify")
    expect(json.endpoints.spotify.nowPlaying).toBe("/api/v2/spotify/now-playing")
    expect(json.endpoints.spotify.login).toBe("/api/v2/spotify/login")
  })

  it("returns 503 if SPOTIFY_CLIENT_ID is missing", async () => {
    delete process.env.SPOTIFY_CLIENT_ID
    delete process.env.SPOTIFY_CLIENT_SECRET

    const res = await app.handle(new Request("http://localhost/api/v2/spotify"))
    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toContain("Spotify client credentials not configured")
  })

  it("returns 200 with authorized: false if not logged in yet", async () => {
    process.env.SPOTIFY_CLIENT_ID = "mock_client_id"
    process.env.SPOTIFY_CLIENT_SECRET = "mock_client_secret"
    delete process.env.SPOTIFY_REFRESH_TOKEN

    const res = await app.handle(new Request("http://localhost/api/v2/spotify"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.authorized).toBe(false)
    expect(json.loginUrl).toBe("/api/v2/spotify/login")
  })

  it("returns 401 if now-playing is requested without authorization", async () => {
    process.env.SPOTIFY_CLIENT_ID = "mock_client_id"
    process.env.SPOTIFY_CLIENT_SECRET = "mock_client_secret"
    delete process.env.SPOTIFY_REFRESH_TOKEN

    const res = await app.handle(new Request("http://localhost/api/v2/spotify/now-playing"))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toContain("Spotify is not authorized")
    expect(json.loginUrl).toBe("/api/v2/spotify/login")
  })

  it("redirects /v2/spotify to /api/v2/spotify", async () => {
    const res = await app.handle(new Request("http://localhost/v2/spotify"))
    expect(res.status).toBe(308)
    expect(res.headers.get("location")).toBe("/api/v2/spotify")
  })

  it("redirects /v2/spotify/now-playing to /api/v2/spotify/now-playing", async () => {
    const res = await app.handle(new Request("http://localhost/v2/spotify/now-playing"))
    expect(res.status).toBe(308)
    expect(res.headers.get("location")).toBe("/api/v2/spotify/now-playing")
  })

  it("redirects to Spotify authorization page on /api/v2/spotify/login", async () => {
    process.env.SPOTIFY_CLIENT_ID = "mock_client_id"
    process.env.SPOTIFY_CLIENT_SECRET = "mock_client_secret"
    process.env.SPOTIFY_REDIRECT_URI = "http://localhost:6770/api/v2/spotify/callback"

    const res = await app.handle(new Request("http://localhost/api/v2/spotify/login"))
    expect(res.status).toBe(302)
    const location = res.headers.get("location")
    expect(location).toBeDefined()
    expect(location).toContain("https://accounts.spotify.com/authorize")
    expect(location).toContain("client_id=mock_client_id")
    expect(location).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A6770%2Fapi%2Fv2%2Fspotify%2Fcallback")
    expect(location).toContain("user-read-currently-playing")
  })

  it("handles OAuth callback and exchanges code for tokens", async () => {
    process.env.SPOTIFY_CLIENT_ID = "mock_client_id"
    process.env.SPOTIFY_CLIENT_SECRET = "mock_client_secret"
    process.env.SPOTIFY_REDIRECT_URI = "http://localhost:6770/api/v2/spotify/callback"

    const origFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes("accounts.spotify.com/api/token")) {
        return new Response(JSON.stringify({
          access_token: "mock_access_token",
          token_type: "Bearer",
          scope: "user-read-currently-playing user-read-playback-state",
          expires_in: 3600,
          refresh_token: "mock_refresh_token_123",
        }), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      return new Response("Not found", { status: 404 })
    }) as any

    try {
      const res = await app.handle(new Request("http://localhost/api/v2/spotify/callback?code=mock_auth_code"))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.refreshToken).toBe("mock_refresh_token_123")
      expect(json.message).toContain("Spotify authorized successfully")
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it("returns currently playing song when active", async () => {
    process.env.SPOTIFY_CLIENT_ID = "mock_client_id"
    process.env.SPOTIFY_CLIENT_SECRET = "mock_client_secret"
    await saveRefreshToken("saved_refresh_token")

    const mockPlayback = {
      is_playing: true,
      progress_ms: 60000,
      item: {
        id: "track123",
        name: "Get Lucky",
        duration_ms: 240000,
        uri: "spotify:track:track123",
        external_urls: { spotify: "https://open.spotify.com/track/track123" },
        artists: [
          { name: "Daft Punk", id: "art1", external_urls: { spotify: "https://open.spotify.com/artist/art1" } },
          { name: "Pharrell Williams", id: "art2", external_urls: { spotify: "https://open.spotify.com/artist/art2" } },
        ],
        album: {
          name: "Random Access Memories",
          images: [
            { url: "https://img.scdn.co/640.jpg", height: 640, width: 640 },
            { url: "https://img.scdn.co/300.jpg", height: 300, width: 300 },
            { url: "https://img.scdn.co/64.jpg", height: 64, width: 64 },
          ],
        },
      },
      device: {
        name: "MacBook Pro",
        type: "Computer",
        volume_percent: 80,
      },
      context: {
        type: "album",
        external_urls: { spotify: "https://open.spotify.com/album/ram" },
      },
    }

    const origFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes("accounts.spotify.com/api/token")) {
        return new Response(JSON.stringify({
          access_token: "mock_refreshed_access_token",
          token_type: "Bearer",
          expires_in: 3600,
        }), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      if (urlStr.includes("api.spotify.com/v1/me/player")) {
        return new Response(JSON.stringify(mockPlayback), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
      return new Response("Not found", { status: 404 })
    }) as any

    try {
      const res = await app.handle(new Request("http://localhost/api/v2/spotify/now-playing"))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.isPlaying).toBe(true)
      expect(json.data.track.name).toBe("Get Lucky")
      expect(json.data.track.artist).toBe("Daft Punk, Pharrell Williams")
      expect(json.data.track.album).toBe("Random Access Memories")
      expect(json.data.track.cover).toBe("https://img.scdn.co/640.jpg")
      expect(json.data.track.images.small).toBe("https://img.scdn.co/64.jpg")
      expect(json.data.track.images.medium).toBe("https://img.scdn.co/300.jpg")
      expect(json.data.track.images.large).toBe("https://img.scdn.co/640.jpg")
      expect(json.data.progressMs).toBe(60000)
      expect(json.data.device.name).toBe("MacBook Pro")
      expect(json.data.startedAt).toBeDefined()
      expect(json.data.endsAt).toBeDefined()
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it("handles 204 No Content when nothing is playing and falls back to lastPlayed", async () => {
    process.env.SPOTIFY_CLIENT_ID = "mock_client_id"
    process.env.SPOTIFY_CLIENT_SECRET = "mock_client_secret"
    await saveRefreshToken("saved_refresh_token")

    const mockRecentlyPlayed = {
      items: [
        {
          track: {
            id: "recent123",
            name: "Starboy",
            duration_ms: 230000,
            uri: "spotify:track:recent123",
            external_urls: { spotify: "https://open.spotify.com/track/recent123" },
            artists: [{ name: "The Weeknd" }],
            album: {
              name: "Starboy",
              images: [{ url: "https://img.scdn.co/starboy.jpg" }],
            },
          },
          played_at: "2024-03-10T12:00:00.000Z",
        },
      ],
    }

    const origFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes("accounts.spotify.com/api/token")) {
        return new Response(JSON.stringify({
          access_token: "mock_token",
          token_type: "Bearer",
          expires_in: 3600,
        }), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      if (urlStr.includes("/me/player/recently-played")) {
        return new Response(JSON.stringify(mockRecentlyPlayed), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
      if (urlStr.includes("/me/player")) {
        return new Response(null, { status: 204 })
      }
      return new Response("Not found", { status: 404 })
    }) as any

    try {
      const res = await app.handle(new Request("http://localhost/api/v2/spotify/now-playing"))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.isPlaying).toBe(false)
      expect(json.data.track).toBeNull()
      expect(json.data.lastPlayed).toBeDefined()
      expect(json.data.lastPlayed.name).toBe("Starboy")
      expect(json.data.lastPlayed.artist).toBe("The Weeknd")
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it("handles automatic token refresh on 401 response from Spotify", async () => {
    process.env.SPOTIFY_CLIENT_ID = "mock_client_id"
    process.env.SPOTIFY_CLIENT_SECRET = "mock_client_secret"
    await saveRefreshToken("saved_refresh_token")

    let refreshCalled = 0
    let playerCalled = 0

    const origFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes("accounts.spotify.com/api/token")) {
        refreshCalled++
        return new Response(JSON.stringify({
          access_token: `token_v${refreshCalled}`,
          token_type: "Bearer",
          expires_in: 3600,
        }), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      if (urlStr.includes("/me/player/recently-played")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      if (urlStr.includes("/me/player/currently-playing")) {
        return new Response(null, { status: 204 })
      }
      if (urlStr.includes("/me/player")) {
        playerCalled++
        if (playerCalled === 1) {
          // First attempt returns 401 expired
          return new Response(JSON.stringify({ error: { status: 401, message: "The access token expired" } }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          })
        }
        // Second attempt after refresh succeeds
        return new Response(null, { status: 204 })
      }
      return new Response("Not found", { status: 404 })
    }) as any

    try {
      const res = await app.handle(new Request("http://localhost/api/v2/spotify/now-playing?nocache=true"))
      expect(res.status).toBe(200)
      expect(refreshCalled).toBeGreaterThanOrEqual(2)
      expect(playerCalled).toBe(2)
    } finally {
      globalThis.fetch = origFetch
    }
  })
})
