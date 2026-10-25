import { Elysia } from "elysia"
import { swagger } from "@elysiajs/swagger"
import YAML from "js-yaml"
import { health } from "./routes/health"
import { time } from "./routes/time"
import { socialsRoute } from "./routes/socials"
import { promptpay } from "./routes/promptpay"
import { lastfmRoute, lastfmRedirects } from "./routes/v2/lastfm"
import { spotifyRoute, spotifyRedirects } from "./routes/v2/spotify"
import { docsPage } from "./docs"
import { materialExpressiveMonochrome } from "./docs/theme"

const app = new Elysia()
  .use(
    swagger({
      path: "/_spec",
      provider: "scalar",
      scalarConfig: {
        theme: "none",
        layout: "modern",
        showSidebar: true,
        hideModels: false,
        hideDownloadButton: false,
        hideTestRequestButton: false,
        hideSearch: false,
        searchHotKey: "k",
        defaultHttpClient: {
          targetKey: "shell",
          clientKey: "curl",
        },
        customCss: materialExpressiveMonochrome,
        metaData: {
          title: "Fumi API — Docs & Playground",
          description: "Explore the API, inspect schemas, and send live requests.",
          ogTitle: "Fumi API — Docs & Playground",
          ogDescription: "Explore the API, inspect schemas, and send live requests.",
        },
      },
      documentation: {
        info: {
          title: "Fumi API",
          version: "1.0.0",
          description:
            "A small collection of personal services for presence, music, time, social links, and payments. " +
            "Choose an endpoint, add any parameters, then use **Test Request** to try it live.",
        },
        tags: [
          { name: "Discord", description: "Profiles, presence snapshots, and real-time activity streams." },
          { name: "Last.fm", description: "Now playing, listening history, charts, and profile data." },
          { name: "Spotify", description: "Playback state, listening history, and OAuth utilities." },
          { name: "Utilities", description: "Health, time, social links, and PromptPay helpers." },
        ],
      },
      exclude: ["/docs", "/playground", "/_spec", "/_spec/json", "/openapi.yaml"],
    }),
  )
  .get("/docs", () => docsPage("docs"))
  .get("/playground", () => docsPage("playground"))
  .get(
    "/",
    () => ({
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
        playground: "/playground",
      },
    }),
    {
      detail: {
        summary: "API overview",
        description: "Lists the available service groups and their primary endpoints.",
        tags: ["Utilities"],
      },
    },
  )
  .use(health)
  .use(time)
  .use(socialsRoute)
  .use(promptpay)
  .use(lastfmRoute)
  .use(lastfmRedirects)
  .use(spotifyRoute)
  .use(spotifyRedirects)

app.get("/openapi.yaml", async () => {
  const res = await app.fetch(new Request("http://localhost/_spec/json"))
  const spec = await res.json()
  return new Response(YAML.dump(spec), {
    headers: { "content-type": "text/yaml; charset=utf-8" },
  })
})

export default app
