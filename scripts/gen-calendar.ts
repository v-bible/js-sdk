import { mkdir } from 'node:fs';
import { generateCalendar } from '@/src/utils/gen-calendar';

mkdir('./dist', { recursive: true }, (err) => {
  if (err) {
    console.error(err);
  }
});

for (let i = 2020; i < 2026; i += 1) {
  generateCalendar(i, {
    destPath: `./dist/calendar-${i}.json`,
  });
}
