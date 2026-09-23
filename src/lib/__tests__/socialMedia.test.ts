import { describe, expect, it } from 'vitest';
import {
  addMonths, monthRange, monthDiff, monthLabel, currentMonthKey,
  computeSocialStats, parseCount, engagementOf,
} from '../socialMedia';
import type { SocialMediaAccountRow, SocialMediaMetricRow } from '../../types/database';

const acc = (id: string, platform: SocialMediaAccountRow['platform'] = 'instagram'): SocialMediaAccountRow => ({
  id, user_id: null, portfolio: 'simon_berger', platform, handle: '', url: null,
  is_active: true, sort_order: 0, created_at: '', updated_at: '',
});

const row = (account_id: string, month: string, v: Partial<SocialMediaMetricRow> = {}): SocialMediaMetricRow => ({
  id: `${account_id}-${month}`, account_id, month: `${month}-01`,
  followers: null, posts: null, views: null, reach: null, impressions: null,
  likes: null, comments: null, shares: null, saves: null, profile_visits: null, link_clicks: null,
  notes: null, created_at: '', updated_at: '', ...v,
});

describe('month keys', () => {
  it('adds months across year boundaries', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-03', -15)).toBe('2024-12');
  });

  it('builds inclusive ranges', () => {
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(monthRange('2026-02', '2026-01')).toEqual([]);
    expect(monthDiff('2025-11', '2026-02')).toBe(3);
  });

  it('uses the local calendar month', () => {
    // 1 Oct 00:30 local must stay October, whatever the UTC offset
    expect(currentMonthKey(new Date(2026, 9, 1, 0, 30))).toBe('2026-10');
  });

  it('labels months in German', () => {
    expect(monthLabel('2026-03')).toBe("Mär '26");
    expect(monthLabel('2026-03', true)).toBe('März 2026');
  });
});

describe('parseCount', () => {
  it('accepts Swiss and other thousands separators', () => {
    expect(parseCount("12'345")).toBe(12345);
    expect(parseCount('12.345')).toBe(12345);
    expect(parseCount('12,345')).toBe(12345);
    expect(parseCount('12 345')).toBe(12345);
  });

  it('accepts k / M suffixes', () => {
    expect(parseCount('1.2k')).toBe(1200);
    expect(parseCount('3,4M')).toBe(3_400_000);
    expect(parseCount('2mio')).toBe(2_000_000);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseCount('')).toBeNull();
    expect(parseCount('  ')).toBeNull();
    expect(parseCount('abc')).toBeNull();
    expect(parseCount('-5')).toBeNull();
  });
});

describe('engagementOf', () => {
  it('sums interactions and keeps null distinct from zero', () => {
    expect(engagementOf({ likes: 10, comments: 2, shares: null, saves: 3 })).toBe(15);
    expect(engagementOf({ likes: 0 })).toBe(0);
    expect(engagementOf({ views: 100 })).toBeNull();
  });
});

describe('computeSocialStats', () => {
  it('computes monthly and period growth', () => {
    const accounts = [acc('a'), acc('b', 'tiktok')];
    const metrics = [
      row('a', '2025-12', { followers: 1000 }),
      row('a', '2026-01', { followers: 1100, views: 500, likes: 50 }),
      row('a', '2026-02', { followers: 1210, views: 800, likes: 90, comments: 10 }),
      row('b', '2026-01', { followers: 200 }),
      row('b', '2026-02', { followers: 300, views: 2000 }),
    ];
    const s = computeSocialStats(accounts, metrics, '2026-01', '2026-02');

    expect(s.months).toEqual(['2026-01', '2026-02']);
    expect(s.series.map((m) => m.followers)).toEqual([1300, 1510]);
    // Account b has no December value → no net-new for its first month
    expect(s.series[0].netNew).toBe(100);
    expect(s.series[1].netNew).toBe(210);

    const a = s.accounts.find((x) => x.account.id === 'a')!;
    expect(a.deltaMonth).toBe(110);
    expect(a.deltaMonthPct).toBeCloseTo(10);
    expect(a.deltaPeriod).toBe(210);           // vs December baseline
    expect(a.cmgr).toBeCloseTo(10);            // 1000 → 1210 over 2 months
    expect(a.engagement).toBe(100);
    expect(a.engagementRate).toBeCloseTo(100 / 1210 * 100);

    const b = s.accounts.find((x) => x.account.id === 'b')!;
    expect(b.deltaPeriod).toBe(100);           // baseline = first value in window
    expect(b.cmgr).toBeCloseTo(50);

    expect(s.kpis.followers).toBe(1510);
    expect(s.kpis.deltaMonth).toBe(210);
    expect(s.kpis.views).toBe(2800);
    expect(s.kpis.viewsPrev).toBe(500);
    // Period growth counts b from its first in-window value
    expect(s.kpis.deltaPeriod).toBe(310);
  });

  it('carries follower counts forward over missing months', () => {
    const accounts = [acc('a')];
    const metrics = [
      row('a', '2026-01', { followers: 500 }),
      row('a', '2026-03', { followers: 520 }),
    ];
    const s = computeSocialStats(accounts, metrics, '2026-01', '2026-03');
    expect(s.series.map((m) => m.followers)).toEqual([500, 500, 520]);
    expect(s.series.map((m) => m.netNew)).toEqual([0, 0, 20]);
    expect(s.series[1].byAccount.a.followersRaw).toBeNull();
  });

  it('flags accounts without an entry in the last month', () => {
    const s = computeSocialStats([acc('a'), acc('b')], [row('a', '2026-02', { followers: 1 })], '2026-01', '2026-02');
    expect(s.accounts.find((x) => x.account.id === 'a')!.missingLast).toBe(false);
    expect(s.accounts.find((x) => x.account.id === 'b')!.missingLast).toBe(true);
  });

  it('handles no data at all', () => {
    const s = computeSocialStats([acc('a')], [], '2026-01', '2026-02');
    expect(s.kpis.followers).toBe(0);
    expect(s.kpis.deltaPeriod).toBeNull();
    expect(s.accounts[0].followers).toBeNull();
  });
});
