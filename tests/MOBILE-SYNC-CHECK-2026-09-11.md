# Mobile synchronization verification — 5.390

## Reproduced and corrected

- Android profiles repeatedly failed inside Firestore SDK watch target handling. Switching polling options or trying SDK 12.13.0 did not fix it. Mobile reads now use bounded Firestore REST requests (including pagination) and no SDK snapshot listeners. Mobile saves already used REST; a failed REST write now remains pending rather than entering the broken SDK transport. Manual document reads and deletes use the same transport; desktop listeners remain unchanged.
- Mobile refresh runs on startup, reconnection, foreground and every 60 seconds while visible and online. Existing local records no longer suppress mobile refresh. Concurrent refresh callers await the same operation.
- Each collection is applied as soon as it arrives, starting with quarterly protocols. An unrelated slow/failing collection no longer delays quarterly counts. Failed or partial paginated reads retain prior data; pending local records and records held in memory after a storage-quota failure remain available.
- A delayed embedded-backup restore could replace the in-memory server list when local persistence was full/empty. Restore now checks existing in-memory data first. A synthetic 140 cloud + one pending record scenario remains at 141 through failed local persistence, delayed backup restore and subsequent network failure.

## Verification

- Live candidate test on Android: all six forms saved and edited, photos downloaded independently, signatures checked, fault status transitions checked, own records found in a fresh browser session. No prior SDK page errors. Run: TEST-CODEX-1789098678729.
- Live candidate iPhone/iPad WebKit: all six forms on each profile passed the same save/edit checks, including real Storage photos and fresh-session reads. Run: TEST-CODEX-1789098931848.
- iPhone real localStorage quota: quarterly protocol/photo/signatures saved to cloud, edited and reloaded independently. Run: TEST-CODEX-1789098947019.
- iPhone offline: local protocol survived reload; cloud sync and photo confirmed after reconnection. Run: TEST-CODEX-1789099024116.
- All tracked synthetic documents/photos were removed and absence verified. No cleanup failures.
- `mobile-rest-refresh.test.cjs` runs with Android Chromium and iPhone/iPad WebKit: pagination, REST field decoding, failed/repeated pages, immediate quarterly results, concurrent refresh joining, quota preservation and delayed backup preservation. External traffic is blocked.
- Existing storage/quota/photo/wizard/layout tests remain part of the full regression suite. No newer Firebase SDK files are included.

## Limits

Browser profiles are not physical phones; this does not prove that an affected physical iPhone or Samsung is error-free. No user confirmed iPhone saving before this release. Physical camera/HEIC and OS suspension/eviction require device acceptance. The specific historical difference of roughly 40 records cannot be conclusively attributed without actual device ID inventories. This change fixes reproduced stale-list mechanisms and preserves local-only records instead of deleting them to manufacture matching counts.

Mobile updates from other devices can take up to roughly one minute while the app is visible, plus network time; reopening/reconnecting also triggers refresh. Full local storage can still prevent durable offline caching even when online cloud saving works. The app must retain/show failure when neither local nor cloud storage succeeds.
