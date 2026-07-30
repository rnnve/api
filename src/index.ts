import { Elysia } from "elysia"
import { swagger } from "@elysiajs/swagger"
import YAML from "js-yaml"
import { health } from "./routes/health"
import { time } from "./routes/time"
import { socialsRoute } from "./routes/socials"
import { promptpay } from "./routes/promptpay"

const app = new Elysia()
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "Fumi's Personal API",
          version: "1.0.0",
          description: "A personal serverless API. Discord presence tracking at /v2/discord (primary) and /v2/nd/discord (secondary).",
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
      discord: "/v2/discord",
      "discord-nd": "/v2/nd/discord",
      docs: "/docs",
    },
  }))
  .use(health)
  .use(time)
  .use(socialsRoute)
  .use(promptpay)

app.get("/openapi.yaml", async () => {
  const res = await app.fetch(new Request("http://localhost/docs/json"))
  const spec = await res.json()
  return new Response(YAML.dump(spec), {
    headers: { "content-type": "text/yaml; charset=utf-8" },
  })
})

export default app
