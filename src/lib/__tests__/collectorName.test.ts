import { describe, it, expect } from 'vitest';
import { splitName, findContactByName, searchContacts, contactDisplayName, normalizeName } from '../collectorName';

const contacts = [
  { id: 'a', first_name: 'Anna', last_name: 'Müller', company: null },
  { id: 'b', first_name: 'Jean-Luc', last_name: 'van der Berg', company: 'Berg Collection' },
  { id: 'c', first_name: '', last_name: "Sotheby's", company: null },
];

describe('splitName', () => {
  it('uses the last token as last name', () => {
    expect(splitName('Anna Maria Müller')).toEqual({ first_name: 'Anna Maria', last_name: 'Müller' });
  });
  it('handles "Last, First"', () => {
    expect(splitName('Müller, Anna')).toEqual({ first_name: 'Anna', last_name: 'Müller' });
  });
  it('puts a single token into last name and trims whitespace', () => {
    expect(splitName("  Sotheby's ")).toEqual({ first_name: '', last_name: "Sotheby's" });
    expect(splitName('')).toEqual({ first_name: '', last_name: '' });
  });
});

describe('findContactByName', () => {
  it('matches case- and whitespace-insensitively on first last, last, first and company', () => {
    expect(findContactByName(contacts, 'anna  müller')?.id).toBe('a');
    expect(findContactByName(contacts, 'Müller, Anna')?.id).toBe('a');
    expect(findContactByName(contacts, 'berg collection')?.id).toBe('b');
    expect(findContactByName(contacts, "Sotheby's")?.id).toBe('c');
  });
  it('returns null for partial or empty input', () => {
    expect(findContactByName(contacts, 'Anna')).toBeNull();
    expect(findContactByName(contacts, '')).toBeNull();
  });
});

describe('searchContacts / contactDisplayName', () => {
  it('finds contacts containing every term, in any field', () => {
    expect(searchContacts(contacts, 'berg').map((c) => c.id)).toEqual(['b']);
    expect(searchContacts(contacts, 'mül an').map((c) => c.id)).toEqual(['a']);
    expect(searchContacts(contacts, '')).toEqual([]);
  });
  it('formats display names and falls back to company', () => {
    expect(contactDisplayName(contacts[0])).toBe('Anna Müller');
    expect(contactDisplayName({ first_name: '', last_name: '', company: 'Berg Collection' })).toBe('Berg Collection');
    expect(normalizeName('  A   B ')).toBe('a b');
  });
});
