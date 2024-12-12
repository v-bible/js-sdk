type VerseInfo = {
  number: number;
  order: number[];
};

type VerseRange = {
  from: VerseInfo;
  to: VerseInfo;
};

type ParsedReference = {
  bookCode: string;
  chapterNum: number;
} & VerseRange;

const errFailedToParseVerseNum = new Error('failed to parse verse number');
const errFailedToNormalizeVerseQuery = new Error(
  'failed to normalize verse query',
);
const errMissingBookCode = new Error('missing book code');

const INVALID_STRING_FORMAT_ERROR = '%error%';

// NOTE: "*" will be used as a wildcard for verse number, and parsed as -1.
const reVerse =
  /^(?<verseNum>\d+)(?<verseOrder>[a-z]*)$|^(?<verseWildcard>\*)$/;
const reVerseRange = /(?<fromVerse>[a-zA-Z0-9*]+)(-(?<toVerse>[a-zA-Z0-9*]+))?/;
// NOTE: Only allow "*" in the first verse range right after chapNum
// NOTE: It's also match numbers only queries, so MAKE SURE it is
// chapter-split first!
const reVerseQuery =
  /(?<chapNum>\d+)(?<verseQuery>(,|:)[a-zA-Z0-9*]+(-[a-zA-Z0-9*]+)?(\s?(\.|,)\s?[a-zA-Z0-9]+(-[a-zA-Z0-9]+)?)*)?;?/;
const reChapRangeEu =
  /(?<fromChap>\d+),(?<fromVerse>[a-zA-Z0-9*]+)(-[a-zA-Z0-9*]+)?;--(?<toChap>\d+),([a-zA-Z0-9*]+-)?(?<toVerse>[a-zA-Z0-9*]+);?/;
const reNormalizedVerseQuery =
  /(?<chapNum>\d+)(:|,)(?<fromVerse>[a-zA-Z0-9*]+)-(?<toVerse>[a-zA-Z0-9*]+);?/;
const reNormalizedQueryEu = /^(\d+,[a-zA-Z0-9*]+-[a-zA-Z0-9*]+;?)+$/;
const reNormalizedQueryUs = /^(\d+:[a-zA-Z0-9*]+-[a-zA-Z0-9*]+;?)+$/;
// NOTE: For multiple chapters query, like: "John 1,12", the "," is reused.
const reMultipleChapUs = /^\d+(,\d+)*$/;
const reBookCode = /^(\d+\s)?[a-zA-Z0-9]+\s/;

const parseStringToOrder = (str: string): number[] => {
  return [...str].map((s) => {
    return s.charCodeAt(0) - 'a'.charCodeAt(0);
  });
};

const parseVerseNum = (verse: string): VerseInfo => {
  const matches = reVerse.exec(verse.toLowerCase());
  if (!matches?.groups) {
    throw errFailedToParseVerseNum;
  }

  const { verseNum, verseOrder, verseWildcard } = matches.groups;

  let verseNumInt = 0;

  if (verseWildcard === '*') {
    verseNumInt = -1;
  } else {
    const parsedVerseNum = parseInt(verseNum as string, 10);
    if (Number.isNaN(parsedVerseNum)) {
      throw errFailedToParseVerseNum;
    }

    verseNumInt = parsedVerseNum;
  }

  if (!verseOrder) {
    return { number: verseNumInt, order: [-1] };
  }

  const order = parseStringToOrder(verseOrder as string);

  return { number: verseNumInt, order };
};

const normalizeVerseQuery = (query: string): string => {
  const matches = [...query.matchAll(new RegExp(reVerseQuery, 'g'))];

  // eslint-disable-next-line no-restricted-syntax
  for (const match of matches) {
    if (!match.groups) {
      query = query.replace(match[0], INVALID_STRING_FORMAT_ERROR);
      return query;
    }

    const { chapNum } = match.groups;
    const verseQuery = match.groups.verseQuery?.replace(/^,/, '');

    if (Number.isNaN(parseInt(chapNum!, 10))) {
      query = query.replace(match[0], INVALID_STRING_FORMAT_ERROR);
      return query;
    }

    const verses = verseQuery?.split('.');

    let newQuery = '';

    // eslint-disable-next-line no-loop-func
    verses?.forEach((verse) => {
      if (!verse) {
        return;
      }

      const vMatches = reVerseRange.exec(verse);

      if (!vMatches?.groups) {
        query = query.replace(match[0], INVALID_STRING_FORMAT_ERROR);
        return;
      }

      // eslint-disable-next-line prefer-const
      let { fromVerse, toVerse } = vMatches.groups;

      if (!toVerse) {
        toVerse = fromVerse;
      }

      newQuery += `${chapNum},${fromVerse}-${toVerse};`;
    });

    if (!newQuery) {
      query = query.replace(match[0], `${chapNum},*-*;`);
      // eslint-disable-next-line no-continue
      continue;
    }

    query = query.replace(match[0], newQuery);
  }

  return query;
};

const normalizeChapRange = (query: string) => {
  const matches = [...query.matchAll(new RegExp(reChapRangeEu, 'g'))];

  // eslint-disable-next-line no-restricted-syntax
  for (const match of matches) {
    if (!match.groups) {
      return INVALID_STRING_FORMAT_ERROR;
    }

    const {
      fromChap = '',
      fromVerse = '',
      toChap = '',
      toVerse = '',
    } = match.groups;

    try {
      const parsedFromChap = parseVerseNum(fromChap);

      const parsedToChap = parseVerseNum(toChap);

      if (parsedFromChap.number > parsedToChap.number) {
        query = query.replace(match[0], INVALID_STRING_FORMAT_ERROR);
        return query;
      }

      let newQuery = `${parsedFromChap.number},${fromVerse}-*;`;

      for (let i = parsedFromChap.number + 1; i < parsedToChap.number; i += 1) {
        newQuery += `${i},*-*;`;
      }

      newQuery += `${parsedToChap.number},*-${toVerse};`;

      query = query.replace(match[0], newQuery);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      query = query.replace(match[0], INVALID_STRING_FORMAT_ERROR);
    }
  }

  return query;
};

const normalizeQueryEu = (query: string) => {
  let verseQuery = query.replaceAll(' ', '');

  // NOTE: Support using "+" to concatenate multiple verses. E.g.: "John
  // 9:1+12"
  verseQuery = verseQuery.replaceAll('+', '.');

  // NOTE: MUST split by chapters before parse verse query
  const splitChapters = verseQuery.split(';');

  let newQuery = '';

  splitChapters.forEach((vQuery) => {
    newQuery += normalizeVerseQuery(vQuery);
  });

  verseQuery = normalizeChapRange(newQuery);

  verseQuery = verseQuery.replace(/;$/, '');

  if (!reNormalizedQueryEu.test(verseQuery)) {
    throw errFailedToNormalizeVerseQuery;
  }

  return verseQuery;
};

const normalizeQueryUs = (query: string) => {
  let verseQuery = query.replaceAll(' ', '');

  if (reMultipleChapUs.test(verseQuery)) {
    verseQuery = verseQuery.replaceAll(',', ';');
  }

  // NOTE: Support using "+" to concatenate multiple verses. E.g.: "John
  // 9:1+12"
  verseQuery = verseQuery.replaceAll('+', ',');

  verseQuery = verseQuery.replaceAll(',', '.');

  verseQuery = verseQuery.replaceAll(':', ',');

  try {
    // NOTE: We have to convert the chapter separator back to ":" as Us query
    const normalizedQuery = normalizeQueryEu(verseQuery);

    verseQuery = normalizedQuery.replaceAll(',', ':');

    if (!reNormalizedQueryUs.test(verseQuery)) {
      throw errFailedToNormalizeVerseQuery;
    }
  } catch (err) {
    if (err === errFailedToNormalizeVerseQuery) {
      throw err;
    }
  }

  return verseQuery;
};

const parseBiblicalReference = (
  query: string,
  format: 'us' | 'eu',
): ParsedReference[] => {
  if (!reBookCode.test(query)) {
    throw errMissingBookCode;
  }

  const bookCode = query.match(reBookCode)?.[0].trim();
  const verseQuery = query.replace(bookCode!, '').replaceAll(' ', '');

  let normalizedQuery = '';

  if (format === 'us') {
    normalizedQuery = normalizeQueryUs(verseQuery);
  } else if (format === 'eu') {
    normalizedQuery = normalizeQueryEu(verseQuery);
  } else {
    throw errFailedToNormalizeVerseQuery;
  }

  const splitQueries = normalizedQuery.split(';');

  const parsedList: ParsedReference[] = splitQueries.map((vQuery) => {
    const matches = reNormalizedVerseQuery.exec(vQuery);

    if (!matches?.groups) {
      throw errFailedToNormalizeVerseQuery;
    }

    const { chapNum = '', fromVerse = '' } = matches.groups;
    let { toVerse = '' } = matches.groups;

    if (!toVerse) {
      toVerse = fromVerse;
    }

    if (Number.isNaN(parseInt(chapNum, 10))) {
      throw errFailedToNormalizeVerseQuery;
    }

    try {
      const parsedFromVerse = parseVerseNum(fromVerse);
      const parsedToVerse = parseVerseNum(toVerse);

      return {
        bookCode: bookCode!,
        chapterNum: parseInt(chapNum, 10),
        from: parsedFromVerse,
        to: parsedToVerse,
      } satisfies ParsedReference;
    } catch (err) {
      if (err === errFailedToParseVerseNum) {
        throw err;
      }
    }

    return {} as ParsedReference;
  });

  return parsedList;
};

export { parseBiblicalReference };
