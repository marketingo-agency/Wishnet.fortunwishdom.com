/**
 * Specs for the PSP-1 feed builder (Plan 3 Phase 9) — the headless
 * acceptance stand-in for feed generation: escaping, required channel/item
 * tags, disclosure injection, GUID passthrough.
 */

import { describe, expect, it } from 'vitest';
import { buildFeedXml, xmlEscape, type FeedEpisode, type FeedShow } from './podcastFeed';

const SHOW: FeedShow = {
  name: 'Fortun & Friends <live>',
  slug: 'fortun-friends',
  description: 'Dreams "and" wishes',
  language: 'en',
  category: 'Society & Culture',
  explicit: false,
  ownerEmail: 'owner@example.com',
  author: 'Fortun Wishnet',
  artworkUrl: 'https://example.com/art.jpg',
  siteLink: 'https://wishnet.fortunwishdom.com',
  podcastGuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  disclosureText: 'This episode was produced with AI generated voices.',
};

const EPISODE: FeedEpisode = {
  title: 'Episode 1 <pilot> & more',
  description: 'The first one.',
  audioUrl: 'https://example.com/storage/v1/object/public/podcast-public/shows/fortun-friends/e1.mp3',
  bytes: 12345678,
  mimeType: 'audio/mpeg',
  guid: '11111111-2222-3333-4444-555555555555',
  publishedAt: '2026-07-17T10:00:00Z',
  durationS: 1830,
  coverUrl: 'https://example.com/cover.png',
};

const FEED_URL = 'https://example.com/storage/v1/object/public/podcast-public/shows/fortun-friends/feed.xml';

describe('podcastFeed: xmlEscape', () => {
  it('escapes the five XML-significant characters', () => {
    expect(xmlEscape(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;');
  });

  it('escapes ampersands before anything else (no double-escaping)', () => {
    expect(xmlEscape('&lt;')).toBe('&amp;lt;');
  });
});

describe('podcastFeed: buildFeedXml (PSP-1)', () => {
  const xml = buildFeedXml(SHOW, FEED_URL, [EPISODE]);

  it('carries every PSP-1 required channel tag', () => {
    expect(xml).toContain(`<atom:link href="${xmlEscape(FEED_URL)}" rel="self" type="application/rss+xml"/>`);
    expect(xml).toContain('<title>Fortun &amp; Friends &lt;live&gt;</title>');
    expect(xml).toContain('<language>en</language>');
    expect(xml).toContain('<itunes:category text="Society &amp; Culture"/>');
    expect(xml).toContain('<itunes:explicit>false</itunes:explicit>');
    expect(xml).toContain('<itunes:image href="https://example.com/art.jpg"/>');
    expect(xml).toContain('<itunes:email>owner@example.com</itunes:email>');
    expect(xml).toContain('<podcast:guid>aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</podcast:guid>');
  });

  it('carries every PSP-1 required item tag with the immutable guid', () => {
    expect(xml).toContain('<title>Episode 1 &lt;pilot&gt; &amp; more</title>');
    expect(xml).toContain('length="12345678" type="audio/mpeg"');
    expect(xml).toContain('<guid isPermaLink="false">11111111-2222-3333-4444-555555555555</guid>');
    expect(xml).toContain('<itunes:duration>1830</itunes:duration>');
    expect(xml).toContain('<pubDate>Fri, 17 Jul 2026 10:00:00 GMT</pubDate>');
  });

  it('appends the AI disclosure to channel AND item descriptions (D-A6)', () => {
    const occurrences = xml.split('This episode was produced with AI generated voices.').length - 1;
    expect(occurrences).toBe(2);
  });

  it('escapes injection attempts inside user-controlled fields', () => {
    const evil = buildFeedXml(
      { ...SHOW, name: '</title><script>alert(1)</script>' },
      FEED_URL,
      [{ ...EPISODE, description: ']]></description><item>forged</item>' }],
    );
    expect(evil).not.toContain('<script>');
    expect(evil).not.toContain('<item>forged</item>');
    expect(evil).toContain('&lt;/title&gt;&lt;script&gt;');
  });

  it('renders an empty feed (zero published episodes) as valid channel-only XML', () => {
    const empty = buildFeedXml(SHOW, FEED_URL, []);
    expect(empty).toContain('<channel>');
    expect(empty).not.toContain('<item>');
    expect(empty.trim().endsWith('</rss>')).toBe(true);
  });
});
