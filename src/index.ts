import { writeFileSync } from 'fs';
import {
  addDays,
  compareAsc,
  eachDayOfInterval,
  format,
  isBefore,
  isEqual,
  isSunday,
  isWithinInterval,
  nextMonday,
  nextSaturday,
  nextSunday,
  parse,
  previousSunday,
  previousThursday,
  previousWednesday,
  subDays,
  subWeeks,
} from 'date-fns';
import { groupBy } from 'es-toolkit';
import { getEaster } from 'node_modules/@mrspade/moontool/src/index';
import adventSundayData from '@/static/calendar/sunday/1_advent.json';
import christmasSundayData from '@/static/calendar/sunday/2_christmas.json';
import lentSundayData from '@/static/calendar/sunday/3_lent.json';
import triduumSundayData from '@/static/calendar/sunday/4_triduum.json';
import OTSundayData from '@/static/calendar/sunday/5_ot.json';
import adventWeekdayData from '@/static/calendar/weekdays/1_advent.json';
import christmasWeekdayData from '@/static/calendar/weekdays/2_christmas.json';
import lentWeekdayData from '@/static/calendar/weekdays/3_lent.json';
import easterWeekdayData from '@/static/calendar/weekdays/4_easter.json';
import OTWeekdayData from '@/static/calendar/weekdays/5_ot.json';

export type CalendarEntry = {
  firstReading: string | string[];
  psalm: string | string[];
  secondReading: string | string[];
  gospel: string | string[];
  yearCycle: string;
  yearNumber: string;
  season: string;
  weekdayType: string;
  weekOrder: string;
  periodOfDay: string;
};

export type Options = {
  isEpiphanyOn6thJan: boolean;
  isAscensionOfTheLordOn40th: boolean;
  destPath: string;
};

const YEAR_CYCLE_MAP: Record<string, string> = {
  '0': 'C',
  '1': 'A',
  '2': 'B',
};

const WEEKDAY_MAP: Record<string, string> = {
  '0': 'sunday',
  '1': 'monday',
  '2': 'tuesday',
  '3': 'wednesday',
  '4': 'thursday',
  '5': 'friday',
  '6': 'saturday',
};

const generateAdvent = (year: number) => {
  const yearCycle = YEAR_CYCLE_MAP[year % 3];

  const christmasEve = new Date(year - 1, 12 - 1, 24);
  const christmasDay = new Date(year - 1, 12 - 1, 25);

  // NOTE: Advent 4 is always the Sunday before Christmas, unless Advent 4 is on
  // Dec 24th, the morning is Advent 4, and then the afternoon is Christmas
  // Eve
  const advent4 = isSunday(new Date(year - 1, 12 - 1, 24))
    ? new Date(year - 1, 12 - 1, 24)
    : previousSunday(christmasDay);

  const advent1 = subWeeks(advent4, 3);

  let calendar: CalendarEntry[][] = [];

  let weekOrder = 0;

  eachDayOfInterval({
    start: advent1,
    end: christmasEve,
  }).forEach((day) => {
    if (isSunday(day)) {
      weekOrder += 1;

      calendar = [
        ...calendar,
        adventSundayData
          .filter(
            (d) => +d.weekOrder === weekOrder && d.yearCycle === yearCycle,
          )
          .map((d) => {
            return {
              ...d,
              date: format(day, 'dd/MM/yyyy'),
            };
          }),
      ];

      return;
    }

    let adventWeekday = adventWeekdayData.filter(
      (d) =>
        +d.weekOrder === weekOrder &&
        d.weekdayType === WEEKDAY_MAP[day.getDay()],
    );

    // NOTE: Pre-Christmas weekdays
    if (
      isWithinInterval(day, {
        start: new Date(year - 1, 12 - 1, 17),
        end: christmasEve,
      })
    ) {
      adventWeekday = adventWeekdayData.filter(
        (d) =>
          d.weekOrder === 'preChristmas' &&
          d.weekdayType === format(day, 'dd/MM'),
      );
    }

    calendar = [
      ...calendar,
      adventWeekday.map((d) => {
        return {
          ...d,
          date: format(day, 'dd/MM/yyyy'),
        };
      }),
    ];
  });

  return calendar;
};

const generateChristmas = (year: number, isEpiphanyOn6thJan: boolean) => {
  const yearCycle = YEAR_CYCLE_MAP[year % 3];
  const christmasDay = new Date(year - 1, 12 - 1, 25);

  // NOTE: The Epiphany is always on Jan 6th, or on the first Sunday after Jan
  // 1st
  const defaultEpiphany = new Date(year, 1 - 1, 6);
  const alternativeEpiphany = nextSunday(new Date(year, 1 - 1, 1));

  const epiphany = isEpiphanyOn6thJan ? defaultEpiphany : alternativeEpiphany;

  let calendar: CalendarEntry[][] = [];

  calendar = [
    ...calendar,
    christmasSundayData
      .filter((d) => d.weekOrder === 'nativityOfTheLord')
      .map((d) => {
        return {
          ...d,
          date: format(christmasDay, 'dd/MM/yyyy'),
        };
      }),
  ];

  eachDayOfInterval({
    start: new Date(year - 1, 12 - 1, 26),
    end: subDays(epiphany, 1),
  }).forEach((day) => {
    calendar = [
      ...calendar,
      christmasWeekdayData
        .filter((d) => d.weekdayType === format(day, 'dd/MM'))
        .map((d) => {
          return {
            ...d,
            date: format(day, 'dd/MM/yyyy'),
          };
        }),
    ];
  });

  // NOTE: If Christmas Day is on a Sunday, then the Feast of the Holy Family
  // celebrated on Dec 30th, else it is celebrated on the Sunday after Christmas
  if (isSunday(christmasDay)) {
    calendar = [
      ...calendar,
      christmasSundayData
        .filter(
          (d) => d.weekOrder === 'theHolyFamily' && d.yearCycle === yearCycle,
        )
        .map((d) => {
          return {
            ...d,
            date: format(new Date(year - 1, 12 - 1, 30), 'dd/MM/yyyy'),
          };
        }),
    ];
  } else {
    calendar = [
      ...calendar,
      christmasSundayData
        .filter(
          (d) => d.weekOrder === 'theHolyFamily' && d.yearCycle === yearCycle,
        )
        .map((d) => {
          return {
            ...d,
            date: format(nextSunday(christmasDay), 'dd/MM/yyyy'),
          };
        }),
    ];
  }

  // NOTE: The Solemnity of Mary, Mother of God is always on Jan 1st
  calendar = [
    ...calendar,
    christmasSundayData
      .filter((d) => d.weekOrder === 'maryMotherOfGod')
      .map((d) => {
        return {
          ...d,
          date: format(new Date(year, 1 - 1, 1), 'dd/MM/yyyy'),
        };
      }),
  ];

  // NOTE: 2nd Sunday after Christmas only when Epiphany is on Jan 6th and
  // before the Epiphany
  if (isEpiphanyOn6thJan) {
    const secondSundayAfterChristmas = addDays(nextSunday(christmasDay), 7);

    if (isBefore(secondSundayAfterChristmas, epiphany)) {
      calendar = [
        ...calendar,
        christmasSundayData
          .filter((d) => d.weekOrder === '2ndAfterChristmas')
          .map((d) => {
            return {
              ...d,
              date: format(secondSundayAfterChristmas, 'dd/MM/yyyy'),
            };
          }),
      ];
    }
  }

  // NOTE: The Epiphany of the Lord
  calendar = [
    ...calendar,
    christmasSundayData
      .filter((d) => d.weekOrder === 'theEpiphanyOfTheLord')
      .map((d) => {
        return {
          ...d,
          date: format(epiphany, 'dd/MM/yyyy'),
        };
      }),
  ];

  // NOTE: If the Epiphany is on 7th or 8th Jan, then the Baptism of the Lord is
  // on the following Monday, else it is on the following Sunday
  const baptismOfTheLord =
    !isEpiphanyOn6thJan &&
    (isEqual(epiphany, new Date(year, 1 - 1, 7)) ||
      isEqual(epiphany, new Date(year, 1 - 1, 8)))
      ? nextMonday(epiphany)
      : nextSunday(epiphany);

  // NOTE: Post Epiphany weekdays
  const startPostEpiphany = addDays(epiphany, 1);
  const endPostEpiphany = subDays(baptismOfTheLord, 1);

  // NOTE: Sometimes first Sunday of Jan 6th can be early as Jan 7th so the
  // start and end is not correct. Also no calculate post Epiphany weekdays if
  // Epiphany is on Jan 7th or Jan 8th
  if (compareAsc(startPostEpiphany, endPostEpiphany) !== 1) {
    eachDayOfInterval({
      start: startPostEpiphany,
      end: endPostEpiphany,
    }).forEach((day) => {
      if (isEpiphanyOn6thJan) {
        calendar = [
          ...calendar,
          christmasWeekdayData
            .filter(
              (d) =>
                d.weekOrder === 'postEpiphanyFromJan6' &&
                d.weekdayType === format(day, 'dd/MM'),
            )
            .map((d) => {
              return {
                ...d,
                date: format(day, 'dd/MM/yyyy'),
              };
            }),
        ];
      } else if (
        !isEpiphanyOn6thJan &&
        (!isEqual(epiphany, new Date(year, 1 - 1, 7)) ||
          !isEqual(epiphany, new Date(year, 1 - 1, 8)))
      ) {
        calendar = [
          ...calendar,
          christmasWeekdayData
            .filter(
              (d) =>
                d.weekOrder === 'postEpiphany' &&
                d.weekdayType === WEEKDAY_MAP[day.getDay()],
            )
            .map((d) => {
              return {
                ...d,
                date: format(day, 'dd/MM/yyyy'),
              };
            }),
        ];
      }
    });
  }

  calendar = [
    ...calendar,
    christmasSundayData
      .filter(
        (d) => d.weekOrder === 'baptismOfTheLord' && d.yearCycle === yearCycle,
      )
      .map((d) => {
        return {
          ...d,
          date: format(baptismOfTheLord, 'dd/MM/yyyy'),
        };
      }),
  ];

  return calendar;
};

const generateOT = (year: number, isEpiphanyOn6thJan: boolean) => {
  const yearCycle = YEAR_CYCLE_MAP[year % 3];
  const yearNumber = year % 2 === 0 ? 2 : 1;

  // NOTE: The Epiphany is always on Jan 6th, or on the first Sunday after Jan
  // 1st
  const defaultEpiphany = new Date(year, 1 - 1, 6);
  const alternativeEpiphany = nextSunday(new Date(year, 1 - 1, 1));

  const epiphany = isEpiphanyOn6thJan ? defaultEpiphany : alternativeEpiphany;

  const baptismOfTheLord =
    !isEpiphanyOn6thJan &&
    (isEqual(epiphany, new Date(year, 1 - 1, 7)) ||
      isEqual(epiphany, new Date(year, 1 - 1, 8)))
      ? nextMonday(epiphany)
      : nextSunday(epiphany);

  const easterDay = getEaster(year);
  // NOTE: The Easter and Ash Wednesday in years 2038, 2045, 2049 are wrong,
  // from https://www.liturgyoffice.org.uk/Calendar/Info/2050.pdf
  const ashWednesday = subDays(subWeeks(easterDay, 6), 4);

  const pentecost = addDays(easterDay, 49);

  const christmasDay = new Date(year, 12 - 1, 25);

  // NOTE: Advent 4 is always the Sunday before Christmas, unless Advent 4 is on
  // Dec 24th, the morning is Advent 4, and then the afternoon is Christmas
  // Eve
  const advent4 = isSunday(new Date(year, 12 - 1, 24))
    ? new Date(year - 1, 12 - 1, 24)
    : previousSunday(christmasDay);

  const advent1 = subWeeks(advent4, 3);

  let calendar: CalendarEntry[][] = [];

  // NOTE: IF the Baptism of the Lord is on Monday then count as the first week
  let weekOrder = isSunday(baptismOfTheLord) ? 0 : 1;

  // NOTE: First OT
  eachDayOfInterval({
    start: addDays(baptismOfTheLord, 1),
    end: subDays(ashWednesday, 1),
  }).forEach((day) => {
    if (isSunday(day)) {
      weekOrder += 1;

      calendar = [
        ...calendar,
        OTSundayData.filter(
          (d) => +d.weekOrder === weekOrder && d.yearCycle === yearCycle,
        ).map((d) => {
          return {
            ...d,
            date: format(day, 'dd/MM/yyyy'),
          };
        }),
      ];

      return;
    }

    const weekday = OTWeekdayData.filter(
      (d) =>
        +d.weekOrder === weekOrder &&
        d.weekdayType === WEEKDAY_MAP[day.getDay()] &&
        +d.yearNumber === yearNumber,
    );

    calendar = [
      ...calendar,
      weekday.map((d) => {
        return {
          ...d,
          date: format(day, 'dd/MM/yyyy'),
        };
      }),
    ];
  });

  // NOTE: Second OT
  // NOTE: Because 2nd Ordinary Time starts from Monday so we have to plus 1 here
  weekOrder += 1;

  eachDayOfInterval({
    start: addDays(pentecost, 1),
    end: subDays(advent1, 1),
  }).forEach((day) => {
    if (isSunday(day)) {
      weekOrder += 1;

      calendar = [
        ...calendar,
        OTSundayData.filter(
          (d) => +d.weekOrder === weekOrder && d.yearCycle === yearCycle,
        ).map((d) => {
          return {
            ...d,
            date: format(day, 'dd/MM/yyyy'),
          };
        }),
      ];

      return;
    }

    const weekday = OTWeekdayData.filter(
      (d) =>
        +d.weekOrder === weekOrder &&
        d.weekdayType === WEEKDAY_MAP[day.getDay()] &&
        +d.yearNumber === yearNumber,
    );

    calendar = [
      ...calendar,
      weekday.map((d) => {
        return {
          ...d,
          date: format(day, 'dd/MM/yyyy'),
        };
      }),
    ];
  });

  return calendar;
};

const generateLent = (year: number) => {
  const yearCycle = YEAR_CYCLE_MAP[year % 3];

  const easterDay = getEaster(year);
  // NOTE: The Easter and Ash Wednesday in years 2038, 2045, 2049 are wrong,
  // from https://www.liturgyoffice.org.uk/Calendar/Info/2050.pdf
  const ashWednesday = subDays(subWeeks(easterDay, 6), 4);

  const chrismMass = previousThursday(easterDay);

  let calendar: CalendarEntry[][] = [];

  calendar = [
    ...calendar,
    lentWeekdayData
      .filter((d) => d.weekdayType === 'ashWednesday')
      .map((d) => {
        return {
          ...d,
          date: format(ashWednesday, 'dd/MM/yyyy'),
        };
      }),
  ];

  calendar = [
    ...calendar,
    lentWeekdayData
      .filter((d) => d.weekdayType === 'chrismMass')
      .map((d) => {
        return {
          ...d,
          date: format(chrismMass, 'dd/MM/yyyy'),
        };
      }),
  ];

  // NOTE: Post Ash Wednesday weekdays
  eachDayOfInterval({
    start: addDays(ashWednesday, 1),
    end: subDays(nextSunday(ashWednesday), 1),
  }).forEach((day) => {
    calendar = [
      ...calendar,
      lentWeekdayData
        .filter(
          (d) =>
            d.weekOrder === 'postAshWednesday' &&
            d.weekdayType === WEEKDAY_MAP[day.getDay()],
        )
        .map((d) => {
          return {
            ...d,
            date: format(day, 'dd/MM/yyyy'),
          };
        }),
    ];
  });

  let weekOrder = 0;

  eachDayOfInterval({
    start: nextSunday(ashWednesday),
    end: previousSunday(easterDay),
  }).forEach((day) => {
    if (isSunday(day)) {
      weekOrder += 1;

      // NOTE: Palm Sunday
      if (weekOrder === 6) {
        calendar = [
          ...calendar,
          lentSundayData
            .filter(
              (d) => d.weekOrder === 'palmSunday' && d.yearCycle === yearCycle,
            )
            .map((d) => {
              return {
                ...d,
                date: format(day, 'dd/MM/yyyy'),
              };
            }),
        ];
      } else {
        calendar = [
          ...calendar,
          lentSundayData
            .filter(
              (d) => +d.weekOrder === weekOrder && d.yearCycle === yearCycle,
            )
            .map((d) => {
              return {
                ...d,
                date: format(day, 'dd/MM/yyyy'),
              };
            }),
        ];
      }

      return;
    }

    calendar = [
      ...calendar,
      lentWeekdayData
        .filter(
          (d) =>
            +d.weekOrder === weekOrder &&
            d.weekdayType === WEEKDAY_MAP[day.getDay()],
        )
        .map((d) => {
          return {
            ...d,
            date: format(day, 'dd/MM/yyyy'),
          };
        }),
    ];
  });

  // NOTE: Holy week
  eachDayOfInterval({
    start: addDays(previousSunday(easterDay), 1),
    end: previousWednesday(easterDay),
  }).forEach((day) => {
    calendar = [
      ...calendar,
      lentWeekdayData
        .filter(
          (d) =>
            d.weekOrder === 'holyWeek' &&
            d.weekdayType === WEEKDAY_MAP[day.getDay()],
        )
        .map((d) => {
          return {
            ...d,
            date: format(day, 'dd/MM/yyyy'),
          };
        }),
    ];
  });

  return calendar;
};

const generateEaster = (year: number, isAscensionOfTheLordOn40th: boolean) => {
  const yearCycle = YEAR_CYCLE_MAP[year % 3];

  const easterDay = getEaster(year);

  const holyThursday = subDays(easterDay, 3);
  const goodFriday = subDays(easterDay, 2);
  const easterVirgil = subDays(easterDay, 1);

  const pentecost = addDays(easterDay, 49);

  const ascensionOfTheLord = addDays(easterDay, 39);

  let calendar: CalendarEntry[][] = [];

  calendar = [
    ...calendar,
    triduumSundayData
      .filter((d) => d.weekOrder === 'holyThursday')
      .map((d) => {
        return {
          ...d,
          date: format(holyThursday, 'dd/MM/yyyy'),
        };
      }),
  ];

  calendar = [
    ...calendar,
    triduumSundayData
      .filter((d) => d.weekOrder === 'goodFriday')
      .map((d) => {
        return {
          ...d,
          date: format(goodFriday, 'dd/MM/yyyy'),
        };
      }),
  ];

  calendar = [
    ...calendar,
    triduumSundayData
      .filter(
        (d) =>
          d.weekOrder === 'easter' &&
          d.periodOfDay === 'theEasterVirgil' &&
          d.yearCycle === yearCycle,
      )
      .map((d) => {
        return {
          ...d,
          date: format(easterVirgil, 'dd/MM/yyyy'),
        };
      }),
  ];

  calendar = [
    ...calendar,
    triduumSundayData
      .filter((d) => d.weekOrder === 'easter' && d.periodOfDay === 'day')
      .map((d) => {
        return {
          ...d,
          date: format(easterDay, 'dd/MM/yyyy'),
        };
      }),
  ];

  // NOTE: Octave of Easter weekdays
  eachDayOfInterval({
    start: nextMonday(easterDay),
    end: nextSaturday(easterDay),
  }).forEach((day) => {
    calendar = [
      ...calendar,
      easterWeekdayData
        .filter(
          (d) =>
            d.weekOrder === 'octaveOfEaster' &&
            d.weekdayType === WEEKDAY_MAP[day.getDay()],
        )
        .map((d) => {
          return {
            ...d,
            date: format(day, 'dd/MM/yyyy'),
          };
        }),
    ];
  });

  // NOTE: Start with the Monday after Easter Sunday so counted as 1
  let weekOrder = 1;

  eachDayOfInterval({
    start: nextSunday(easterDay),
    end: pentecost,
  }).forEach((day) => {
    if (isSunday(day)) {
      weekOrder += 1;

      // NOTE: Pentecost Sunday
      if (weekOrder === 8) {
        calendar = [
          ...calendar,
          triduumSundayData
            .filter(
              (d) => d.weekOrder === 'pentecost' && d.yearCycle === yearCycle,
            )
            .map((d) => {
              return {
                ...d,
                date: format(day, 'dd/MM/yyyy'),
              };
            }),
        ];
      } else if (!isAscensionOfTheLordOn40th && weekOrder === 7) {
        // NOTE: The Ascension of the Lord is celebrated on the 7th Sunday of
        // Easter in same places
        calendar = [
          ...calendar,
          triduumSundayData
            .filter(
              (d) =>
                d.weekOrder === 'ascensionOfTheLord' &&
                d.yearCycle === yearCycle,
            )
            .map((d) => {
              return {
                ...d,
                date: format(day, 'dd/MM/yyyy'),
              };
            }),
        ];
      } else {
        calendar = [
          ...calendar,
          triduumSundayData
            .filter(
              (d) => +d.weekOrder === weekOrder && d.yearCycle === yearCycle,
            )
            .map((d) => {
              return {
                ...d,
                date: format(day, 'dd/MM/yyyy'),
              };
            }),
        ];
      }

      return;
    }

    calendar = [
      ...calendar,
      easterWeekdayData
        .filter(
          (d) =>
            +d.weekOrder === weekOrder &&
            d.weekdayType === WEEKDAY_MAP[day.getDay()],
        )
        .map((d) => {
          return {
            ...d,
            date: format(day, 'dd/MM/yyyy'),
          };
        }),
    ];
  });

  if (isAscensionOfTheLordOn40th) {
    calendar = [
      ...calendar,
      triduumSundayData
        .filter(
          (d) =>
            d.weekOrder === 'ascensionOfTheLord' && d.yearCycle === yearCycle,
        )
        .map((d) => {
          return {
            ...d,
            date: format(ascensionOfTheLord, 'dd/MM/yyyy'),
          };
        }),
    ];
  }

  return calendar;
};

const generateCalendar = (year: number, options?: Options) => {
  const {
    isEpiphanyOn6thJan = false,
    isAscensionOfTheLordOn40th = false,
    destPath = `./calendar-${year}.json`,
  } = options || {};

  let calendar: Array<
    CalendarEntry & {
      weekday?: string;
      date?: string;
    }
  > = [];

  let groupedCalendar: Record<
    string,
    Array<
      CalendarEntry & {
        weekday?: string;
        date?: string;
      }
    >
  > = {};

  calendar = [
    ...generateAdvent(year),
    ...generateChristmas(year, isEpiphanyOn6thJan),
    ...generateOT(year, isEpiphanyOn6thJan),
    ...generateLent(year),
    ...generateEaster(year, isAscensionOfTheLordOn40th),
  ].flat();

  calendar = calendar
    .map((item) => {
      return {
        ...item,
        weekday: format(
          parse(item.date!, 'dd/MM/yyyy', new Date()),
          'EEEE',
        ).toLowerCase(),
      };
    })
    .toSorted((a, b) =>
      compareAsc(
        parse(a.date!, 'dd/MM/yyyy', new Date()),
        parse(b.date!, 'dd/MM/yyyy', new Date()),
      ),
    );

  groupedCalendar = groupBy(calendar, (d) => d.date!);

  writeFileSync(destPath, JSON.stringify(groupedCalendar, null, 2));

  return calendar;
};

generateCalendar(2024);

export {
  generateAdvent,
  generateChristmas,
  generateOT,
  generateLent,
  generateEaster,
  generateCalendar,
};
