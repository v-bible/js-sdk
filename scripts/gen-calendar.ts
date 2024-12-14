import { mkdir, writeFileSync } from 'node:fs';
import { generateCalendar } from '@/src/utils/gen-calendar';

mkdir('./dist', { recursive: true }, (err) => {
  if (err) {
    console.error(err);
  }
});

for (let i = 2020; i < 2026; i += 1) {
  const data = generateCalendar(i);

  writeFileSync(`./dist/calendar-${i}.json`, JSON.stringify(data, null, 2));
}
