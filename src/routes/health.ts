import { Elysia } from "elysia"

export const health = new Elysia({ prefix: "/health" }).get("", () => "ok", {
  detail: {
    summary: "Health check",
    description: "Returns `ok` when the API process is available.",
    tags: ["Utilities"],
  },
})
