import { mkdir, writeFileSync } from 'node:fs';
import { generateCalendar } from '@/src/utils/gen-calendar';

mkdir('./dist', { recursive: true }, (err) => {
  if (err) {
    console.error(err);
  }
});

(async () => {
  for (let i = 2020; i < 2026; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const data = await generateCalendar(i);

    writeFileSync(`./dist/calendar-${i}.json`, JSON.stringify(data, null, 2));
  }
})();
