import { Elysia } from "elysia"

export const time = new Elysia({ prefix: "/time" }).get(
  "",
  () => {
    const now = new Date()
    const tz = "Asia/Bangkok"

    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    })

    const parts = formatter.formatToParts(now)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
    const local = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`

    return {
      timezone: tz,
      iso: now.toISOString(),
      local,
      timestamp: now.getTime(),
    }
  },
  {
    detail: {
      summary: "Current Bangkok time",
      description: "Returns the current time in UTC and Asia/Bangkok, plus a Unix timestamp.",
      tags: ["Utilities"],
    },
  },
)
