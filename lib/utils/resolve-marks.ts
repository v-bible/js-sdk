import type { Mark } from '@v-bible/types';

type ResolveMarksOptions = {
  overlapKeepRight?: boolean;
};

const resolveMarks = (marks: Mark[], options?: ResolveMarksOptions): Mark[] => {
  const defaultOverlapKeepRight = true;

  const { overlapKeepRight = defaultOverlapKeepRight } = options || {};

  if (!marks || marks.length === 0) {
    return [];
  }

  if (marks.length === 1) {
    return marks;
  }

  // Sort annotations by start position (descending) for processing
  const sortedMarks = [...marks].sort((a, b) => b.startOffset - a.startOffset);

  const additionalMarks: Mark[] = [];

  for (let i = 1; i < sortedMarks.length; i += 1) {
    const currMark = sortedMarks[i]!;
    const prevMark = sortedMarks[i - 1]!;

    if (prevMark.startOffset >= currMark.endOffset) {
      // No overlap, continue to next
    } else if (
      prevMark.startOffset >= currMark.startOffset &&
      prevMark.endOffset <= currMark.endOffset &&
      prevMark.startOffset < currMark.endOffset
    ) {
      // Contained case, continue to next
    } else if (
      prevMark.startOffset < currMark.endOffset &&
      prevMark.endOffset > currMark.startOffset
    ) {
      // NOTE: Overlapping case
      // NOTE: If overlapKeepRight is true then we keep "prev" (as right reversed)
      // annotation, update end of the "current" annotation to the start of
      // the "prev" annotation, and push the new inner annotation of "current"
      // annotation to the array

      if (overlapKeepRight) {
        // NOTE: Add the new inner annotation of "current" annotation
        // NOTE: Add before we modify the "current" annotation
        additionalMarks.push({
          ...currMark,
          startOffset: prevMark.startOffset,
          endOffset: currMark.endOffset,
          content: currMark.content.slice(
            prevMark.startOffset - currMark.startOffset,
            currMark.content.length,
          ),
        });

        // Update current annotation to end before overlap
        sortedMarks[i] = {
          ...currMark,
          endOffset: prevMark.startOffset,
          content: currMark.content.slice(
            0,
            prevMark.startOffset - currMark.startOffset,
          ),
        };
      } else {
        // NOTE: If overlapKeepRight is false then we keep "current" annotation,
        // update the start of the "prev" annotation to the end of
        // the "current" annotation, and push the new inner annotation of
        // "prev" annotation to the array

        // NOTE: Add the new inner annotation of "prev" annotation
        // NOTE: Add before we modify the "prev" annotation
        additionalMarks.push({
          ...prevMark,
          startOffset: prevMark.startOffset,
          endOffset: currMark.endOffset,
          content: prevMark.content.slice(
            0,
            currMark.endOffset - prevMark.startOffset,
          ),
        });

        // NOTE: Update prev annotation to start after overlap
        sortedMarks[i - 1] = {
          ...prevMark,
          startOffset: currMark.endOffset,
          content: prevMark.content.slice(
            currMark.endOffset - prevMark.startOffset,
            prevMark.content.length,
          ),
        };
      }
    }
  }

  // NOTE: Return the resolved annotations with additional annotations
  return [...sortedMarks, ...additionalMarks].sort(
    (a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset,
  );
};

export { resolveMarks };
