import type {
  BookFootnote,
  BookHeading,
  BookReference,
  BookVerse,
  PsalmMetadata,
} from '@v-bible/types';
import showdown from 'showdown';

const MAX_HEADING = 6;

type MapNote = {
  chapterId: string;
  position: number;
  order: number;
  type: 'footnote' | 'reference';
};

const processFootnoteAndRef = (
  str: string,
  footnotes: BookFootnote[],
  refs: BookReference[],
  fnLabel: (order: number, chapterId: string) => string,
  refLabel: (order: number, chapterId: string) => string,
): string => {
  let mappedNote: MapNote[] = [];

  mappedNote = [
    ...mappedNote,
    ...footnotes.map((f) => ({
      chapterId: f.chapterId,
      position: f.position,
      order: f.order,
      type: 'footnote' as const,
    })),
  ];

  mappedNote = [
    ...mappedNote,
    ...refs.flatMap((r) => {
      if (r.position) {
        return [
          {
            chapterId: r.chapterId,
            position: r.position,
            order: r.order,
            type: 'reference' as const,
          },
        ];
      }

      return [];
    }),
  ];

  // NOTE: Sort the footnotes and refs in descending order so when we add
  // footnote content, the position of the next footnote will not be affected
  mappedNote = mappedNote.toSorted((a, b) => b.position - a.position);

  mappedNote.forEach((note) => {
    let newRefLabel = fnLabel(note.order + 1, note.chapterId);

    if (note.type === 'reference') {
      // NOTE: Must match with corresponding footnote label
      newRefLabel = refLabel(note.order + 1, note.chapterId);
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
  verses: BookVerse[],
  footnotes: BookFootnote[],
  headings: BookHeading[],
  refs: BookReference[],
  psalms: PsalmMetadata[],
): string => {
  verses.forEach((verse) => {
    const verseFootnotes = footnotes.filter((fn) => fn.verseId === verse.id);
    const verseHeadings = headings.filter((h) => h.verseId === verse.id);
    const verseRefs = refs.filter((r) => r.verseId === verse.id);

    verse.content = processFootnoteAndRef(
      verse.content,
      verseFootnotes,
      verseRefs,
      fnMdLabel,
      refMdLabel,
    );

    // NOTE: Add verse number only to the first verse
    if (verse.order === 0) {
      verse.content = `<sup><b>${verse.number}</b></sup> ${verse.content}`;
    }

    if (verse.isPoetry) {
      verse.content = `\n> ${verse.content} \n>`;
    }

    // NOTE: Add the Psalm title to the first verse
    if (
      verse.order === 0 &&
      verse.parNumber === 0 &&
      verse.parIndex === 0 &&
      psalms.length !== 0
    ) {
      psalms.forEach((psalm) => {
        if (psalm.chapterId === verse.chapterId) {
          verse.content = `*${psalm.title}*\n${verse.content}`;
        }
      });
    }

    verseHeadings.forEach((vHeading, idx, arr) => {
      const revIdx = verseHeadings.length - idx - 1;

      const headingFootnotes = footnotes.filter(
        (fn) => fn.headingId === arr[revIdx]!.id,
      );

      const headingRefs = refs.filter((r) => r.headingId === arr[revIdx]!.id);

      const newHeadingContent = processFootnoteAndRef(
        arr[revIdx]!.content,
        headingFootnotes,
        headingRefs,
        fnMdLabel,
        refMdLabel,
      );

      // NOTE: Heading level starts from 1
      verse.content = `\n${'#'.repeat(arr[revIdx]!.level % MAX_HEADING)} ${newHeadingContent}\n${verse.content}`;
    });
  });

  let mdString = '';
  let currPar = 0;
  // NOTE: Store to add newlines between chapters
  let currentChapterId = '';

  verses.forEach((verse) => {
    // NOTE: Add line break between chapters
    if (currentChapterId !== '' && currentChapterId !== verse.chapterId) {
      mdString += '\n\n---\n\n';
    }

    currentChapterId = verse.chapterId;

    if (verse.parNumber > currPar) {
      mdString += `\n\n${verse.content}`;
    } else {
      mdString += ` ${verse.content}`;
    }

    currPar = verse.parNumber;
  });

  mdString += '\n\n';

  footnotes.forEach((footnote) => {
    mdString += `[^${footnote.order + 1}-${footnote.chapterId}]: ${footnote.content}\n`;
  });

  refs.forEach((ref) => {
    if (ref.position) {
      mdString += `[^${ref.order + 1}@-${ref.chapterId}]: ${ref.content}\n`;
    }
  });

  // NOTE: Clean up the blockquote redundant characters
  mdString = mdString.replaceAll(/>\n+>/, '>\n>');
  mdString = mdString.replaceAll('>\n\n', '\n');
  // NOTE: Clean up the redundant newlines
  mdString = mdString.replaceAll(/\n{3,}/, '\n\n');
  mdString = mdString.trim();

  return mdString;
};

const mdToHtml = (md: string) => {
  const converter = new showdown.Converter();

  return converter.makeHtml(md);
};

const processVerseHtml = (
  verses: BookVerse[],
  footnotes: BookFootnote[],
  headings: BookHeading[],
  refs: BookReference[],
  psalms: PsalmMetadata[],
): string => {
  verses.forEach((verse) => {
    const verseFootnotes = footnotes.filter((fn) => fn.verseId === verse.id);
    const verseHeadings = headings.filter((h) => h.verseId === verse.id);
    const verseRefs = refs.filter((r) => r.verseId === verse.id);

    verse.content = processFootnoteAndRef(
      verse.content,
      verseFootnotes,
      verseRefs,
      fnHtmlLabel,
      refHtmlLabel,
    );

    // NOTE: Add verse number only to the first verse
    if (verse.order === 0) {
      verse.content = `<sup><b>${verse.number}</b></sup> ${verse.content}`;
    }

    if (verse.isPoetry) {
      verse.content = `\n<blockquote>${verse.content}</blockquote>\n`;
    }

    // NOTE: Add the Psalm title to the first verse
    if (
      verse.order === 0 &&
      verse.parNumber === 0 &&
      verse.parIndex === 0 &&
      psalms.length !== 0
    ) {
      psalms.forEach((psalm) => {
        if (psalm.chapterId === verse.chapterId) {
          verse.content = `<i>${psalm.title}</i>\n${verse.content}`;
        }
      });
    }

    verseHeadings.forEach((vHeading, idx, arr) => {
      const revIdx = verseHeadings.length - idx - 1;

      const headingFootnotes = footnotes.filter(
        (fn) => fn.headingId === arr[revIdx]!.id,
      );

      const headingRefs = refs.filter((r) => r.headingId === arr[revIdx]!.id);

      const newHeadingContent = processFootnoteAndRef(
        arr[revIdx]!.content,
        headingFootnotes,
        headingRefs,
        fnMdLabel,
        refMdLabel,
      );

      // NOTE: Heading level starts from 1
      verse.content = `\n<h${arr[revIdx]!.level % MAX_HEADING}>${newHeadingContent}\n${verse.content}</h${arr[revIdx]!.level % MAX_HEADING}>`;
    });
  });

  let htmlString = '';
  let currPar = 0;
  // NOTE: Store to add newlines between chapters
  let currentChapterId = '';

  verses.forEach((verse) => {
    // NOTE: Add line break between chapters
    if (currentChapterId !== '' && currentChapterId !== verse.chapterId) {
      htmlString += '\n\n<hr>\n\n';
    }

    currentChapterId = verse.chapterId;

    if (verse.parNumber > currPar) {
      htmlString += `\n\n${verse.content}`;
    } else {
      htmlString += ` ${verse.content}`;
    }

    currPar = verse.parNumber;
  });

  htmlString += '<hr>\n\n<ol>';

  footnotes.forEach((footnote) => {
    htmlString += `<li id="fn-${footnote.order + 1}-${footnote.chapterId}"><p>${footnote.content} [<a href="#fnref-${footnote.order + 1}-${footnote.chapterId}">${footnote.order + 1}</a>]</p></li>`;
  });

  refs.forEach((ref) => {
    if (ref.position) {
      htmlString += `<li id="fn-${ref.order + 1}@-${ref.chapterId}"><p>${ref.content} [<a href="#fnref-${ref.order + 1}@-${ref.chapterId}">${ref.order + 1}@</a>]</p></li>`;
    }
  });

  htmlString += '</ol>';

  htmlString = htmlString.trim();

  htmlString = mdToHtml(htmlString);

  return htmlString;
};

export { processVerseMd, processVerseHtml };
