import { Elysia } from "elysia"
import { socials } from "../lib/socials"

export const socialsRoute = new Elysia({ prefix: "/socials" }).get(
  "/:name",
  ({ params, set, redirect }) => {
    const url = socials[params.name]

    if (!url) {
      set.status = 404
      return { error: "Social not found" }
    }

    return redirect(url, 302)
  },
  {
    detail: {
      summary: "Open a social profile",
      description: "Redirects a known social name to its configured profile URL.",
      tags: ["Utilities"],
    },
  },
)
