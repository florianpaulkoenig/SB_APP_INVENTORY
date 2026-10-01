import { describe, it, expect } from 'vitest';
import { describeError, SessionExpiredError } from '../errors';

describe('describeError', () => {
  it('falls back for empty input', () => {
    expect(describeError(null)).toBe('An error occurred. Please try again.');
    expect(describeError({})).toBe('An error occurred. Please try again.');
  });

  it('explains a lost session', () => {
    expect(describeError(new SessionExpiredError())).toMatch(/session has expired/);
  });

  it('maps PostgREST "0 rows" on .single() to a session hint', () => {
    expect(describeError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }))
      .toMatch(/session may have expired/);
  });

  it('explains fetch timeouts and network failures', () => {
    expect(describeError(new DOMException('x', 'TimeoutError'))).toMatch(/did not respond/);
    expect(describeError(new TypeError('Failed to fetch'))).toMatch(/No connection/);
  });

  it('surfaces duplicate-key details', () => {
    expect(describeError({ code: '23505', details: 'Key (reference_code)=(X) already exists.' }))
      .toBe('Duplicate value: Key (reference_code)=(X) already exists.');
  });

  it('passes other messages through, truncated', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
    expect(describeError({ message: 'a'.repeat(300) })).toHaveLength(218);
  });
});
