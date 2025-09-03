import { create } from '@bufbuild/protobuf';
import {
  type Mark,
  MarkKind,
  MarkSchema,
  MarkTargetType,
} from '@v-bible/types';
import { describe, expect, it } from 'vitest';
import { resolveMarks } from '@/lib/utils/resolve-marks';

type ResolveMarksOptions = {
  overlapKeepRight?: boolean;
};

// Helper function to create Mark objects using protobuf create function
function createMark(data: {
  id: string;
  content: string;
  kind: MarkKind;
  label?: string;
  sortOrder?: number;
  startOffset: number;
  endOffset: number;
  targetId?: string;
  targetType?: MarkTargetType;
  chapterId?: string;
}): Mark {
  return create(MarkSchema, {
    id: data.id,
    content: data.content,
    kind: data.kind,
    label: data.label || '',
    sortOrder: data.sortOrder || 0,
    startOffset: data.startOffset,
    endOffset: data.endOffset,
    targetId: data.targetId || '',
    targetType: data.targetType,
  });
}

describe('resolveMarks', () => {
  it('should handle non-overlapping marks', () => {
    const marks: Mark[] = [
      createMark({
        id: '1',
        content: 'The',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG',
        startOffset: 0,
        endOffset: 3,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '2',
        content: 'quick',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG',
        startOffset: 4,
        endOffset: 9,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '3',
        content: 'brown',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG',
        startOffset: 10,
        endOffset: 15,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const options: ResolveMarksOptions | undefined = undefined; // Use defaults

    const expected: Mark[] = [
      createMark({
        id: '1',
        content: 'The',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG',
        startOffset: 0,
        endOffset: 3,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '2',
        content: 'quick',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG',
        startOffset: 4,
        endOffset: 9,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '3',
        content: 'brown',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG',
        startOffset: 10,
        endOffset: 15,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const result = resolveMarks(marks, options);
    expect(result).toEqual(expected);
  });

  it('should handle overlapping marks with overlapKeepRight=true (default)', () => {
    const marks: Mark[] = [
      createMark({
        id: '1',
        content: 'The quick brown',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG1',
        startOffset: 0,
        endOffset: 15,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '2',
        content: 'quick brown fox',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG2',
        startOffset: 4,
        endOffset: 19,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const options: ResolveMarksOptions | undefined = undefined; // Use defaults (overlapKeepRight=true)

    const expected: Mark[] = [
      createMark({
        id: '1',
        content: 'The ',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG1',
        startOffset: 0,
        endOffset: 4,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '1',
        content: 'quick brown',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG1',
        startOffset: 4,
        endOffset: 15,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '2',
        content: 'quick brown fox',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG2',
        startOffset: 4,
        endOffset: 19,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const result = resolveMarks(marks, options);
    expect(result).toEqual(expected);
  });

  it('should handle contained marks (one inside another)', () => {
    const marks: Mark[] = [
      createMark({
        id: '1',
        content: 'The quick brown fox',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG1',
        startOffset: 0,
        endOffset: 19,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '2',
        content: 'quick brown',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG2',
        startOffset: 4,
        endOffset: 15,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const options: ResolveMarksOptions | undefined = undefined;

    const expected: Mark[] = [
      createMark({
        id: '1',
        content: 'The quick brown fox',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG1',
        startOffset: 0,
        endOffset: 19,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '2',
        content: 'quick brown',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG2',
        startOffset: 4,
        endOffset: 15,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const result = resolveMarks(marks, options);
    expect(result).toEqual(expected);
  });

  it('should handle footnotes where startOffset equals endOffset', () => {
    const marks: Mark[] = [
      createMark({
        id: '1',
        content: 'Beginning of verse',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG',
        startOffset: 0,
        endOffset: 18,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '2',
        content: 'Footnote content',
        kind: MarkKind.FOOTNOTE,
        label: 'a',
        startOffset: 10,
        endOffset: 10, // Zero-width footnote
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '3',
        content: 'Reference content',
        kind: MarkKind.REFERENCE,
        label: '1',
        startOffset: 15,
        endOffset: 15, // Zero-width reference
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const options: ResolveMarksOptions | undefined = undefined;

    const expected: Mark[] = [
      createMark({
        id: '1',
        content: 'Beginning of verse',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG',
        startOffset: 0,
        endOffset: 18,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '2',
        content: 'Footnote content',
        kind: MarkKind.FOOTNOTE,
        label: 'a',
        startOffset: 10,
        endOffset: 10,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '3',
        content: 'Reference content',
        kind: MarkKind.REFERENCE,
        label: '1',
        startOffset: 15,
        endOffset: 15,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const result = resolveMarks(marks, options);
    expect(result).toEqual(expected);
  });

  it('should return empty array when no marks are provided', () => {
    const marks: Mark[] = [];
    const options: ResolveMarksOptions | undefined = undefined;
    const expected: Mark[] = [];

    const result = resolveMarks(marks, options);
    expect(result).toEqual(expected);
  });

  it('should handle single mark', () => {
    const marks: Mark[] = [
      createMark({
        id: '1',
        content: 'Single mark',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG',
        startOffset: 0,
        endOffset: 11,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const options: ResolveMarksOptions | undefined = undefined;

    const expected: Mark[] = [
      createMark({
        id: '1',
        content: 'Single mark',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG',
        startOffset: 0,
        endOffset: 11,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const result = resolveMarks(marks, options);
    expect(result).toEqual(expected);
  });

  it('should handle multiple footnotes at same position', () => {
    const marks: Mark[] = [
      createMark({
        id: '1',
        content: 'footnote1',
        kind: MarkKind.FOOTNOTE,
        label: 'a',
        startOffset: 10,
        endOffset: 10,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '2',
        content: 'footnote2',
        kind: MarkKind.FOOTNOTE,
        label: 'b',
        startOffset: 10,
        endOffset: 10,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '3',
        content: 'Base text here',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG',
        startOffset: 0,
        endOffset: 20,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const options: ResolveMarksOptions | undefined = undefined;

    const expected: Mark[] = [
      createMark({
        id: '3',
        content: 'Base text here',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG',
        startOffset: 0,
        endOffset: 20,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '1',
        content: 'footnote1',
        kind: MarkKind.FOOTNOTE,
        label: 'a',
        startOffset: 10,
        endOffset: 10,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '2',
        content: 'footnote2',
        kind: MarkKind.FOOTNOTE,
        label: 'b',
        startOffset: 10,
        endOffset: 10,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const result = resolveMarks(marks, options);
    expect(result).toEqual(expected);
  });
});

// Test edge cases and error conditions
describe('resolveMarks Edge Cases', () => {
  it('nil marks slice', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = resolveMarks(null as any, undefined);
    expect(result).toEqual([]);
  });

  it('nil options should use defaults', () => {
    const marks: Mark[] = [
      createMark({
        id: '1',
        content: 'test',
        kind: MarkKind.WORDS_OF_JESUS,
        startOffset: 0,
        endOffset: 4,
      }),
    ];
    const result = resolveMarks(marks, undefined);
    expect(result).toHaveLength(1);
  });

  it('marks with same start and end positions', () => {
    const marks: Mark[] = [
      createMark({
        id: '1',
        content: 'footnote1',
        kind: MarkKind.FOOTNOTE,
        startOffset: 10,
        endOffset: 10,
      }),
      createMark({
        id: '2',
        content: 'footnote2',
        kind: MarkKind.FOOTNOTE,
        startOffset: 10,
        endOffset: 10,
      }),
    ];
    const result = resolveMarks(marks, undefined);
    // Should preserve both zero-width marks at the same position
    expect(result).toHaveLength(2);
  });

  it('complex overlapping scenario with mixed mark types', () => {
    const marks: Mark[] = [
      createMark({
        id: '1',
        content: 'For God so loved the world',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG1',
        startOffset: 0,
        endOffset: 26,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '2',
        content: 'God so loved',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG2',
        startOffset: 4,
        endOffset: 16,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '3',
        content: 'Cross reference to Genesis',
        kind: MarkKind.REFERENCE,
        label: '1',
        startOffset: 8,
        endOffset: 8, // Zero-width at "loved"
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '4',
        content: 'the world that he gave',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG3',
        startOffset: 17,
        endOffset: 39,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '5',
        content: 'Footnote about giving',
        kind: MarkKind.FOOTNOTE,
        label: 'a',
        startOffset: 35,
        endOffset: 35, // Zero-width at "gave"
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const result = resolveMarks(marks, undefined);

    // Should handle multiple overlapping scenarios
    expect(result.length).toBeGreaterThanOrEqual(5);

    // Verify all marks are sorted by start position
    for (let i = 1; i < result.length; i += 1) {
      expect(result[i - 1]!.startOffset).toBeLessThanOrEqual(
        result[i]!.startOffset,
      );
    }
  });

  it('overlapping highlights with note wrapping', () => {
    const marks: Mark[] = [
      createMark({
        id: '1',
        content: 'In the beginning God created',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG1',
        startOffset: 0,
        endOffset: 28,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '2',
        content: 'beginning God',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG2',
        startOffset: 7,
        endOffset: 20,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '3',
        content: 'God footnote',
        kind: MarkKind.FOOTNOTE,
        label: 'a',
        startOffset: 17,
        endOffset: 17, // Zero-width footnote at "God"
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
      createMark({
        id: '4',
        content: 'created the heavens',
        kind: MarkKind.WORDS_OF_JESUS,
        label: 'HIG3',
        startOffset: 21,
        endOffset: 40,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];

    const result = resolveMarks(marks, undefined);

    // Should handle overlapping highlights and note wrapping
    expect(result.length).toBeGreaterThanOrEqual(4);

    // Verify all marks are sorted by start position
    for (let i = 1; i < result.length; i += 1) {
      expect(result[i - 1]!.startOffset).toBeLessThanOrEqual(
        result[i]!.startOffset,
      );
    }
  });
});
