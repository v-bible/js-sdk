import type { Footnote, Heading, PsalmMetadata, Verse } from '@v-bible/types';
import { uniq } from 'es-toolkit';
import showdown from 'showdown';

const MAX_HEADING = 6;

const processFootnoteAndRef = (
  str: string,
  footnotes: Footnote[],
  fnLabel: (order: number, chapterId: string) => string,
  refLabel: (order: number, chapterId: string) => string,
): string => {
  // NOTE: Sort the footnotes and refs in descending order so when we add
  // footnote content, the position of the next footnote will not be affected
  footnotes.sort((a, b) => {
    return b.position - a.position;
  });

  footnotes.forEach((note) => {
    let newRefLabel = fnLabel(note.sortOrder + 1, note.chapterId);

    if (note.type === 'reference') {
      // NOTE: Must match with corresponding footnote label
      newRefLabel = refLabel(note.sortOrder + 1, note.chapterId);
    }

    if (note.position > str.length) {
      str += newRefLabel;
    } else {
      str =
        str.slice(0, note.position) +
        newRefLabel +
        str.slice(note.position, str.length);
    }
  });

  return str;
};

const fnMdLabel = (order: number, chapterId: string): string => {
  return `[^${order}-${chapterId}]`;
};

const refMdLabel = (order: number, chapterId: string): string => {
  return `[^${order}@-${chapterId}]`;
};

const fnHtmlLabel = (order: number, chapterId: string): string => {
  return `<sup><a href="#fn-${order}-${chapterId}" id="fnref-${order}-${chapterId}">${order}</a></sup>`;
};

const refHtmlLabel = (order: number, chapterId: string): string => {
  return `<sup><a href="#fn-${order}@-${chapterId}" id="fnref-${order}@-${chapterId}">${order}@</a></sup>`;
};

const processVerseMd = (
  verses: Verse[],
  footnotes: Footnote[],
  headings: Heading[],
  psalms: PsalmMetadata[],
): string => {
  const newVerses = verses.map((verse) => {
    const verseFootnotes = footnotes.filter((fn) => fn.verseId === verse.id);
    const verseHeadings = headings.filter((h) => h.verseId === verse.id);

    let newContent = verse.text;

    newContent = processFootnoteAndRef(
      newContent,
      verseFootnotes,
      fnMdLabel,
      refMdLabel,
    );

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

      const headingFootnotes = footnotes.filter(
        (fn) => fn.headingId === arr[revIdx]!.id,
      );

      const newHeadingContent = processFootnoteAndRef(
        arr[revIdx]!.text,
        headingFootnotes,
        fnMdLabel,
        refMdLabel,
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

  footnotes.sort(
    (a, b) => a.type.localeCompare(b.type) || a.sortOrder - b.sortOrder,
  );

  footnotes.forEach((footnote) => {
    if (footnote.type === 'footnote') {
      fnSection += `[^${footnote.sortOrder + 1}-${footnote.chapterId}]: ${footnote.text}\n\n`;
    } else {
      fnSection += `[^${footnote.sortOrder + 1}@-${footnote.chapterId}]: ${footnote.text}\n\n`;
    }
  });

  const fnLines = fnSection.split('\n\n');

  // NOTE: Remove duplicate footnotes and references
  const uniqueFnLines = uniq(fnLines);

  mdString += uniqueFnLines.join('\n\n');

  // NOTE: Clean up the blockquote redundant characters
  mdString = mdString.replaceAll(/>\n+>/gm, '>\n>');
  mdString = mdString.replaceAll('>\n\n', '\n');
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
  footnotes: Footnote[],
  headings: Heading[],
  psalms: PsalmMetadata[],
): string => {
  const newVerses = verses.map((verse) => {
    const verseFootnotes = footnotes.filter((fn) => fn.verseId === verse.id);
    const verseHeadings = headings.filter((h) => h.verseId === verse.id);

    let newContent = verse.text;

    newContent = processFootnoteAndRef(
      mdToHtml(newContent).replaceAll(/<p>|<\/p>\n?/gm, ''),
      verseFootnotes,
      fnHtmlLabel,
      refHtmlLabel,
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

      const headingFootnotes = footnotes.filter(
        (fn) => fn.headingId === arr[revIdx]!.id,
      );

      const newHeadingContent = processFootnoteAndRef(
        mdToHtml(arr[revIdx]!.text).replaceAll(/<p>|<\/p>\n?/gm, ''),
        headingFootnotes,
        fnHtmlLabel,
        refHtmlLabel,
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

  footnotes.sort(
    (a, b) => a.type.localeCompare(b.type) || a.sortOrder - b.sortOrder,
  );

  footnotes.forEach((footnote) => {
    if (footnote.type === 'footnote') {
      fnSection += `<li id="fn-${footnote.sortOrder + 1}-${footnote.chapterId}"><p>${mdToHtml(footnote.text).replaceAll(/<p>|<\/p>\n?/gm, '')} [<a href="#fnref-${footnote.sortOrder + 1}-${footnote.chapterId}">${footnote.sortOrder + 1}</a>]</p></li>\n\n`;
    } else {
      fnSection += `<li id="fn-${footnote.sortOrder + 1}@-${footnote.chapterId}"><p>${mdToHtml(footnote.text).replaceAll(/<p>|<\/p>\n?/gm, '')} [<a hfootnote="#fnfootnote-${footnote.sortOrder + 1}@-${footnote.chapterId}">${footnote.sortOrder + 1}@</a>]</p></li>\n\n`;
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

export { processVerseMd, processVerseHtml };
