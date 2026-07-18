/** Unit test for the reminder selection date math. Run: npx tsx scripts/qa-reminders.ts */
import { selectDueReminders, fixedDeadlineMs, type ReminderRow } from './reminderSelect'

const DAY = 86_400_000
const now = Date.UTC(2026, 6, 18, 13, 0, 0) // fixed reference; no Date.now()
const iso = (offsetDays: number) => new Date(now + offsetDays * DAY).toISOString().slice(0, 10)

let failures = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}`)
  if (!cond) failures++
}

const rows: ReminderRow[] = [
  { userId: 'u1', email: 'a@x.com', scholarshipId: 'due7', deadline: iso(7), reminderSent: [] },
  { userId: 'u1', email: 'a@x.com', scholarshipId: 'due1', deadline: iso(1), reminderSent: [] },
  { userId: 'u1', email: 'a@x.com', scholarshipId: 'due3', deadline: iso(3), reminderSent: [] }, // skip
  { userId: 'u1', email: 'a@x.com', scholarshipId: 'already', deadline: iso(7), reminderSent: ['d7'] }, // skip
  { userId: 'u2', email: 'b@x.com', scholarshipId: 'rolling', deadline: 'Rolling (check portal)', reminderSent: [] }, // skip
  { userId: 'u2', email: 'b@x.com', scholarshipId: 'b7', deadline: iso(7), reminderSent: ['d1'] }, // d7 still due
]

const groups = selectDueReminders(rows, now)
const a = groups.find((g) => g.email === 'a@x.com')
const b = groups.find((g) => g.email === 'b@x.com')

check('a@x.com has 2 due items (7d + 1d)', a?.items.length === 2)
check('a@x.com includes due7 as d7', !!a?.items.find((i) => i.scholarshipId === 'due7' && i.mark === 'd7'))
check('a@x.com includes due1 as d1', !!a?.items.find((i) => i.scholarshipId === 'due1' && i.mark === 'd1'))
check('due3 excluded (not 7/1)', !a?.items.find((i) => i.scholarshipId === 'due3'))
check('already-sent d7 excluded', !a?.items.find((i) => i.scholarshipId === 'already'))
check('rolling excluded', !b?.items.find((i) => i.scholarshipId === 'rolling'))
check('b7 due for d7 despite d1 sent', !!b?.items.find((i) => i.scholarshipId === 'b7' && i.mark === 'd7'))
check('rolling deadline is not fixed', fixedDeadlineMs('Rolling (check portal)') === null)
check('ISO deadline is fixed', fixedDeadlineMs('2027-05-01') !== null)

console.log(`\n${failures === 0 ? 'ALL CLEAN' : failures + ' FAILURES'}`)
process.exit(failures === 0 ? 0 : 1)
