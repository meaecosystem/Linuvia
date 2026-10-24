// functions/feed.xml.js
//
// RSS feed bahasa Indonesia (default), diakses di /feed.xml.
// Ambil data dari data/articles.json (aset statis), lalu generate RSS
// 2.0 on-the-fly -- jadi feed ini SELALU up to date begitu articles.json
// diupdate, tanpa perlu regenerate file manual tiap nambah artikel.

import { buildRssFeed } from './_lib/feed-utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const assetUrl = new URL('/data/articles.json', url.origin);
  const res = await env.ASSETS.fetch(new Request(assetUrl));
  if (!res.ok) {
    return new Response('Gagal memuat data artikel', { status: 500 });
  }
  const articles = await res.json();

  const xml = buildRssFeed({ articles, lang: 'id', origin: url.origin });

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
}
