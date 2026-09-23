import { describe, expect, it } from 'vitest';
import {
  parseDuration, parsePercent, fmtDuration, computeWebStats, computeSocialToWeb,
} from '../websiteMetrics';
import { computeSocialStats } from '../socialMedia';
import type {
  WebsiteRow, WebsiteMetricRow, SocialMediaAccountRow, SocialMediaMetricRow,
} from '../../types/database';

const site = (id: string): WebsiteRow => ({
  id, user_id: null, portfolio: 'simon_berger', domain: `${id}.com`, url: null,
  is_active: true, sort_order: 0, created_at: '', updated_at: '',
});

const web = (website_id: string, month: string, v: Partial<WebsiteMetricRow> = {}): WebsiteMetricRow => ({
  id: `${website_id}-${month}`, website_id, month: `${month}-01`,
  unique_visitors: null, visits: null, pageviews: null, bounce_rate: null, avg_visit_duration: null,
  form_submissions: null, newsletter_signups: null,
  source_direct: null, source_search: null, source_social: null, source_referral: null, source_email: null, source_other: null,
  social_by_platform: {}, notes: null, created_at: '', updated_at: '', ...v,
});

const acc = (id: string, platform: SocialMediaAccountRow['platform']): SocialMediaAccountRow => ({
  id, user_id: null, portfolio: 'simon_berger', platform, handle: '', url: null,
  is_active: true, sort_order: 0, created_at: '', updated_at: '',
});

const soc = (account_id: string, month: string, v: Partial<SocialMediaMetricRow> = {}): SocialMediaMetricRow => ({
  id: `${account_id}-${month}`, account_id, month: `${month}-01`,
  followers: null, posts: null, views: null, reach: null, impressions: null,
  likes: null, comments: null, shares: null, saves: null, profile_visits: null, link_clicks: null,
  notes: null, created_at: '', updated_at: '', ...v,
});

describe('parsing', () => {
  it('parses durations', () => {
    expect(parseDuration('1:45')).toBe(105);
    expect(parseDuration('95')).toBe(95);
    expect(parseDuration('1m 20s')).toBe(80);
    expect(parseDuration('2m')).toBe(120);
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('1:75')).toBeNull();
    expect(fmtDuration(105)).toBe('1:45');
    expect(fmtDuration(null)).toBe('—');
  });

  it('parses percentages', () => {
    expect(parsePercent('58,4')).toBe(58.4);
    expect(parsePercent('58.4 %')).toBe(58.4);
    expect(parsePercent('101')).toBeNull();
    expect(parsePercent('')).toBeNull();
  });
});

describe('computeWebStats', () => {
  it('sums traffic across sites and weights rates by visits', () => {
    const sites = [site('a'), site('b')];
    const rows = [
      web('a', '2026-07', { unique_visitors: 800, visits: 1000 }),
      web('a', '2026-08', { unique_visitors: 1000, visits: 1200, pageviews: 3600, bounce_rate: 50, avg_visit_duration: 60, form_submissions: 6, newsletter_signups: 6, source_social: 300 }),
      web('b', '2026-08', { unique_visitors: 400, visits: 400, bounce_rate: 70, avg_visit_duration: 120 }),
    ];
    const s = computeWebStats(sites, rows, '2026-07', '2026-08');
    expect(s.last.visits).toBe(1600);
    expect(s.last.unique_visitors).toBe(1400);
    expect(s.last.bounce_rate).toBeCloseTo((50 * 1200 + 70 * 400) / 1600);
    expect(s.last.avg_visit_duration).toBeCloseTo((60 * 1200 + 120 * 400) / 1600);

    const a = s.sites.find((x) => x.site.id === 'a')!;
    expect(a.visitorsDeltaPct).toBeCloseTo(25);
    expect(a.pagesPerVisit).toBe(3);
    expect(a.conversionRate).toBeCloseTo(1);
    expect(a.socialShare).toBeCloseTo(25);
    expect(a.periodVisitors).toBe(1800);
    expect(s.prevPeriodVisits).toBeNull();
  });
});

describe('computeSocialToWeb', () => {
  it('relates social visits to views, followers, clicks and platforms', () => {
    const sites = [site('a')];
    const accounts = [acc('ig', 'instagram'), acc('tt', 'tiktok')];
    const webRows = [
      web('a', '2026-07', { visits: 1000, source_social: 100 }),
      web('a', '2026-08', { visits: 1000, source_social: 200, social_by_platform: { instagram: 150, tiktok: 50 } }),
    ];
    const socialRows = [
      soc('ig', '2026-07', { followers: 10_000, views: 50_000, link_clicks: 150 }),
      soc('ig', '2026-08', { followers: 10_000, views: 100_000, link_clicks: 300 }),
      soc('tt', '2026-08', { followers: 5_000, views: 400_000 }),
    ];
    const w = computeWebStats(sites, webRows, '2026-07', '2026-08');
    const s = computeSocialStats(accounts, socialRows, '2026-07', '2026-08');
    const c = computeSocialToWeb(w, webRows, s, accounts);

    expect(c.months[1].socialVisits).toBe(200);
    expect(c.months[1].per1kViews).toBeCloseTo(200 / 500_000 * 1000);
    expect(c.months[1].per1kFollowers).toBeCloseTo(200 / 15_000 * 1000);
    expect(c.months[1].clickToVisit).toBeCloseTo(200 / 300 * 100);
    expect(c.months[1].socialShare).toBeCloseTo(20);

    expect(c.totals.socialVisits).toBe(300);
    expect(c.totals.per1kViews).toBeCloseTo(300 / 550_000 * 1000);
    expect(c.totals.clickToVisit).toBeCloseTo(300 / 450 * 100);
    expect(c.totals.socialShare).toBeCloseTo(15);

    expect(c.hasPlatformSplit).toBe(true);
    const ig = c.platforms.find((p) => p.platform === 'instagram')!;
    // July has no platform split → only August views count for Instagram
    expect(ig.views).toBe(100_000);
    expect(ig.per1kViews).toBeCloseTo(1.5);
    expect(ig.clickToVisit).toBeCloseTo(50);
    expect(ig.share).toBeCloseTo(75);
    expect(c.platforms[0].platform).toBe('instagram');
    const tt = c.platforms.find((p) => p.platform === 'tiktok')!;
    expect(tt.per1kFollowers).toBeCloseTo(10);
  });

  it('leaves rates empty when a side is missing', () => {
    const sites = [site('a')];
    const accounts = [acc('ig', 'instagram')];
    const webRows = [web('a', '2026-08', { visits: 500 })];
    const w = computeWebStats(sites, webRows, '2026-08', '2026-08');
    const s = computeSocialStats(accounts, [], '2026-08', '2026-08');
    const c = computeSocialToWeb(w, webRows, s, accounts);
    expect(c.months[0].socialVisits).toBeNull();
    expect(c.totals.per1kViews).toBeNull();
    expect(c.hasPlatformSplit).toBe(false);
  });
});
