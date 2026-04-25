import nodemailer, { Transporter } from 'nodemailer'

let cachedTransporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter
  const host = process.env.SMTP_HOST
  if (!host) return null

  cachedTransporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
  return cachedTransporter
}

const STATUS_COPY: Record<string, { subject: string; headline: string; body: string }> = {
  PENDING: {
    subject: 'Order placed · SwiftDrop',
    headline: 'Your order is placed!',
    body: "Thanks for shopping! We've received your order and our team is getting it ready for pickup. You can follow every step here:",
  },
  CONFIRMED: {
    subject: 'Order confirmed · SwiftDrop',
    headline: 'Your order is confirmed',
    body: "We've assigned a delivery agent and your order is moving through our network. Track it live here:",
  },
  PICKED_UP: {
    subject: 'Picked up · SwiftDrop',
    headline: 'Your parcel has been picked up',
    body: 'Our agent has collected your parcel from the seller. You can follow the journey here:',
  },
  AT_MAIN_HUB: {
    subject: 'At our main hub · SwiftDrop',
    headline: 'Your parcel reached the main hub',
    body: "Your parcel is at our main hub and is being prepared for the next leg of its journey. Latest status:",
  },
  IN_TRANSIT: {
    subject: 'In transit · SwiftDrop',
    headline: 'Your parcel is on the move',
    body: 'Your parcel is on its way. Stay updated here:',
  },
  IN_TRANSIT_TO_LOCAL_HUB: {
    subject: 'On the way to your local hub · SwiftDrop',
    headline: 'Heading to your local hub',
    body: "Your parcel is in transit from our main hub to the local hub closest to you. We'll let you know when it arrives:",
  },
  AT_LOCAL_HUB: {
    subject: 'At your local hub · SwiftDrop',
    headline: 'Your parcel is at your local hub',
    body: 'Your parcel just arrived at the local hub near you and is ready for last-mile delivery:',
  },
  OUT_FOR_DELIVERY: {
    subject: 'Out for delivery · SwiftDrop',
    headline: 'Out for delivery today!',
    body: "Your parcel is out for delivery and should reach you soon. Track the agent live here:",
  },
  DELIVERED: {
    subject: 'Delivered · SwiftDrop',
    headline: 'Your parcel was delivered ✓',
    body: 'Your parcel has been delivered successfully. Thanks for using SwiftDrop!',
  },
  CANCELLED: {
    subject: 'Order cancelled · SwiftDrop',
    headline: 'Your order was cancelled',
    body: 'This order has been cancelled. If this was unexpected, please reach out to the seller.',
  },
}

function trackingUrl(token: string) {
  const base = (process.env.PUBLIC_TRACKING_BASE_URL || 'http://localhost:5173').replace(/\/$/, '')
  return `${base}/track/${token}`
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtml(opts: {
  headline: string
  body: string
  status: string
  customerName: string
  description: string
  trackingToken: string
  url: string
}) {
  const { headline, body, status, customerName, description, trackingToken, url } = opts
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F0F4F8;font-family:Inter,Arial,Helvetica,sans-serif;color:#1a2332;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">
            <tr>
              <td style="background:#0D1B2A;padding:20px 28px;color:#fff;">
                <span style="font-size:20px;font-weight:700;">⚡ SwiftDrop</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 6px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Hi ${escapeHtml(customerName)},</p>
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0D1B2A;">${escapeHtml(headline)}</h1>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(body)}</p>

                <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#E3F2FD;color:#1565C0;font-size:12px;font-weight:700;letter-spacing:0.04em;margin-bottom:20px;">
                  ${escapeHtml(status.replace(/_/g, ' '))}
                </div>

                <table cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 20px;">
                  <tr>
                    <td>
                      <a href="${url}" style="display:inline-block;padding:12px 22px;background:#1565C0;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
                        Track your parcel →
                      </a>
                    </td>
                  </tr>
                </table>

                <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #E5E9F0;padding-top:16px;">
                  <tr>
                    <td style="padding-top:16px;font-size:13px;color:#64748b;">
                      <div style="margin-bottom:6px;"><strong>Parcel:</strong> ${escapeHtml(description)}</div>
                      <div><strong>Tracking ID:</strong> <span style="font-family:monospace;">${escapeHtml(trackingToken)}</span></div>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;line-height:1.5;">
                  If the button doesn't work, paste this into your browser:<br>
                  <a href="${url}" style="color:#1565C0;word-break:break-all;">${url}</a>
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-size:11px;color:#94a3b8;">© SwiftDrop · Last-mile delivery, simplified.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function buildText(opts: { headline: string; body: string; trackingToken: string; url: string }) {
  return `${opts.headline}

${opts.body}

Track here: ${opts.url}

Tracking ID: ${opts.trackingToken}

— SwiftDrop`
}

export async function sendStatusEmail(order: {
  status: string
  customerName: string
  customerEmail: string | null
  description: string
  trackingToken: string
}) {
  if (!order.customerEmail) return // no recipient on file — silently skip

  const copy = STATUS_COPY[order.status] || {
    subject: `Update · SwiftDrop (${order.status})`,
    headline: `Your order status is now ${order.status.replace(/_/g, ' ')}`,
    body: 'Here is the latest status of your parcel.',
  }

  const url = trackingUrl(order.trackingToken)
  const html = buildHtml({ ...copy, status: order.status, url, customerName: order.customerName, description: order.description, trackingToken: order.trackingToken })
  const text = buildText({ headline: copy.headline, body: copy.body, trackingToken: order.trackingToken, url })

  const transporter = getTransporter()
  if (!transporter) {
    console.log(`[email] (SMTP not configured) Would send "${copy.subject}" to ${order.customerEmail} → ${url}`)
    return
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'SwiftDrop <no-reply@swiftdrop.dev>',
      to: order.customerEmail,
      subject: copy.subject,
      html,
      text,
    })
    console.log(`[email] Sent "${copy.subject}" to ${order.customerEmail}`)
  } catch (err) {
    // Email failures shouldn't break the API response — log and move on.
    console.error('[email] send failed:', err)
  }
}
