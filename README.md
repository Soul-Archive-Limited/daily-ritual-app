# Daily Ritual

Your skin, hair and health routine, one calm step at a time. A free, private, open-source app for iPhone and iPad, with an optional website that shows the same data.

- **Today:** morning, night and health checklists with progress, water, activity and type of day (wash, no-wash, travel).
- **Sun:** today's UV, sunrise and sunset wherever you are, and a reminder to reapply sunscreen.
- **Skin:** check-ins every few days with a live camera guide and scores over time. Photos never leave the device.
- **Shelf:** every product empties a little each time you use it, so you know what to restock.
- **Progress:** streaks with shields, trends, a month view and weigh-ins.
- **On-device AI:** ask about your routine or get a weekly review from Apple Intelligence. Nothing is sent anywhere.
- **Optional sync:** Sign in with Apple or Google to keep iPhone, iPad and the website in step.
- **Widgets** for the home screen and lock screen. Light and dark mode. Full iPad layouts.

Website: https://daily-ritual.fragrant-base-6293.workers.dev · [Privacy](https://daily-ritual.fragrant-base-6293.workers.dev/privacy)

## How it is built

| Folder | What |
| --- | --- |
| `src/app` | Screens (Expo Router, native tabs and stacks) |
| `src/logic` | Scheduling, scoring, streaks, progress and shelf maths. Plain TypeScript, shared with the website |
| `src/db` | Local SQLite database (everything works offline) |
| `src/sync` | Optional sync client: an outbox of changes, pushed and pulled in batches |
| `src/ai` | On-device AI features (Apple Intelligence), limited to skincare and the user's own routine |
| `src/widgets` | Home and lock screen widgets (`expo-widgets`) |
| `modules/` | Small native modules in Swift: subject lifting for product photos, Apple's on-device model |
| `server/` | Accounts and sync API on Cloudflare Workers + D1. See [server/README.md](server/README.md) |
| `web/` | The website (Vite + React), served by the same Worker |

Expo SDK 58, React Native, TypeScript. No analytics, no ads, no API keys in the app.

## Run the app

You need a Mac with Xcode and Node.js.

```bash
npm install
```

```bash
npx expo run:ios
```

The first run builds a development app for the iOS Simulator. After that, `npx expo start --dev-client` reloads changes instantly.

To ship it under your own name, change `ios.bundleIdentifier`, `owner`, `extra.eas.projectId`, `updates.url` and the Google client ids in `app.json`, and the sync address in `src/sync/client.ts`.

## Run the server and website

See [server/README.md](server/README.md). Everything fits in Cloudflare's free plan.

## Privacy

Data lives on the device. Signing in is optional and only syncs the routine, log, scores and weigh-ins. Skin and product photos never leave the device. See the [privacy policy](https://daily-ritual.fragrant-base-6293.workers.dev/privacy).

## Credits

Hero photos are from [Unsplash](https://unsplash.com) under the [Unsplash License](https://unsplash.com/license).

## Licence

[MIT](LICENSE) © 2026 Soul Archive Ltd
