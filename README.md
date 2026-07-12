# Todo Reminder

A fully local, offline-first iOS to-do app whose core feature is **persistent,
escalating reminders**: every task has a due date, and the app nags you daily —
starting 24 hours before the deadline — until you mark it complete or postpone
it to a new date. Tasks can be created by voice ("pay rent next Friday") with
on-device speech recognition and offline date parsing.

No backend, no accounts, no API keys. Everything runs on the phone.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Expo SDK 56 (managed) + TypeScript + expo-router |
| Notifications | `expo-notifications` (local scheduled only, no push server) |
| Speech-to-text | `expo-speech-recognition` (native module — see dev-build note) |
| Date parsing | `chrono-node` (pure JS, fully offline) |
| Persistence | `expo-sqlite` (relational shape: tasks + reminder history + settings) |

## Running it on your iPhone

⚠️ **This app does NOT run in Expo Go.** Speech recognition
(`expo-speech-recognition`) is a native module, so you need a one-time
**development build** installed on your phone. After that, day-to-day
development works exactly like Expo Go (fast refresh over Wi-Fi).

### One-time setup

1. Install Xcode from the Mac App Store and open it once (accept the license).
2. Plug your iPhone into the Mac with a cable, unlock it, tap **Trust**.
3. In the project directory:

   ```sh
   npm install --legacy-peer-deps
   npx expo run:ios --device
   ```

   Pick your iPhone from the device list. The first build takes a few minutes
   and installs the **Todo Reminder** dev app on your phone.
4. On the phone, when prompted, trust the developer certificate
   (Settings → General → VPN & Device Management).

> No paid Apple Developer account needed for this — a free Apple ID works.
> Free-account builds expire after 7 days; just re-run `npx expo run:ios --device`.

### Day-to-day development

```sh
npx expo start
```

Open the installed dev app on the phone; it connects to the Metro server over
Wi-Fi and hot-reloads your changes.

### Permissions the app will ask for

- **Notifications** (first launch) — the entire point of the app; without it no
  reminders can fire. Re-enable any time in Settings → Notifications → Todo Reminder.
- **Microphone + Speech Recognition** (first mic use) — for voice task entry.

## How the reminders work

All logic lives in [`lib/reminderMath.ts`](lib/reminderMath.ts) (pure,
unit-tested date math) and [`lib/reminders.ts`](lib/reminders.ts)
(orchestration). Model:

- Every open task gets the reminder sequence `due−24h, due, due+24h, due+48h, …`
  — i.e. a heads-up 24 hours before the deadline, then a daily nag until the
  task is **completed** (cancels the sequence) or **postponed** (re-bases the
  sequence on the new due date, which you must pick).
- Reminders carry **Mark complete / Postpone…** action buttons. Complete works
  without opening the app; Postpone deep-links to the task's date picker.
- A **daily digest** (default 8:00 AM, changeable in Settings) summarizes
  everything due today or overdue.
- Scheduling uses a "re-sync the world" strategy: on every task change and app
  foreground, all pending notifications are cancelled and the next few per task
  are re-scheduled. Idempotent, and stays under iOS's ~64 pending-notification
  cap.

**Known iOS limitation (by design of local notifications):** notification
*text* is frozen at scheduling time and this app schedules a rolling window
(next ~5 reminders per task, next 3 digests) that is extended every time the
app runs. If you don't open the app for many days, per-task nags pause after
day 5 and digest content can go stale. Real-world usage (tapping any of the
reminders opens the app, which re-syncs) makes this self-correcting.

## Tests

```sh
npm test
```

24 unit tests cover the date math (24h-before calculation, daily-repeat
sequencing across all task phases, digest boundary cases) and the
natural-language parsing wrapper.

## Shipping to the App Store (not done yet — next steps)

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr).
2. `npm i -g eas-cli && eas login` (free Expo account).
3. `eas build:configure`, then `eas build --platform ios --profile production`.
   EAS builds in the cloud and manages signing certificates for you.
4. `eas submit --platform ios` to upload to App Store Connect, then fill out
   the listing (privacy: this app collects nothing; all data stays on device).
5. Optional: `eas update` for over-the-air JS updates after release.
