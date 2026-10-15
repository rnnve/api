import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test"
import app from "../src/index"
import { clearLastfmCache } from "../src/lib/lastfm"

describe("Last.fm API Integration", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    clearLastfmCache()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("exposes lastfm endpoints in root / response", async () => {
    const res = await app.handle(new Request("http://localhost/"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.endpoints.lastfm).toBeDefined()
    expect(json.endpoints.lastfm.root).toBe("/api/v2/lastfm")
    expect(json.endpoints.lastfm.nowPlaying).toBe("/api/v2/lastfm/now-playing")
  })

  it("returns 200 with service info at /api/v2/lastfm when no username is provided", async () => {
    delete process.env.LASTFM_USERNAME
    delete process.env.LASTFM_API_KEY

    const res = await app.handle(new Request("http://localhost/api/v2/lastfm"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.endpoints).toBeDefined()
    expect(json.usage).toBeDefined()
  })

  it("returns 503 error if LASTFM_API_KEY is missing when querying data", async () => {
    delete process.env.LASTFM_API_KEY
    process.env.LASTFM_USERNAME = "someuser"

    const res = await app.handle(new Request("http://localhost/api/v2/lastfm/now-playing"))
    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toContain("Last.fm API key is not configured")
  })

  it("returns 400 error if username is missing on sub-endpoints", async () => {
    process.env.LASTFM_API_KEY = "dummy_key"
    delete process.env.LASTFM_USERNAME

    const res = await app.handle(new Request("http://localhost/api/v2/lastfm/now-playing"))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toContain("Username is required")
  })

  it("redirects /v2/lastfm to /api/v2/lastfm", async () => {
    const res = await app.handle(new Request("http://localhost/v2/lastfm"))
    expect(res.status).toBe(308)
    expect(res.headers.get("location")).toBe("/api/v2/lastfm")
  })

  it("redirects /v2/lastfm/now-playing to /api/v2/lastfm/now-playing", async () => {
    const res = await app.handle(new Request("http://localhost/v2/lastfm/now-playing"))
    expect(res.status).toBe(308)
    expect(res.headers.get("location")).toBe("/api/v2/lastfm/now-playing")
  })

  it("correctly fetches and parses now-playing when music is playing", async () => {
    process.env.LASTFM_API_KEY = "test_api_key"

    const mockResponse = {
      recenttracks: {
        track: [
          {
            artist: { "#text": "Daft Punk", mbid: "artist-mbid" },
            album: { "#text": "Discovery", mbid: "album-mbid" },
            name: "One More Time",
            url: "https://www.last.fm/music/Daft+Punk/_/One+More+Time",
            image: [
              { size: "small", "#text": "https://img.test/small.jpg" },
              { size: "medium", "#text": "https://img.test/medium.jpg" },
              { size: "large", "#text": "https://img.test/large.jpg" },
              { size: "extralarge", "#text": "https://img.test/xlarge.jpg" },
              { size: "mega", "#text": "https://img.test/mega.jpg" },
            ],
            "@attr": { nowplaying: "true" },
          },
        ],
        "@attr": {
          user: "testuser",
          page: "1",
          perPage: "1",
          totalPages: "500",
          total: "5000",
        },
      },
    }

    const origFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      expect(urlStr).toContain("ws.audioscrobbler.com/2.0/")
      expect(urlStr).toContain("method=user.getrecenttracks")
      expect(urlStr).toContain("api_key=test_api_key")
      expect(urlStr).toContain("user=testuser")

      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }) as any

    try {
      const res = await app.handle(new Request("http://localhost/api/v2/lastfm/now-playing?user=testuser"))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.user).toBe("testuser")
      expect(json.data.nowPlaying).toBe(true)
      expect(json.data.track.name).toBe("One More Time")
      expect(json.data.track.artist).toBe("Daft Punk")
      expect(json.data.track.album).toBe("Discovery")
      expect(json.data.track.image.extraLarge).toBe("https://img.test/xlarge.jpg")
      expect(json.data.track.date).toBeNull()
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it("correctly fetches and parses recent tracks with timestamps when not currently playing", async () => {
    process.env.LASTFM_API_KEY = "test_api_key"

    const mockResponse = {
      recenttracks: {
        track: [
          {
            artist: { "#text": "Radiohead" },
            album: { "#text": "OK Computer" },
            name: "Karma Police",
            url: "https://www.last.fm/music/Radiohead/_/Karma+Police",
            image: [{ size: "large", "#text": "https://img.test/cover.jpg" }],
            date: { uts: "1700000000", "#text": "14 Nov 2023, 22:13" },
          },
        ],
        "@attr": {
          user: "cltq",
          page: "1",
          perPage: "10",
          totalPages: "100",
          total: "1000",
        },
      },
    }

    const origFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }) as any

    try {
      const res = await app.handle(new Request("http://localhost/api/v2/lastfm/recent?user=cltq&limit=5"))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.user).toBe("cltq")
      expect(json.data.tracks.length).toBe(1)
      expect(json.data.tracks[0].nowPlaying).toBe(false)
      expect(json.data.tracks[0].date.uts).toBe(1700000000)
      expect(json.data.tracks[0].date.text).toBe("14 Nov 2023, 22:13")
      expect(json.data.pagination.total).toBe(1000)
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it("correctly fetches user profile", async () => {
    process.env.LASTFM_API_KEY = "test_api_key"

    const mockResponse = {
      user: {
        name: "cltq",
        realname: "Fumi",
        url: "https://www.last.fm/user/cltq",
        country: "Thailand",
        age: "20",
        playcount: "45200",
        artist_count: "1200",
        track_count: "6000",
        album_count: "1500",
        playlists: "2",
        registered: {
          unixtime: "1500000000",
          "#text": "2017-07-14 02:40",
        },
        image: [{ size: "large", "#text": "https://img.test/avatar.jpg" }],
      },
    }

    const origFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }) as any

    try {
      const res = await app.handle(new Request("http://localhost/api/v2/lastfm/profile?user=cltq"))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.username).toBe("cltq")
      expect(json.data.realname).toBe("Fumi")
      expect(json.data.country).toBe("Thailand")
      expect(json.data.playcount).toBe(45200)
      expect(json.data.registered.uts).toBe(1500000000)
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it("handles Last.fm API errors (e.g. user not found error code 6)", async () => {
    process.env.LASTFM_API_KEY = "test_api_key"

    const origFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ error: 6, message: "User not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }) as any

    try {
      const res = await app.handle(new Request("http://localhost/api/v2/lastfm/now-playing?user=nonexistentuser"))
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error).toBe("User not found")
      expect(json.code).toBe(6)
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it("handles /raw proxy endpoint", async () => {
    process.env.LASTFM_API_KEY = "test_api_key"

    const origFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      expect(urlStr).toContain("method=artist.getinfo")
      expect(urlStr).toContain("artist=Cher")
      return new Response(JSON.stringify({ artist: { name: "Cher" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }) as any

    try {
      const res = await app.handle(new Request("http://localhost/api/v2/lastfm/raw?method=artist.getinfo&artist=Cher"))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.artist.name).toBe("Cher")
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it("handles top-tracks, top-artists, and top-albums", async () => {
    process.env.LASTFM_API_KEY = "test_api_key"

    const mockTracks = {
      toptracks: {
        track: [
          {
            name: "Creep",
            artist: { name: "Radiohead" },
            playcount: "50",
            listeners: "100",
            url: "https://www.last.fm/music/Radiohead/_/Creep",
            image: [{ size: "medium", "#text": "https://img.test/med.jpg" }],
            "@attr": { rank: "1" },
          },
        ],
        "@attr": { user: "cltq", page: "1", perPage: "10", totalPages: "1", total: "1" },
      },
    }

    const mockArtists = {
      topartists: {
        artist: [
          {
            name: "Radiohead",
            playcount: "500",
            url: "https://www.last.fm/music/Radiohead",
            image: [{ size: "large", "#text": "https://img.test/artist.jpg" }],
            "@attr": { rank: "1" },
          },
        ],
        "@attr": { user: "cltq", page: "1", perPage: "10", totalPages: "1", total: "1" },
      },
    }

    const mockAlbums = {
      topalbums: {
        album: [
          {
            name: "OK Computer",
            artist: { name: "Radiohead" },
            playcount: "200",
            url: "https://www.last.fm/music/Radiohead/OK+Computer",
            image: [{ size: "extralarge", "#text": "https://img.test/album.jpg" }],
            "@attr": { rank: "1" },
          },
        ],
        "@attr": { user: "cltq", page: "1", perPage: "10", totalPages: "1", total: "1" },
      },
    }

    const origFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes("user.gettoptracks")) {
        return new Response(JSON.stringify(mockTracks), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      if (urlStr.includes("user.gettopartists")) {
        return new Response(JSON.stringify(mockArtists), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      if (urlStr.includes("user.gettopalbums")) {
        return new Response(JSON.stringify(mockAlbums), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      return new Response("Not found", { status: 404 })
    }) as any

    try {
      const resTracks = await app.handle(new Request("http://localhost/api/v2/lastfm/top-tracks?user=cltq&period=1month"))
      expect(resTracks.status).toBe(200)
      const jsonTracks = await resTracks.json()
      expect(jsonTracks.data.tracks[0].name).toBe("Creep")
      expect(jsonTracks.data.tracks[0].artist).toBe("Radiohead")
      expect(jsonTracks.data.tracks[0].playcount).toBe(50)

      const resArtists = await app.handle(new Request("http://localhost/api/v2/lastfm/top-artists?user=cltq"))
      expect(resArtists.status).toBe(200)
      const jsonArtists = await resArtists.json()
      expect(jsonArtists.data.artists[0].name).toBe("Radiohead")
      expect(jsonArtists.data.artists[0].playcount).toBe(500)

      const resAlbums = await app.handle(new Request("http://localhost/api/v2/lastfm/top-albums?user=cltq"))
      expect(resAlbums.status).toBe(200)
      const jsonAlbums = await resAlbums.json()
      expect(jsonAlbums.data.albums[0].name).toBe("OK Computer")
      expect(jsonAlbums.data.albums[0].artist).toBe("Radiohead")
      expect(jsonAlbums.data.albums[0].playcount).toBe(200)
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it("handles single track object from Last.fm API instead of array", async () => {
    process.env.LASTFM_API_KEY = "test_api_key"

    const mockSingleTrack = {
      recenttracks: {
        track: {
          artist: { "#text": "Blur" },
          album: { "#text": "Parklife" },
          name: "Girls & Boys",
          url: "https://www.last.fm/music/Blur/_/Girls+&+Boys",
          image: [],
          date: { uts: "1600000000", "#text": "13 Sep 2020, 12:26" },
        },
        "@attr": { user: "singleuser", page: "1", perPage: "1", totalPages: "1", total: "1" },
      },
    }

    const origFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockSingleTrack), { status: 200, headers: { "Content-Type": "application/json" } })
    }) as any

    try {
      const res = await app.handle(new Request("http://localhost/api/v2/lastfm/recent?user=singleuser"))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.tracks.length).toBe(1)
      expect(json.data.tracks[0].name).toBe("Girls & Boys")
      expect(json.data.tracks[0].artist).toBe("Blur")
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it("uses LASTFM_USERNAME from environment if query param is omitted", async () => {
    process.env.LASTFM_API_KEY = "test_api_key"
    process.env.LASTFM_USERNAME = "envuser"

    const mockResponse = {
      recenttracks: {
        track: [],
        "@attr": { user: "envuser", page: "1", perPage: "1", totalPages: "0", total: "0" },
      },
    }

    let capturedUrl = ""
    const origFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = url.toString()
      return new Response(JSON.stringify(mockResponse), { status: 200, headers: { "Content-Type": "application/json" } })
    }) as any

    try {
      const res = await app.handle(new Request("http://localhost/api/v2/lastfm/now-playing"))
      expect(res.status).toBe(200)
      expect(capturedUrl).toContain("user=envuser")
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it("caches responses and bypasses with nocache=true", async () => {
    process.env.LASTFM_API_KEY = "test_api_key"
    process.env.LASTFM_USERNAME = "cacheduser"

    let callCount = 0
    const origFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      callCount++
      return new Response(JSON.stringify({
        recenttracks: {
          track: [],
          "@attr": { user: "cacheduser", page: "1", perPage: "1", totalPages: "0", total: "0" },
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } })
    }) as any

    try {
      // First call -> hits fetch
      await app.handle(new Request("http://localhost/api/v2/lastfm/now-playing"))
      expect(callCount).toBe(1)

      // Second call -> should hit in-memory cache
      await app.handle(new Request("http://localhost/api/v2/lastfm/now-playing"))
      expect(callCount).toBe(1)

      // Third call with nocache=true -> should bypass cache
      await app.handle(new Request("http://localhost/api/v2/lastfm/now-playing?nocache=true"))
      expect(callCount).toBe(2)
    } finally {
      globalThis.fetch = origFetch
    }
  })
})
