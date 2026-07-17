/**
 * PSP-1 RSS feed builder (Plan 3 Phase 9, D-A6) — the EDGE mirror of
 * src/lib/omni/podcastFeed.ts (edge code cannot import src/; keep both in
 * sync — the client renders the preview, this one writes the real file).
 *
 * Landmines honored: EVERYTHING interpolated is XML-escaped (titles and
 * descriptions are an injection surface); GUIDs are stored values, never
 * derived here; the AI-disclosure text is appended to the channel and item
 * descriptions (Apple requirement — default ON, editable, never removable).
 */

export interface FeedShow {
  name: string;
  slug: string;
  description: string;
  language: string;
  category: string;
  explicit: boolean;
  ownerEmail: string;
  author: string;
  artworkUrl: string;
  siteLink: string;
  /** Stable show-level GUID (podcast:guid), minted ONCE and stored. */
  podcastGuid: string;
  /** AI disclosure appended to descriptions (D-A6). */
  disclosureText: string;
}

export interface FeedEpisode {
  title: string;
  description: string;
  /** Public enclosure URL. */
  audioUrl: string;
  bytes: number;
  mimeType: string;
  /** Immutable per-episode GUID (minted at publish, never regenerated). */
  guid: string;
  /** RFC 2822 pubDate source. */
  publishedAt: string;
  durationS: number | null;
  coverUrl: string | null;
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rfc2822(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

function withDisclosure(description: string, disclosure: string): string {
  const base = description.trim();
  const note = disclosure.trim();
  if (!note) return base;
  return base ? `${base}\n\n${note}` : note;
}

export function buildFeedXml(show: FeedShow, feedUrl: string, episodes: FeedEpisode[]): string {
  const channelDescription = withDisclosure(show.description, show.disclosureText);
  const items = episodes.map((e) => {
    const itemDescription = withDisclosure(e.description, show.disclosureText);
    return [
      '    <item>',
      `      <title>${xmlEscape(e.title)}</title>`,
      `      <description>${xmlEscape(itemDescription)}</description>`,
      `      <enclosure url="${xmlEscape(e.audioUrl)}" length="${Math.max(0, Math.round(e.bytes))}" type="${xmlEscape(e.mimeType)}"/>`,
      `      <guid isPermaLink="false">${xmlEscape(e.guid)}</guid>`,
      `      <pubDate>${rfc2822(e.publishedAt)}</pubDate>`,
      ...(e.durationS != null && e.durationS > 0 ? [`      <itunes:duration>${Math.round(e.durationS)}</itunes:duration>`] : []),
      ...(e.coverUrl ? [`      <itunes:image href="${xmlEscape(e.coverUrl)}"/>`] : []),
      `      <itunes:explicit>${show.explicit ? 'true' : 'false'}</itunes:explicit>`,
      '    </item>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:podcast="https://podcastindex.org/namespace/1.0">',
    '  <channel>',
    `    <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml"/>`,
    `    <title>${xmlEscape(show.name)}</title>`,
    `    <description>${xmlEscape(channelDescription)}</description>`,
    `    <link>${xmlEscape(show.siteLink)}</link>`,
    `    <language>${xmlEscape(show.language)}</language>`,
    `    <itunes:author>${xmlEscape(show.author)}</itunes:author>`,
    `    <itunes:category text="${xmlEscape(show.category)}"/>`,
    `    <itunes:explicit>${show.explicit ? 'true' : 'false'}</itunes:explicit>`,
    ...(show.artworkUrl ? [`    <itunes:image href="${xmlEscape(show.artworkUrl)}"/>`] : []),
    ...(show.ownerEmail
      ? [
        '    <itunes:owner>',
        `      <itunes:email>${xmlEscape(show.ownerEmail)}</itunes:email>`,
        '    </itunes:owner>',
      ]
      : []),
    `    <podcast:guid>${xmlEscape(show.podcastGuid)}</podcast:guid>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}
