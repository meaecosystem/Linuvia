// functions/_lib/feed-utils.js
//
// Helper buat generate RSS 2.0 feed. Dipakai dari functions/feed.xml.js
// (feed bahasa id, di root) dan functions/[lang]/feed.xml.js (feed per
// bahasa lain). File di folder _lib/ sengaja diawali underscore supaya
// TIDAK di-routing sebagai endpoint sendiri oleh Cloudflare Pages
// Functions -- murni modul yang di-import.

export const SUPPORTED_LANGS = ['id', 'en', 'ja', 'ko', 'zh'];

export const SITE_META = {
  id: { title: 'Vonetra', description: 'Panduan how-to dan wawasan teknologi dari tim MEA Ecosystem.', locale: 'id-ID', homePath: '/' },
  en: { title: 'Vonetra', description: 'How-to guides and tech insights from the MEA Ecosystem team.', locale: 'en-US', homePath: '/en/' },
  ja: { title: 'Vonetra', description: 'MEA Ecosystemチームによるハウツーガイドとテック考察。', locale: 'ja-JP', homePath: '/ja/' },
  zh: { title: 'Vonetra', description: '来自 MEA Ecosystem 团队的操作指南与科技洞察。', locale: 'zh-CN', homePath: '/zh/' },
  ko: { title: 'Vonetra', description: 'MEA Ecosystem 팀이 전하는 사용법 가이드와 기술 인사이트.', locale: 'ko-KR', homePath: '/ko/' },
};

// Escape teks buat ditaruh di dalam elemen XML (title, description, dst).
function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// "2026-10-23" -> "Fri, 23 Oct 2026 00:00:00 GMT" (format RFC 822 yang
// dibutuhkan elemen <pubDate> RSS).
function toRfc822(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return new Date(0).toUTCString();
  return d.toUTCString();
}

// Bangun string XML RSS 2.0 dari daftar artikel yang sudah difilter ke
// satu bahasa, diurutkan terbaru dulu, dibatasi maksimal `limit` item.
export function buildRssFeed({ articles, lang, origin, limit = 40 }) {
  const meta = SITE_META[lang] || SITE_META.id;
  const items = articles
    .filter((a) => (a.lang || 'id') === lang)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, limit);

  const itemsXml = items
    .map((a) => {
      const link = `${origin}${a.url}`;
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${toRfc822(a.date)}</pubDate>
      <description>${escapeXml(a.desc)}</description>
    </item>`;
    })
    .join('\n');

  const selfUrl = lang === 'id' ? `${origin}/feed.xml` : `${origin}/${lang}/feed.xml`;
  const homeUrl = `${origin}${meta.homePath}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${escapeXml(homeUrl)}</link>
    <description>${escapeXml(meta.description)}</description>
    <language>${meta.locale}</language>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`;
}
