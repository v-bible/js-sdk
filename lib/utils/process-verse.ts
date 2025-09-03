import {
  type Heading,
  type Mark,
  MarkKind,
  MarkTargetType,
  type PsalmMetadata,
  type Verse,
} from '@v-bible/types';
import { uniq } from 'es-toolkit';
import showdown from 'showdown';
import { resolveMarks } from '@/lib/utils/resolve-marks';

const MAX_HEADING = 6;

const injectMarkLabel = (
  str: string,
  marks: Mark[],
  labelMap: Record<MarkKind, (mark: Mark, chapterId: string) => string>,
): string => {
  const resolvedMarks = resolveMarks(marks, undefined).reverse();

  resolvedMarks.forEach((mark) => {
    const labelFunc = labelMap[mark.kind];

    if (labelFunc !== undefined) {
      const newMarkLabel = labelFunc(mark, mark.chapterId);

      const startOffset =
        mark.startOffset > str.length ? str.length : mark.startOffset;

      const endOffset =
        mark.endOffset > str.length ? str.length : mark.endOffset;

      str =
        str.slice(0, startOffset) +
        newMarkLabel +
        str.slice(endOffset, str.length);
    }
  });

  return str;
};

const unspecifiedMdLabel = (): string => {
  return '';
};

const fnMdLabel = (mark: Mark, chapterId: string): string => {
  return `[^${mark.sortOrder + 1}-${chapterId}]`;
};

const refMdLabel = (mark: Mark, chapterId: string): string => {
  return `[^${mark.sortOrder + 1}@-${chapterId}]`;
};

const wojMdLabel = (mark: Mark): string => {
  return `<b>${mark.content}</b>`;
};

const unspecifiedHtmlLabel = (): string => {
  return '';
};

const fnHtmlLabel = (mark: Mark, chapterId: string): string => {
  return `<sup><a href="#fn-${mark.sortOrder + 1}-${chapterId}" id="fnref-${mark.sortOrder + 1}-${chapterId}">${mark.sortOrder + 1}</a></sup>`;
};

const refHtmlLabel = (mark: Mark, chapterId: string): string => {
  return `<sup><a href="#fn-${mark.sortOrder + 1}@-${chapterId}" id="fnref-${mark.sortOrder + 1}@-${chapterId}">${mark.sortOrder + 1}@</a></sup>`;
};

const wojHtmlLabel = (mark: Mark): string => {
  return `<b>${mark.content}</b>`;
};

const processVerseMd = (
  verses: Verse[],
  marks: Mark[],
  headings: Heading[],
  psalms: PsalmMetadata[],
): string => {
  // NOTE: Order is Woj -> Footnote labels -> Verse number -> Poetry ->
  // Psalms -> Headings -> Heading Footnotes -> Chapter separator ->
  // Footnote text
  const newVerses = verses.map((verse) => {
    const verseFootnotes = marks.filter(
      (fn) =>
        fn.kind === MarkKind.FOOTNOTE &&
        fn.targetType === MarkTargetType.VERSE &&
        fn.targetId === verse.id,
    );
    const verseReferences = marks.filter(
      (fn) =>
        fn.kind === MarkKind.REFERENCE &&
        fn.targetType === MarkTargetType.VERSE &&
        fn.targetId === verse.id,
    );
    const verseHeadings = headings.filter((h) => h.verseId === verse.id);
    const verseWoj = marks.filter(
      (w) =>
        w.kind === MarkKind.WORDS_OF_JESUS &&
        w.targetType === MarkTargetType.VERSE &&
        w.targetId === verse.id,
    );

    let newContent = verse.text;

    const verseMarks = [...verseFootnotes, ...verseReferences, ...verseWoj];

    const labelMap = {
      [MarkKind.UNSPECIFIED]: unspecifiedMdLabel,
      [MarkKind.FOOTNOTE]: fnMdLabel,
      [MarkKind.REFERENCE]: refMdLabel,
      [MarkKind.WORDS_OF_JESUS]: wojMdLabel,
    };

    newContent = injectMarkLabel(newContent, verseMarks, labelMap);

    // NOTE: Add verse number label only to the first verse or the first
    // verse in the paragraph
    if (verse.subVerseIndex === 0 || verse.paragraphIndex === 0) {
      newContent = `<sup><b>${verse.number}</b></sup> ${newContent}`;
    }

    if (verse.isPoetry) {
      newContent = `\n> ${newContent}\n>`;
    }

    psalms = psalms.reverse();

    // NOTE: Add the Psalm title to the first verse
    if (verse.subVerseIndex === 0 && verse.paragraphNumber === 0) {
      psalms.forEach((psalm) => {
        if (psalm.chapterId === verse.chapterId) {
          newContent = `*${psalm.text}*\n${newContent}`;
        }
      });
    }

    verseHeadings.forEach((vHeading, idx, arr) => {
      const revIdx = verseHeadings.length - idx - 1;

      const headingFootnotes = marks.filter(
        (fn) =>
          fn.kind === MarkKind.FOOTNOTE &&
          fn.targetType === MarkTargetType.HEADING &&
          fn.targetId === arr[revIdx]!.id,
      );
      const headingReferences = marks.filter(
        (fn) =>
          fn.kind === MarkKind.REFERENCE &&
          fn.targetType === MarkTargetType.HEADING &&
          fn.targetId === arr[revIdx]!.id,
      );

      const headingMarks = [...headingFootnotes, ...headingReferences];

      const newHeadingContent = injectMarkLabel(
        arr[revIdx]!.text,
        headingMarks,
        labelMap,
      );

      // NOTE: Heading level starts from 1
      newContent = `\n${'#'.repeat(arr[revIdx]!.level % MAX_HEADING)} ${newHeadingContent}\n${newContent}`;
    });

    return {
      ...verse,
      text: newContent,
    };
  });

  let mdString = '';
  let currPar = 0;
  // NOTE: Store to add newlines between chapters
  let currentChapterId = '';

  newVerses.forEach((verse) => {
    // NOTE: Add line break between chapters
    if (currentChapterId !== '' && currentChapterId !== verse.chapterId) {
      mdString += '\n\n---\n\n';
    }

    currentChapterId = verse.chapterId;

    if (verse.paragraphNumber > currPar) {
      mdString += `\n\n${verse.text}`;
    } else {
      mdString += ` ${verse.text}`;
    }

    currPar = verse.paragraphNumber;
  });

  mdString += '\n\n';

  let fnSection = '';

  marks.sort((a, b) => a.kind - b.kind || a.sortOrder - b.sortOrder);

  marks.forEach((footnote) => {
    if (footnote.kind === MarkKind.FOOTNOTE) {
      fnSection += `[^${footnote.sortOrder + 1}-${footnote.chapterId}]: ${footnote.content}\n\n`;
    } else if (footnote.kind === MarkKind.REFERENCE) {
      fnSection += `[^${footnote.sortOrder + 1}@-${footnote.chapterId}]: ${footnote.content}\n\n`;
    }
  });

  const fnLines = fnSection.split('\n\n');

  // NOTE: Remove duplicate footnotes and references
  const uniqueFnLines = uniq(fnLines);

  mdString += uniqueFnLines.join('\n\n');

  // NOTE: Clean up the blockquote redundant characters. Note to cleanup the
  // blockquote characters, we need to replace the `>` characters at the
  // beginning of the line
  mdString = mdString.replaceAll(/^>\n+>/gm, '>\n>');
  mdString = mdString.replaceAll(/^>\n\n/gm, '\n');
  // NOTE: Clean up the redundant newlines
  mdString = mdString.replaceAll(/\n{3,}/gm, '\n\n');
  mdString = mdString.trim();

  return mdString;
};

const mdToHtml = (md: string) => {
  const converter = new showdown.Converter();

  return converter.makeHtml(md);
};

const processVerseHtml = (
  verses: Verse[],
  marks: Mark[],
  headings: Heading[],
  psalms: PsalmMetadata[],
): string => {
  const newVerses = verses.map((verse) => {
    const verseFootnotes = marks.filter(
      (fn) =>
        fn.kind === MarkKind.FOOTNOTE &&
        fn.targetType === MarkTargetType.VERSE &&
        fn.targetId === verse.id,
    );
    const verseReferences = marks.filter(
      (fn) =>
        fn.kind === MarkKind.REFERENCE &&
        fn.targetType === MarkTargetType.VERSE &&
        fn.targetId === verse.id,
    );
    const verseHeadings = headings.filter((h) => h.verseId === verse.id);
    const verseWoj = marks.filter(
      (w) =>
        w.kind === MarkKind.WORDS_OF_JESUS &&
        w.targetType === MarkTargetType.VERSE &&
        w.targetId === verse.id,
    );

    let newContent = verse.text;

    const verseMarks = [...verseFootnotes, ...verseReferences, ...verseWoj];

    const labelMap = {
      [MarkKind.UNSPECIFIED]: unspecifiedHtmlLabel,
      [MarkKind.FOOTNOTE]: fnHtmlLabel,
      [MarkKind.REFERENCE]: refHtmlLabel,
      [MarkKind.WORDS_OF_JESUS]: wojHtmlLabel,
    };

    newContent = injectMarkLabel(
      mdToHtml(newContent).replaceAll(/<p>|<\/p>\n?/gm, ''),
      verseMarks,
      labelMap,
    );

    // NOTE: Add verse number label only to the first verse or the first
    // verse in the paragraph
    if (verse.subVerseIndex === 0 || verse.paragraphIndex === 0) {
      newContent = `<sup><b>${verse.number}</b></sup> ${newContent}`;
    }

    if (verse.isPoetry) {
      newContent = `\n<blockquote>${newContent}</blockquote>\n`;
    }

    psalms = psalms.reverse();

    // NOTE: Add the Psalm title to the first verse
    if (verse.subVerseIndex === 0 && verse.paragraphNumber === 0) {
      psalms.forEach((psalm) => {
        if (psalm.chapterId === verse.chapterId) {
          newContent = `<i>${mdToHtml(psalm.text).replaceAll(/<p>|<\/p>\n?/gm, '')}</i>\n${newContent}`;
        }
      });
    }

    verseHeadings.forEach((vHeading, idx, arr) => {
      const revIdx = verseHeadings.length - idx - 1;

      const headingFootnotes = marks.filter(
        (fn) =>
          fn.kind === MarkKind.FOOTNOTE &&
          fn.targetType === MarkTargetType.HEADING &&
          fn.targetId === arr[revIdx]!.id,
      );
      const headingReferences = marks.filter(
        (fn) =>
          fn.kind === MarkKind.REFERENCE &&
          fn.targetType === MarkTargetType.HEADING &&
          fn.targetId === arr[revIdx]!.id,
      );

      const headingMarks = [...headingFootnotes, ...headingReferences];

      const newHeadingContent = injectMarkLabel(
        mdToHtml(arr[revIdx]!.text).replaceAll(/<p>|<\/p>\n?/gm, ''),
        headingMarks,
        labelMap,
      );

      // NOTE: Heading level starts from 1
      newContent = `\n<h${arr[revIdx]!.level % MAX_HEADING}>${newHeadingContent}</h${arr[revIdx]!.level % MAX_HEADING}>\n${newContent}`;
    });

    return {
      ...verse,
      text: newContent,
    };
  });

  let htmlString = '';
  let currPar = 0;
  // NOTE: Store to add newlines between chapters
  let currentChapterId = '';

  newVerses.forEach((verse) => {
    // NOTE: Add line break between chapters
    if (currentChapterId !== '' && currentChapterId !== verse.chapterId) {
      htmlString += '\n\n<hr>\n\n';
    }

    currentChapterId = verse.chapterId;

    if (verse.paragraphNumber > currPar) {
      htmlString += `\n\n${verse.text}`;
    } else {
      htmlString += ` ${verse.text}`;
    }

    currPar = verse.paragraphNumber;
  });

  htmlString += '<hr>\n\n<ol>';

  let fnSection = '';

  marks.sort((a, b) => a.kind - b.kind || a.sortOrder - b.sortOrder);

  marks.forEach((footnote) => {
    if (footnote.kind === MarkKind.FOOTNOTE) {
      fnSection += `<li id="fn-${footnote.sortOrder + 1}-${footnote.chapterId}"><p>${mdToHtml(footnote.content).replaceAll(/<p>|<\/p>\n?/gm, '')} [<a href="#fnref-${footnote.sortOrder + 1}-${footnote.chapterId}">${footnote.sortOrder + 1}</a>]</p></li>\n\n`;
    } else if (footnote.kind === MarkKind.REFERENCE) {
      fnSection += `<li id="fn-${footnote.sortOrder + 1}@-${footnote.chapterId}"><p>${mdToHtml(footnote.content).replaceAll(/<p>|<\/p>\n?/gm, '')} [<a hfootnote="#fnfootnote-${footnote.sortOrder + 1}@-${footnote.chapterId}">${footnote.sortOrder + 1}@</a>]</p></li>\n\n`;
    }
  });

  const fnLines = fnSection.split('\n\n');

  // NOTE: Remove duplicate footnotes and references
  const uniqueFnLines = uniq(fnLines);

  htmlString += uniqueFnLines.join('\n\n');

  htmlString += '</ol>';

  // NOTE: Clean up the redundant newlines
  htmlString = htmlString.replaceAll(/\n{3,}/gm, '\n\n');
  htmlString = htmlString.trim();

  return htmlString;
};

export { injectMarkLabel, processVerseMd, processVerseHtml };
