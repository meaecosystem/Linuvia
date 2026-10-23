// functions/[[path]].js
//
// Dua tugas:
// 1) Kalau ada yang buka URL artikel lama tanpa prefix bahasa (format
//    sebelum blog ini multi-bahasa, misal /cara-kompres-pdf.html),
//    redirect permanen ke versi default (/id/...). Supaya link lama yang
//    udah ke-index Google atau dibagikan orang nggak mendadak 404.
// 2) Kalau yang diakses homepage root ("/"), coba deteksi bahasa browser
//    dari header Accept-Language dan redirect ke /en/, /ja/, dst kalau
//    cocok dan belum pernah pilih manual. Pilihan (baik hasil deteksi
//    maupun pilihan manual dari lang-switcher) disimpan di cookie
//    `mea_lang` supaya gak dideteksi ulang tiap kunjungan dan gak
//    nimpa-nimpa pilihan user. Bot/crawler dilewati biar homepage "/"
//    tetap bisa diindex apa adanya oleh Google dkk.

const SUPPORTED_LANGS = ['id', 'en', 'ja', 'ko', 'zh'];
const DEFAULT_LANG = 'id';
const LANG_COOKIE = 'mea_lang';
const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|preview|googlebot|bingbot|duckduckbot|baiduspider|yandex|semrush|ahrefs|mediapartners/i;

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// Parse "en-US,en;q=0.9,id;q=0.8" -> kode bahasa diurutkan dari quality
// tertinggi, lalu ambil yang pertama cocok dengan SUPPORTED_LANGS.
function pickLangFromAcceptLanguage(header) {
  if (!header) return null;
  const parsed = header
    .split(',')
    .map((part) => {
      const [rawTag, qPart] = part.trim().split(';q=');
      const q = qPart ? parseFloat(qPart) : 1;
      return { base: (rawTag || '').trim().split('-')[0].toLowerCase(), q: isNaN(q) ? 1 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { base } of parsed) {
    if (SUPPORTED_LANGS.includes(base)) return base;
  }
  return null;
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // --- Auto-detect bahasa browser, cuma di homepage root "/" ---
  if (path === '/') {
    const userAgent = request.headers.get('User-Agent') || '';
    const alreadyChosen = getCookie(request, LANG_COOKIE);

    if (!alreadyChosen && !BOT_PATTERN.test(userAgent)) {
      const detected = pickLangFromAcceptLanguage(request.headers.get('Accept-Language'));
      if (detected && detected !== DEFAULT_LANG) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${url.origin}/${detected}/${url.search}`,
            'Set-Cookie': `${LANG_COOKIE}=${detected}; Path=/; Max-Age=31536000; SameSite=Lax`,
          },
        });
      }
    }
    return context.next();
  }

  // Root (udah ditangani di atas), aset (shared/, data/, favicon, dst),
  // dan apapun yang sudah punya prefix bahasa yang valid (/id/..., /ja/...,
  // dst) dibiarkan lewat apa adanya ke routing/asset normal.
  const firstSegment = path.split('/')[1];
  if (!firstSegment || SUPPORTED_LANGS.includes(firstSegment) || path.includes('.') === false) {
    return context.next();
  }

  // Hanya tangani path artikel lama: /nama-artikel.html (satu segmen,
  // berakhiran .html, bukan di dalam folder manapun).
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 1 && path.endsWith('.html')) {
    return Response.redirect(`${url.origin}/id/${segments[0]}${url.search}`, 301);
  }

  return context.next();
}
