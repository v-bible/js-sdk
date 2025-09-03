import { describe, expect, it } from 'vitest';
import {
  normalizeChapRange,
  normalizeQueryEu,
  normalizeQueryUs,
  normalizeVerseQuery,
  parseBiblicalReference,
  parseStringToOrder,
  parseVerseNum,
} from '@/lib/utils/verse-parse';

// Helper for error expectation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expectError(fn: () => any) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  expect(threw).toBe(true);
}

describe('parseStringToOrder', () => {
  it('empty string', () => {
    expect(parseStringToOrder('')).toEqual([]);
  });
  it("single letter 'a'", () => {
    expect(parseStringToOrder('a')).toEqual([0]);
  });
  it("single letter 'b'", () => {
    expect(parseStringToOrder('b')).toEqual([1]);
  });
  it("single letter 'c'", () => {
    expect(parseStringToOrder('c')).toEqual([2]);
  });
  it("multiple letters 'abc'", () => {
    expect(parseStringToOrder('abc')).toEqual([0, 1, 2]);
  });
});

describe('parseVerseNum', () => {
  it('wildcard asterisk', () => {
    expect(parseVerseNum('*')).toEqual({ number: -1, order: [-1] });
  });
  it('simple number', () => {
    expect(parseVerseNum('12')).toEqual({ number: 12, order: [-1] });
  });
  it("number with order 'b'", () => {
    expect(parseVerseNum('12b')).toEqual({ number: 12, order: [1] });
  });
  it("number with order 'abc'", () => {
    expect(parseVerseNum('5abc')).toEqual({ number: 5, order: [0, 1, 2] });
  });
  it('invalid input', () => {
    expectError(() => parseVerseNum('invalid'));
  });
  it('empty string', () => {
    expectError(() => parseVerseNum(''));
  });
});

describe('normalizeQueryUs', () => {
  it('John 9', () => {
    expect(normalizeQueryUs('9')).toBe('9:*-*');
  });
  it('John 9,12', () => {
    expect(normalizeQueryUs('9,12')).toBe('9:*-*;12:*-*');
  });
  it('John 9--12', () => {
    expect(normalizeQueryUs('9--12')).toBe('9:*-*;10:*-*;11:*-*;12:*-*');
  });
  it('John 9:12', () => {
    expect(normalizeQueryUs('9:12')).toBe('9:12-12');
  });
  it('John 9:12b', () => {
    expect(normalizeQueryUs('9:12b')).toBe('9:12b-12b');
  });
  it('John 9:1,12', () => {
    expect(normalizeQueryUs('9:1,12')).toBe('9:1-1;9:12-12');
  });
  it('John 9:1-12', () => {
    expect(normalizeQueryUs('9:1-12')).toBe('9:1-12');
  });
  it('John 9:1-12,36', () => {
    expect(normalizeQueryUs('9:1-12,36')).toBe('9:1-12;9:36-36');
  });
  it('John 9:1; 12:36', () => {
    expect(normalizeQueryUs('9:1;12:36')).toBe('9:1-1;12:36-36');
  });
  it('John 9:1--12:36', () => {
    expect(normalizeQueryUs('9:1--12:36')).toBe('9:1-*;10:*-*;11:*-*;12:*-36');
  });
  it('John 9:1-12; 12:3-6', () => {
    expect(normalizeQueryUs('9:1-12;12:3-6')).toBe('9:1-12;12:3-6');
  });
  it('John 9:1-3,6-12; 12:3-6', () => {
    expect(normalizeQueryUs('9:1-3,6-12;12:3-6')).toBe('9:1-3;9:6-12;12:3-6');
  });
  it('John 9:1-3,6-12--12:3-6', () => {
    expect(normalizeQueryUs('9:1-3,6-12--12:3-6')).toBe(
      '9:1-3;9:6-*;10:*-*;11:*-*;12:*-6',
    );
  });
  it('invalid input', () => {
    expectError(() => normalizeQueryUs('invalid@#$'));
  });
});

describe('normalizeQueryEu', () => {
  it('John 9', () => {
    expect(normalizeQueryEu('9')).toBe('9,*-*');
  });
  it('John 9; 12', () => {
    expect(normalizeQueryEu('9;12')).toBe('9,*-*;12,*-*');
  });
  it('John 9--12', () => {
    expect(normalizeQueryEu('9--12')).toBe('9,*-*;10,*-*;11,*-*;12,*-*');
  });
  it('John 9,12', () => {
    expect(normalizeQueryEu('9,12')).toBe('9,12-12');
  });
  it('John 9,12b', () => {
    expect(normalizeQueryEu('9,12b')).toBe('9,12b-12b');
  });
  it('John 9,1.12', () => {
    expect(normalizeQueryEu('9,1.12')).toBe('9,1-1;9,12-12');
  });
  it('John 9,1-12', () => {
    expect(normalizeQueryEu('9,1-12')).toBe('9,1-12');
  });
  it('John 9,1-12.36', () => {
    expect(normalizeQueryEu('9,1-12.36')).toBe('9,1-12;9,36-36');
  });
  it('John 9,1; 12,36', () => {
    expect(normalizeQueryEu('9,1;12,36')).toBe('9,1-1;12,36-36');
  });
  it('John 9,1--12,36', () => {
    expect(normalizeQueryEu('9,1--12,36')).toBe('9,1-*;10,*-*;11,*-*;12,*-36');
  });
  it('John 9,1-12; 12,3-6', () => {
    expect(normalizeQueryEu('9,1-12;12,3-6')).toBe('9,1-12;12,3-6');
  });
  it('John 9,1-3.6-12; 12,3-6', () => {
    expect(normalizeQueryEu('9,1-3.6-12;12,3-6')).toBe('9,1-3;9,6-12;12,3-6');
  });
  it('John 9,1-3.6-12--12,3-6', () => {
    expect(normalizeQueryEu('9,1-3.6-12--12,3-6')).toBe(
      '9,1-3;9,6-*;10,*-*;11,*-*;12,*-6',
    );
  });
  it('invalid input', () => {
    expectError(() => normalizeQueryEu('invalid@#$'));
  });
});

describe('normalizeVerseQuery', () => {
  it('simple chapter', () => {
    expect(normalizeVerseQuery('9')).toBe('9,*-*;');
  });
  it('chapter with verse', () => {
    expect(normalizeVerseQuery('9,12')).toBe('9,12-12;');
  });
  it('chapter with verse range', () => {
    expect(normalizeVerseQuery('9,1-12')).toBe('9,1-12;');
  });
  it('chapter with multiple verses', () => {
    expect(normalizeVerseQuery('9,1.12.36')).toBe('9,1-1;9,12-12;9,36-36;');
  });
  it('chapter with verse and order', () => {
    expect(normalizeVerseQuery('9,12b')).toBe('9,12b-12b;');
  });
});

describe('normalizeChapRange', () => {
  it('chapter range 9--12', () => {
    expect(normalizeChapRange('9,*-*;--12,*-*;')).toBe(
      '9,*-*;10,*-*;11,*-*;12,*-*;',
    );
  });
  it('chapter range with specific verses', () => {
    expect(normalizeChapRange('9,1-*;--12,*-36;')).toBe(
      '9,1-*;10,*-*;11,*-*;12,*-36;',
    );
  });
  it('no range to normalize', () => {
    expect(normalizeChapRange('9,1-12;')).toBe('9,1-12;');
  });
});

describe('parseBiblicalReference', () => {
  it('John 9 (US format)', () => {
    expect(parseBiblicalReference('John 9', 'us')).toEqual([
      {
        bookCode: 'John',
        chapterNum: 9,
        from: { number: -1, order: [-1] },
        to: { number: -1, order: [-1] },
      },
    ]);
  });
  it('John 9:12 (US format)', () => {
    expect(parseBiblicalReference('John 9:12', 'us')).toEqual([
      {
        bookCode: 'John',
        chapterNum: 9,
        from: { number: 12, order: [-1] },
        to: { number: 12, order: [-1] },
      },
    ]);
  });
  it('John 9:12b (US format)', () => {
    expect(parseBiblicalReference('John 9:12b', 'us')).toEqual([
      {
        bookCode: 'John',
        chapterNum: 9,
        from: { number: 12, order: [1] },
        to: { number: 12, order: [1] },
      },
    ]);
  });
  it('John 9:1-12 (US format)', () => {
    expect(parseBiblicalReference('John 9:1-12', 'us')).toEqual([
      {
        bookCode: 'John',
        chapterNum: 9,
        from: { number: 1, order: [-1] },
        to: { number: 12, order: [-1] },
      },
    ]);
  });
  it('John 9,12 (EU format)', () => {
    expect(parseBiblicalReference('John 9,12', 'eu')).toEqual([
      {
        bookCode: 'John',
        chapterNum: 9,
        from: { number: 12, order: [-1] },
        to: { number: 12, order: [-1] },
      },
    ]);
  });
  it('John 9,12b (EU format)', () => {
    expect(parseBiblicalReference('John 9,12b', 'eu')).toEqual([
      {
        bookCode: 'John',
        chapterNum: 9,
        from: { number: 12, order: [1] },
        to: { number: 12, order: [1] },
      },
    ]);
  });
  it('John 9,1-12 (EU format)', () => {
    expect(parseBiblicalReference('John 9,1-12', 'eu')).toEqual([
      {
        bookCode: 'John',
        chapterNum: 9,
        from: { number: 1, order: [-1] },
        to: { number: 12, order: [-1] },
      },
    ]);
  });
  it('Multiple chapters John 9:1; 12:36 (US format)', () => {
    expect(parseBiblicalReference('John 9:1; 12:36', 'us')).toEqual([
      {
        bookCode: 'John',
        chapterNum: 9,
        from: { number: 1, order: [-1] },
        to: { number: 1, order: [-1] },
      },
      {
        bookCode: 'John',
        chapterNum: 12,
        from: { number: 36, order: [-1] },
        to: { number: 36, order: [-1] },
      },
    ]);
  });
  it('Missing book code', () => {
    expectError(() => parseBiblicalReference('9:12', 'us'));
  });
  it('Invalid format', () => {
    expectError(() =>
      parseBiblicalReference('John 9:12', 'invalid' as 'us' | 'eu'),
    );
  });
  it('ParseBiblicalReference without book code', () => {
    expectError(() => parseBiblicalReference('', 'us'));
  });
});

describe('normalizeVerseQuery', () => {
  it('simple chapter', () => {
    expect(normalizeVerseQuery('9')).toBe('9,*-*;');
  });
  it('chapter with verse', () => {
    expect(normalizeVerseQuery('9,12')).toBe('9,12-12;');
  });
  it('chapter with verse range', () => {
    expect(normalizeVerseQuery('9,1-12')).toBe('9,1-12;');
  });
  it('chapter with multiple verses', () => {
    expect(normalizeVerseQuery('9,1.12.36')).toBe('9,1-1;9,12-12;9,36-36;');
  });
  it('chapter with verse and order', () => {
    expect(normalizeVerseQuery('9,12b')).toBe('9,12b-12b;');
  });
});

describe('normalizeChapRange', () => {
  it('chapter range 9--12', () => {
    expect(normalizeChapRange('9,*-*;--12,*-*;')).toBe(
      '9,*-*;10,*-*;11,*-*;12,*-*;',
    );
  });
  it('chapter range with specific verses', () => {
    expect(normalizeChapRange('9,1-*;--12,*-36;')).toBe(
      '9,1-*;10,*-*;11,*-*;12,*-36;',
    );
  });
  it('no range to normalize', () => {
    expect(normalizeChapRange('9,1-12;')).toBe('9,1-12;');
  });
});

describe('parseVerseNum', () => {
  it('Simple verse number 12', () => {
    expect(parseVerseNum('12')).toEqual({ number: 12, order: [-1] });
  });
  it("Verse with order 'b' (9:12b)", () => {
    expect(parseVerseNum('12b')).toEqual({ number: 12, order: [1] });
  });
  it("Verse with order 'a'", () => {
    expect(parseVerseNum('12a')).toEqual({ number: 12, order: [0] });
  });
  it("Verse with order 'c'", () => {
    expect(parseVerseNum('12c')).toEqual({ number: 12, order: [2] });
  });
  it('Asterisk means all verses (*)', () => {
    expect(parseVerseNum('*')).toEqual({ number: -1, order: [-1] });
  });
  it('Invalid verse format', () => {
    expectError(() => parseVerseNum('abc'));
  });
  it('Empty string', () => {
    expectError(() => parseVerseNum(''));
  });
});

// Additional test cases based on table specifications with spaces
describe('normalizeQueryUs Table Specs', () => {
  it('John 9', () => {
    expect(normalizeQueryUs('9')).toBe('9:*-*');
  });
  it('John 9, 12', () => {
    expect(normalizeQueryUs('9, 12')).toBe('9:*-*;12:*-*');
  });
  it('John 9--12', () => {
    expect(normalizeQueryUs('9--12')).toBe('9:*-*;10:*-*;11:*-*;12:*-*');
  });
  it('John 9:12', () => {
    expect(normalizeQueryUs('9:12')).toBe('9:12-12');
  });
  it('John 9:12b', () => {
    expect(normalizeQueryUs('9:12b')).toBe('9:12b-12b');
  });
  it('John 9:1, 12', () => {
    expect(normalizeQueryUs('9:1, 12')).toBe('9:1-1;9:12-12');
  });
  it('John 9:1-12', () => {
    expect(normalizeQueryUs('9:1-12')).toBe('9:1-12');
  });
  it('John 9:1-12, 36', () => {
    expect(normalizeQueryUs('9:1-12, 36')).toBe('9:1-12;9:36-36');
  });
  it('John 9:1; 12:36', () => {
    expect(normalizeQueryUs('9:1; 12:36')).toBe('9:1-1;12:36-36');
  });
  it('John 9:1--12:36', () => {
    expect(normalizeQueryUs('9:1--12:36')).toBe('9:1-*;10:*-*;11:*-*;12:*-36');
  });
  it('John 9:1-12; 12:3-6', () => {
    expect(normalizeQueryUs('9:1-12; 12:3-6')).toBe('9:1-12;12:3-6');
  });
  it('John 9:1-3, 6-12; 12:3-6', () => {
    expect(normalizeQueryUs('9:1-3, 6-12; 12:3-6')).toBe('9:1-3;9:6-12;12:3-6');
  });
  it('John 9:1-3, 6-12--12:3-6 (Additional)', () => {
    expect(normalizeQueryUs('9:1-3, 6-12--12:3-6')).toBe(
      '9:1-3;9:6-*;10:*-*;11:*-*;12:*-6',
    );
  });
});

describe('normalizeQueryEu Table Specs', () => {
  it('John 9', () => {
    expect(normalizeQueryEu('9')).toBe('9,*-*');
  });
  it('John 9; 12', () => {
    expect(normalizeQueryEu('9; 12')).toBe('9,*-*;12,*-*');
  });
  it('John 9--12', () => {
    expect(normalizeQueryEu('9--12')).toBe('9,*-*;10,*-*;11,*-*;12,*-*');
  });
  it('John 9,12', () => {
    expect(normalizeQueryEu('9,12')).toBe('9,12-12');
  });
  it('John 9,12b', () => {
    expect(normalizeQueryEu('9,12b')).toBe('9,12b-12b');
  });
  it('John 9,1.12', () => {
    expect(normalizeQueryEu('9,1.12')).toBe('9,1-1;9,12-12');
  });
  it('John 9,1-12', () => {
    expect(normalizeQueryEu('9,1-12')).toBe('9,1-12');
  });
  it('John 9,1-12.36', () => {
    expect(normalizeQueryEu('9,1-12.36')).toBe('9,1-12;9,36-36');
  });
  it('John 9,1; 12,36', () => {
    expect(normalizeQueryEu('9,1; 12,36')).toBe('9,1-1;12,36-36');
  });
  it('John 9,1--12,36', () => {
    expect(normalizeQueryEu('9,1--12,36')).toBe('9,1-*;10,*-*;11,*-*;12,*-36');
  });
  it('John 9,1-12; 12,3-6', () => {
    expect(normalizeQueryEu('9,1-12; 12,3-6')).toBe('9,1-12;12,3-6');
  });
  it('John 9,1-3.6-12; 12,3-6', () => {
    expect(normalizeQueryEu('9,1-3.6-12; 12,3-6')).toBe('9,1-3;9,6-12;12,3-6');
  });
  it('John 9,1-3.6-12--12,3-6', () => {
    expect(normalizeQueryEu('9,1-3.6-12--12,3-6')).toBe(
      '9,1-3;9,6-*;10,*-*;11,*-*;12,*-6',
    );
  });
});

// Error Cases from Go tests
describe('Error Cases', () => {
  it('NormalizeQueryUs with invalid input', () => {
    expectError(() => normalizeQueryUs('invalid@#$'));
  });
  it('NormalizeQueryEu with invalid input', () => {
    expectError(() => normalizeQueryEu('invalid@#$'));
  });
  it('ParseBiblicalReference without book code', () => {
    expectError(() => parseBiblicalReference('', 'us'));
  });
});
