// Public site identity used by SEO metadata, JSON-LD, and click-to-call CTAs.
// Keep this module client-safe (no secrets). One NAP for phone/WhatsApp.

export const SITE_NAME = 'معماره'
export const SITE_FALLBACK_DESCRIPTION = 'معماره - خدمات برقکاری حرفه‌ای و مطمئن'
export const DEFAULT_OG_IMAGE = '/assets/logo/cover-image.jpg'
/** Raster logo for schema.org (Google does not treat SVG as a valid Organization logo). */
export const SITE_LOGO_PNG = '/assets/logo/apple-touch-icon.png'

/** E.164, no spaces. Used in JSON-LD and WhatsApp. */
export const SITE_PHONE_E164 = '+989126769048'
export const SITE_TEL_HREF = `tel:${SITE_PHONE_E164}`
export const SITE_PHONE_DISPLAY = '۰۹۱۲۶۷۶۹۰۴۸'
export const SITE_WHATSAPP_HREF = 'https://wa.me/989126769048'
export const SITE_AREA_SERVED = 'تهران'
