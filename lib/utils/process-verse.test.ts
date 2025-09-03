import { create } from '@bufbuild/protobuf';
import {
  type Heading,
  HeadingSchema,
  type Mark,
  MarkKind,
  MarkSchema,
  MarkTargetType,
  type PsalmMetadata,
  PsalmMetadataSchema,
  type Verse,
  VerseSchema,
} from '@v-bible/types';
import { describe, expect, it } from 'vitest';
import {
  injectMarkLabel,
  processVerseHtml,
  processVerseMd,
} from '@/lib/utils/process-verse';

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
    targetType: data.targetType || MarkTargetType.VERSE,
    chapterId: data.chapterId || '',
  });
}

// Helper function to create Verse objects using protobuf create function
function createVerse(data: {
  id: string;
  number: number;
  text: string;
  label: string;
  chapterId?: string;
  subVerseIndex?: number;
  paragraphIndex?: number;
  paragraphNumber?: number;
  isPoetry?: boolean;
}): Verse {
  return create(VerseSchema, {
    id: data.id,
    number: data.number,
    text: data.text,
    label: data.label,
    chapterId: data.chapterId || '',
    subVerseIndex: data.subVerseIndex || 0,
    paragraphIndex: data.paragraphIndex || 0,
    paragraphNumber: data.paragraphNumber || 0,
    isPoetry: data.isPoetry || false,
  });
}

// Helper function to create Heading objects using protobuf create function
function createHeading(data: {
  id: string;
  text: string;
  level: number;
  verseId: string;
}): Heading {
  return create(HeadingSchema, {
    id: data.id,
    text: data.text,
    level: data.level,
    verseId: data.verseId,
  });
}

// Helper function to create PsalmMetadata objects using protobuf create function
function createPsalmMetadata(data: {
  id: string;
  text: string;
  chapterId: string;
}): PsalmMetadata {
  return create(PsalmMetadataSchema, {
    id: data.id,
    text: data.text,
    chapterId: data.chapterId,
  });
}

describe('injectMarkLabel', () => {
  const createLabelMap = () => ({
    [MarkKind.UNSPECIFIED]: (): string => '',
    [MarkKind.FOOTNOTE]: (mark: Mark): string => `<sup>${mark.label}</sup>`,
    [MarkKind.REFERENCE]: (mark: Mark): string => `<sup>${mark.label}</sup>`,
    [MarkKind.WORDS_OF_JESUS]: (mark: Mark): string =>
      `<span class="words-of-jesus">${mark.content}</span>`,
  });

  it('should handle no marks', () => {
    const input = 'The quick brown fox';
    const marks: Mark[] = [];
    const labelMap = createLabelMap();
    const expected = 'The quick brown fox';

    const result = injectMarkLabel(input, marks, labelMap);
    expect(result).toBe(expected);
  });

  it('should handle single footnote mark', () => {
    const input = 'In the beginning God created the heavens and the earth.';
    const marks: Mark[] = [
      createMark({
        id: 'fn1',
        content: 'God',
        kind: MarkKind.FOOTNOTE,
        label: 'a',
        startOffset: 17,
        endOffset: 20,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];
    const labelMap = createLabelMap();
    const expected =
      'In the beginning <sup>a</sup> created the heavens and the earth.';

    const result = injectMarkLabel(input, marks, labelMap);
    expect(result).toBe(expected);
  });

  it('should handle single reference mark', () => {
    const input = 'For God so loved the world';
    const marks: Mark[] = [
      createMark({
        id: 'ref1',
        content: 'God',
        kind: MarkKind.REFERENCE,
        label: '1',
        startOffset: 4,
        endOffset: 7,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];
    const labelMap = createLabelMap();
    const expected = 'For <sup>1</sup> so loved the world';

    const result = injectMarkLabel(input, marks, labelMap);
    expect(result).toBe(expected);
  });

  it('should handle words of Jesus mark', () => {
    const input = 'Jesus said, I am the way, the truth, and the life.';
    const marks: Mark[] = [
      createMark({
        id: 'woj1',
        content: 'I am the way, the truth, and the life.',
        kind: MarkKind.WORDS_OF_JESUS,
        label: '',
        startOffset: 12,
        endOffset: 50,
        targetId: 'verse1',
        targetType: MarkTargetType.VERSE,
      }),
    ];
    const labelMap = createLabelMap();
    const expected =
      'Jesus said, <span class="words-of-jesus">I am the way, the truth, and the life.</span>';

    const result = injectMarkLabel(input, marks, labelMap);
    expect(result).toBe(expected);
  });
});

describe('processVerseMd', () => {
  it('should handle simple verse without marks', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'GEN.1.1',
        number: 1,
        text: 'In the beginning God created the heavens and the earth.',
        label: '1',
      }),
    ];
    const marks: Mark[] = [];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [];
    const expected =
      '<sup><b>1</b></sup> In the beginning God created the heavens and the earth.';

    const result = processVerseMd(verses, marks, headings, psalms);
    expect(result).toBe(expected);
  });

  it('should handle verse with footnote', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'GEN.1.1',
        number: 1,
        text: 'In the beginning God created the heavens and the earth.',
        label: '1',
        chapterId: '',
      }),
    ];
    const marks: Mark[] = [
      createMark({
        id: 'fn1',
        content: 'God',
        kind: MarkKind.FOOTNOTE,
        label: 'a',
        startOffset: 17,
        endOffset: 20,
        targetId: 'GEN.1.1',
        targetType: MarkTargetType.VERSE,
        sortOrder: 0,
        chapterId: '',
      }),
    ];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [];
    const expected =
      '<sup><b>1</b></sup> In the beginning [^1-] created the heavens and the earth.\n\n[^1-]: God';

    const result = processVerseMd(verses, marks, headings, psalms);
    expect(result).toBe(expected);
  });

  it('should handle verse with heading', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'GEN.1.1',
        number: 1,
        text: 'In the beginning God created the heavens and the earth.',
        label: '1',
      }),
    ];
    const marks: Mark[] = [];
    const headings: Heading[] = [
      createHeading({
        id: 'heading1',
        text: 'The Creation of the World',
        level: 1,
        verseId: 'GEN.1.1',
      }),
    ];
    const psalms: PsalmMetadata[] = [];
    const expected =
      '# The Creation of the World\n<sup><b>1</b></sup> In the beginning God created the heavens and the earth.';

    const result = processVerseMd(verses, marks, headings, psalms);
    expect(result).toBe(expected);
  });

  it('should handle multiple verses with different paragraph numbers', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'GEN.1.1',
        number: 1,
        text: 'In the beginning God created the heavens and the earth.',
        label: '1',
        paragraphNumber: 1,
      }),
      createVerse({
        id: 'GEN.1.2',
        number: 2,
        text: 'The earth was without form and void.',
        label: '2',
        paragraphNumber: 2,
      }),
    ];
    const marks: Mark[] = [];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [];
    const expected =
      '<sup><b>1</b></sup> In the beginning God created the heavens and the earth.\n\n<sup><b>2</b></sup> The earth was without form and void.';

    const result = processVerseMd(verses, marks, headings, psalms);
    expect(result).toBe(expected);
  });

  it('should handle poetry verse', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'PSA.1.1',
        number: 1,
        text: 'Blessed is the man who walks not in the counsel of the wicked',
        label: '1',
        isPoetry: true,
      }),
    ];
    const marks: Mark[] = [];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [];
    const expected =
      '> <sup><b>1</b></sup> Blessed is the man who walks not in the counsel of the wicked';

    const result = processVerseMd(verses, marks, headings, psalms);
    expect(result).toBe(expected);
  });

  it('should handle psalm metadata', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'PSA.1.1',
        number: 1,
        text: 'Blessed is the man who walks not in the counsel of the wicked',
        label: '1',
        chapterId: 'PSA.1',
        subVerseIndex: 0,
        paragraphNumber: 0,
      }),
    ];
    const marks: Mark[] = [];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [
      createPsalmMetadata({
        id: 'psalm1',
        text: 'A Psalm of David',
        chapterId: 'PSA.1',
      }),
    ];
    const expected =
      '*A Psalm of David*\n<sup><b>1</b></sup> Blessed is the man who walks not in the counsel of the wicked';

    const result = processVerseMd(verses, marks, headings, psalms);
    expect(result).toBe(expected);
  });
});

describe('processVerseHtml', () => {
  it('should handle simple verse without marks', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'GEN.1.1',
        number: 1,
        text: 'In the beginning God created the heavens and the earth.',
        label: '1',
      }),
    ];
    const marks: Mark[] = [];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [];
    const expected =
      '<sup><b>1</b></sup> In the beginning God created the heavens and the earth.<hr>\n\n<ol></ol>';

    const result = processVerseHtml(verses, marks, headings, psalms);
    expect(result).toBe(expected);
  });

  it('should handle verse with footnote', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'GEN.1.1',
        number: 1,
        text: 'In the beginning God created the heavens and the earth.',
        label: '1',
      }),
    ];
    const marks: Mark[] = [
      createMark({
        id: 'fn1',
        content: 'God',
        kind: MarkKind.FOOTNOTE,
        label: 'a',
        startOffset: 17,
        endOffset: 20,
        targetId: 'GEN.1.1',
        targetType: MarkTargetType.VERSE,
        sortOrder: 0,
        chapterId: '',
      }),
    ];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [];
    const expected =
      '<sup><b>1</b></sup> In the beginning <sup><a href="#fn-1-" id="fnref-1-">1</a></sup> created the heavens and the earth.<hr>\n\n<ol><li id="fn-1-"><p>God [<a href="#fnref-1-">1</a>]</p></li>\n\n</ol>';

    const result = processVerseHtml(verses, marks, headings, psalms);
    expect(result).toBe(expected);
  });

  it('should handle verse with heading', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'GEN.1.1',
        number: 1,
        text: 'In the beginning God created the heavens and the earth.',
        label: '1',
      }),
    ];
    const marks: Mark[] = [];
    const headings: Heading[] = [
      createHeading({
        id: 'heading1',
        text: 'The Creation of the World',
        level: 1,
        verseId: 'GEN.1.1',
      }),
    ];
    const psalms: PsalmMetadata[] = [];
    const expected =
      '<h1>The Creation of the World</h1>\n<sup><b>1</b></sup> In the beginning God created the heavens and the earth.<hr>\n\n<ol></ol>';

    const result = processVerseHtml(verses, marks, headings, psalms);
    expect(result).toBe(expected);
  });

  it('should handle multiple verses with different paragraph numbers', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'GEN.1.1',
        number: 1,
        text: 'In the beginning God created the heavens and the earth.',
        label: '1',
        paragraphNumber: 1,
      }),
      createVerse({
        id: 'GEN.1.2',
        number: 2,
        text: 'The earth was without form and void.',
        label: '2',
        paragraphNumber: 2,
      }),
    ];
    const marks: Mark[] = [];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [];
    const expected =
      '<sup><b>1</b></sup> In the beginning God created the heavens and the earth.\n\n<sup><b>2</b></sup> The earth was without form and void.<hr>\n\n<ol></ol>';

    const result = processVerseHtml(verses, marks, headings, psalms);
    expect(result).toBe(expected);
  });

  it('should handle poetry verse', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'PSA.1.1',
        number: 1,
        text: 'Blessed is the man who walks not in the counsel of the wicked',
        label: '1',
        isPoetry: true,
      }),
    ];
    const marks: Mark[] = [];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [];
    const expected =
      '<blockquote><sup><b>1</b></sup> Blessed is the man who walks not in the counsel of the wicked</blockquote>\n<hr>\n\n<ol></ol>';

    const result = processVerseHtml(verses, marks, headings, psalms);
    expect(result).toBe(expected);
  });

  it('should handle psalm metadata', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'PSA.1.1',
        number: 1,
        text: 'Blessed is the man who walks not in the counsel of the wicked',
        label: '1',
        chapterId: 'PSA.1',
        subVerseIndex: 0,
        paragraphNumber: 0,
      }),
    ];
    const marks: Mark[] = [];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [
      createPsalmMetadata({
        id: 'psalm1',
        text: 'A Psalm of David',
        chapterId: 'PSA.1',
      }),
    ];
    const expected =
      '<i>A Psalm of David</i>\n<sup><b>1</b></sup> Blessed is the man who walks not in the counsel of the wicked<hr>\n\n<ol></ol>';

    const result = processVerseHtml(verses, marks, headings, psalms);
    expect(result).toBe(expected);
  });

  it('should handle complex scenario with multiple marks and headings', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'JOH.3.16',
        number: 16,
        text: 'For God so loved the world, that he gave his one and only Son.',
        label: '16',
        chapterId: 'JOH.3',
      }),
    ];
    const marks: Mark[] = [
      createMark({
        id: 'fn1',
        content: 'Greek: kosmos',
        kind: MarkKind.FOOTNOTE,
        label: 'a',
        startOffset: 17,
        endOffset: 22, // "world"
        targetId: 'JOH.3.16',
        targetType: MarkTargetType.VERSE,
        sortOrder: 0,
        chapterId: 'JOH.3',
      }),
      createMark({
        id: 'ref1',
        content: 'See Rom 5:8',
        kind: MarkKind.REFERENCE,
        label: '1',
        startOffset: 4,
        endOffset: 7, // "God"
        targetId: 'JOH.3.16',
        targetType: MarkTargetType.VERSE,
        sortOrder: 1,
        chapterId: 'JOH.3',
      }),
    ];
    const headings: Heading[] = [
      createHeading({
        id: 'heading1',
        text: "God's Love for the World",
        level: 2,
        verseId: 'JOH.3.16',
      }),
    ];
    const psalms: PsalmMetadata[] = [];

    const result = processVerseHtml(verses, marks, headings, psalms);

    // Verify it contains the main elements we expect
    expect(result).toContain("<h2>God's Love for the World</h2>");
    expect(result).toContain('<sup><b>16</b></sup>');
    expect(result).toContain(
      'For <sup><a href="#fn-2@-JOH.3" id="fnref-2@-JOH.3">2@</a></sup> so loved',
    );
    expect(result).toContain(
      '<li id="fn-1-JOH.3"><p>Greek: kosmos [<a href="#fnref-1-JOH.3">1</a>]</p></li>',
    );
    expect(result).toContain(
      '<li id="fn-2@-JOH.3"><p>See Rom 5:8 [<a hfootnote="#fnfootnote-2@-JOH.3">2@</a>]</p></li>',
    );
  });

  it('should handle verse with reference mark', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'ROM.1.1',
        number: 1,
        text: 'Paul, a servant of Christ Jesus',
        label: '1',
      }),
    ];
    const marks: Mark[] = [
      createMark({
        id: 'ref1',
        content: 'See Gal 1:10',
        kind: MarkKind.REFERENCE,
        label: '1',
        startOffset: 7,
        endOffset: 14, // "servant"
        targetId: 'ROM.1.1',
        targetType: MarkTargetType.VERSE,
        sortOrder: 0,
        chapterId: '',
      }),
    ];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [];

    const result = processVerseHtml(verses, marks, headings, psalms);

    expect(result).toContain(
      'Paul, a<sup><a href="#fn-1@-" id="fnref-1@-">1@</a></sup>',
    );
    expect(result).toContain(
      '<li id="fn-1@-"><p>See Gal 1:10 [<a hfootnote="#fnfootnote-1@-">1@</a>]</p></li>',
    );
  });
});

// Edge cases and error handling
describe('processVerse Edge Cases', () => {
  it('should handle empty arrays', () => {
    const verses: Verse[] = [];
    const marks: Mark[] = [];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [];

    const mdResult = processVerseMd(verses, marks, headings, psalms);
    const htmlResult = processVerseHtml(verses, marks, headings, psalms);

    expect(mdResult).toBe('');
    expect(htmlResult).toBe('<hr>\n\n<ol></ol>');
  });

  it('should handle marks with invalid offsets', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'GEN.1.1',
        number: 1,
        text: 'Short text',
        label: '1',
      }),
    ];
    const marks: Mark[] = [
      createMark({
        id: 'fn1',
        content: 'Footnote',
        kind: MarkKind.FOOTNOTE,
        label: 'a',
        startOffset: 50, // Beyond text length
        endOffset: 60,
        targetId: 'GEN.1.1',
        targetType: MarkTargetType.VERSE,
        sortOrder: 0,
        chapterId: '',
      }),
    ];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [];

    // Should not crash and should handle gracefully
    expect(() => {
      processVerseMd(verses, marks, headings, psalms);
      processVerseHtml(verses, marks, headings, psalms);
    }).not.toThrow();
  });

  it('should handle heading with zero level', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'GEN.1.1',
        number: 1,
        text: 'In the beginning God created the heavens and the earth.',
        label: '1',
      }),
    ];
    const marks: Mark[] = [];
    const headings: Heading[] = [
      createHeading({
        id: 'heading1',
        text: 'Invalid Level Heading',
        level: 0,
        verseId: 'GEN.1.1',
      }),
    ];
    const psalms: PsalmMetadata[] = [];

    const mdResult = processVerseMd(verses, marks, headings, psalms);
    const htmlResult = processVerseHtml(verses, marks, headings, psalms);

    // Should handle level 0 gracefully (modulo MAX_HEADING should still work)
    expect(mdResult).toContain('Invalid Level Heading');
    expect(htmlResult).toContain('Invalid Level Heading');
  });

  it('should handle multiple footnotes at same position', () => {
    const verses: Verse[] = [
      createVerse({
        id: 'GEN.1.1',
        number: 1,
        text: 'In the beginning God created the heavens and the earth.',
        label: '1',
      }),
    ];
    const marks: Mark[] = [
      createMark({
        id: 'fn1',
        content: 'First footnote',
        kind: MarkKind.FOOTNOTE,
        label: 'a',
        startOffset: 17,
        endOffset: 17, // Zero-width
        targetId: 'GEN.1.1',
        targetType: MarkTargetType.VERSE,
        sortOrder: 0,
        chapterId: '',
      }),
      createMark({
        id: 'fn2',
        content: 'Second footnote',
        kind: MarkKind.FOOTNOTE,
        label: 'b',
        startOffset: 17,
        endOffset: 17, // Zero-width at same position
        targetId: 'GEN.1.1',
        targetType: MarkTargetType.VERSE,
        sortOrder: 1,
        chapterId: '',
      }),
    ];
    const headings: Heading[] = [];
    const psalms: PsalmMetadata[] = [];

    const mdResult = processVerseMd(verses, marks, headings, psalms);
    const htmlResult = processVerseHtml(verses, marks, headings, psalms);

    // Should handle multiple footnotes at the same position
    expect(mdResult).toContain('[^1-]: First footnote');
    expect(mdResult).toContain('[^2-]: Second footnote');
    expect(htmlResult).toContain('First footnote');
    expect(htmlResult).toContain('Second footnote');
  });
});
