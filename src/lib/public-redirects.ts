// Permanent, public-facing redirects shared by next.config.ts and tests.
// This module has NO imports so Next.js can transpile it into next.config.ts.

export interface PublicRedirect {
  source: string
  destination: string
  permanent: boolean
}

export function buildPublicRedirects(): PublicRedirect[] {
  return [
    // Legacy static alias of the homepage. Never render a duplicate home page.
    { source: '/index.html', destination: '/', permanent: true },
    // Old article slug replaced by the live Moshirieh article. The replacement
    // record previously declared this exact slug as its canonical URL, so the
    // semantic mapping is unambiguous.
    {
      source:
        '/articles/brghkarbrghkar-mshirih-aazam-fvri-brghkar-rfa-atsali-brgh-khrabi-tlfn-nsbiat-brghkari',
      destination: '/articles/barghkar-moshiriyeh-tehran-ezaam-fori-raf-etesali',
      permanent: true,
    },
  ]
}
