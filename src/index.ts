import { Elysia } from "elysia"
import { swagger } from "@elysiajs/swagger"
import YAML from "js-yaml"
import { health } from "./routes/health"
import { time } from "./routes/time"
import { socialsRoute } from "./routes/socials"
import { promptpay } from "./routes/promptpay"
import { lastfmRoute, lastfmRedirects } from "./routes/v2/lastfm"
import { spotifyRoute, spotifyRedirects } from "./routes/v2/spotify"

const app = new Elysia()
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "Fumi's Personal API",
          version: "1.0.0",
          description: "A personal serverless API. Discord presence tracking at /v2/discord/user/1, /v2/discord/user/2, /v2/bot/:alias, Last.fm at /api/v2/lastfm, and Spotify at /api/v2/spotify.",
        },
      },
    }),
  )
  .get("/", () => ({
    name: "Fumi's Personal API",
    version: "1.0.0",
    timezone: "Asia/Bangkok",
    endpoints: {
      health: "/health",
      time: "/time",
      socials: "/socials/:name",
      discord: {
        user1: "/v2/discord/user/1",
        user2: "/v2/discord/user/2",
        bot: "/v2/bot/:alias",
        legacy: "/v2/discord",
        "legacy-nd": "/v2/nd/discord",
      },
      lastfm: {
        root: "/api/v2/lastfm",
        nowPlaying: "/api/v2/lastfm/now-playing",
        recent: "/api/v2/lastfm/recent",
        topTracks: "/api/v2/lastfm/top-tracks",
        topArtists: "/api/v2/lastfm/top-artists",
        topAlbums: "/api/v2/lastfm/top-albums",
        profile: "/api/v2/lastfm/profile",
      },
      spotify: {
        root: "/api/v2/spotify",
        nowPlaying: "/api/v2/spotify/now-playing",
        recent: "/api/v2/spotify/recent",
        login: "/api/v2/spotify/login",
        callback: "/api/v2/spotify/callback",
      },
      docs: "/docs",
    },
  }))
  .use(health)
  .use(time)
  .use(socialsRoute)
  .use(promptpay)
  .use(lastfmRoute)
  .use(lastfmRedirects)
  .use(spotifyRoute)
  .use(spotifyRedirects)

app.get("/openapi.yaml", async () => {
  const res = await app.fetch(new Request("http://localhost/docs/json"))
  const spec = await res.json()
  return new Response(YAML.dump(spec), {
    headers: { "content-type": "text/yaml; charset=utf-8" },
  })
})

export default app
