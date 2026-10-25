import { Elysia, t } from "elysia"
import generatePayload from "promptpay-qr"
import QRCode from "qrcode"

export const promptpay = new Elysia({ prefix: "/promptpay" }).get(
  "",
  async ({ query }) => {
    let target = query.number

    if (target.startsWith("+66")) {
      target = "0" + target.slice(3)
    } else if (target.startsWith("66") && target.length === 11) {
      target = "0" + target.slice(2)
    }

    const payload = generatePayload(target, {
      ...(query.amount ? { amount: query.amount } : {}),
    })

    const qrBuffer = await QRCode.toBuffer(payload, {
      type: "png",
      margin: 2,
      width: 512,
    })

    return new Response(new Uint8Array(qrBuffer), {
      headers: { "content-type": "image/png" },
    })
  },
  {
    detail: {
      summary: "Generate a PromptPay QR code",
      description: "Creates a PNG PromptPay QR code for a phone number or citizen ID, with an optional amount.",
      tags: ["Utilities"],
    },
    query: t.Object({
      number: t.String({
        description:
          "10-digit phone (+66 or 0 prefix) or 13-digit citizen ID",
      }),
      amount: t.Optional(
        t.Number({
          description: "Optional fixed amount for the QR",
        }),
      ),
    }),
  },
)
