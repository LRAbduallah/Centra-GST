import { describe, it, expect, beforeEach } from 'vitest';
import { STORAGE } from './App';

// Note: localStorage is reset in vitest.setup.ts via beforeEach

describe('STORAGE helper', () => {
  it('S1: set and get a value round-trip', () => {
    const obj = { name: 'Vision Opticals', counter: 42 };
    STORAGE.set('test-key', obj);
    expect(STORAGE.get('test-key')).toEqual(obj);
  });

  it('S2: get a non-existent key returns null', () => {
    expect(STORAGE.get('does-not-exist')).toBeNull();
  });

  it('S3: overwriting a key returns the new value', () => {
    STORAGE.set('key', { v: 1 });
    STORAGE.set('key', { v: 2 });
    expect(STORAGE.get('key')).toEqual({ v: 2 });
  });

  it('S4: handles arrays correctly', () => {
    const arr = [1, 'two', { three: 3 }];
    STORAGE.set('arr-key', arr);
    expect(STORAGE.get('arr-key')).toEqual(arr);
  });

  it('S5: corrupted JSON in localStorage returns null, no crash', () => {
    // Directly corrupt storage bypassing STORAGE.set
    localStorage.setItem('invoiceforge:corrupt', '{invalid json}');
    expect(() => STORAGE.get('corrupt')).not.toThrow();
    expect(STORAGE.get('corrupt')).toBeNull();
  });

  it('S6: set handles complex nested objects', () => {
    const nested = { profile: { id: 'abc', catalog: [{ name: 'Lens', rate: '500' }] } };
    STORAGE.set('nested', nested);
    expect(STORAGE.get('nested')).toEqual(nested);
  });
});
