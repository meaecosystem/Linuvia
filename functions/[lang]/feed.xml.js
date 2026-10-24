// functions/[lang]/feed.xml.js
//
// RSS feed per bahasa selain id, diakses di /en/feed.xml, /ja/feed.xml,
// /zh/feed.xml, /ko/feed.xml (dan /id/feed.xml, sama persis isinya
// dengan /feed.xml di root). Lang yang gak dikenal -> 404.

import { buildRssFeed, SUPPORTED_LANGS } from '../_lib/feed-utils.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const lang = params.lang;

  if (!SUPPORTED_LANGS.includes(lang)) {
    return new Response('Not found', { status: 404 });
  }

  const assetUrl = new URL('/data/articles.json', url.origin);
  const res = await env.ASSETS.fetch(new Request(assetUrl));
  if (!res.ok) {
    return new Response('Gagal memuat data artikel', { status: 500 });
  }
  const articles = await res.json();

  const xml = buildRssFeed({ articles, lang, origin: url.origin });

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
}
