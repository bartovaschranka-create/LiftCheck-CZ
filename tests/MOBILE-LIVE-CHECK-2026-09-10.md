# Mobile save checks — 2026-09-10

Production checked: 5.388. Candidate: 5.389. No automatic deployment.

## Confirmed fixes

1. Parts and repair photos: open either form, choose one JPEG, then choose another. In 5.388 the first image is added, but `event.currentTarget` is null after asynchronous compression; cleanup throws and the picker remains disabled. Keep the input reference before awaiting and restore it in `finally`. Covered by `photo-picker-recovery.test.cjs`: sequential picks, decode failure, retry, desktop/Android Chromium and iPhone/iPad WebKit.
2. Partial revision updates: automatic load normalization calls `patchAndVerifyFirestore` with four fields. The REST request previously had no update mask, replacing the document rather than merging it. Add a mask only for partial updates; preserve full-save behavior. `firestore-partial-update.test.cjs` verifies unrelated fields, photos/signatures, literal field names, empty-patch rejection and full replacement. A candidate revision was also patched on the real server and its serial and edited text remained present. This does not establish that historical customer records were damaged.

Affected production files: `index.html`; release/cache metadata in `sw.js` and `version.json`.

## Actual server checks

Synthetic records used a unique TEST-CODEX prefix and clearly invalid/test descriptions. Only these document IDs and photo paths were allowed to mutate. All tracked test documents, audit entries and uploaded objects were deleted and independently checked as absent: 168 cleanup checks, no failures across eight runs.

| Flow | Actual checks |
| --- | --- |
| Quarterly | Traverse wizard including custom location, JPEG and two signatures; save, independent server read, edit, preview |
| Fault | Two JPEGs; save, edit, preview; service/waiting-parts/repaired transitions |
| Parts | Save with JPEG, edit, independently download photo after edit |
| Work plan | Save and edit synthetic place/technician/note |
| Repairs | JPEG and two signatures; save and edit |
| Revision | Save, edit; candidate partial update preserves other fields |

All six flows were exercised in desktop Chromium, iPhone/iPad WebKit, and Android Chromium profiles. Photos were downloaded independently from Storage and checked for image type and nonempty bytes. The real iPhone-profile quota test filled localStorage, saved photo/signatures to the server, edited the record, and found it in a fresh session. Offline quarterly save survived reload and synchronized after reconnecting.

## Remaining limitations / failures

- Android Chromium repeatedly raised Firestore 10.12.5 internal assertions in target-response handling. REST saves and photo downloads still succeeded. Forced long polling did not eliminate it. A diagnostic-only Firebase 12.13.0 replacement also failed; its fresh-session read timed out. Neither experimental change is included. This is **not a clean Android synchronization result**. Test interception blocks unrelated production writes and can influence SDK behavior; the exact cause remains unproven. Upstream related investigation: https://github.com/firebase/firebase-js-sdk/pull/9842 .
- The original approximately 40-record PC/mobile difference is not resolved. Fresh-session checks initially raced startup; after waiting for refresh, own records were visible. Observed counts vary with concurrent synthetic records and local history. One iPhone fresh session held 200 records in memory but zero in localStorage, consistent with local persistence capacity failure. No real local records were deleted to force count parity.
- One first-run delayed-confirmation assertion failed; isolated repeat and the complete subsequent Chromium and WebKit quota suites passed. Keep this timing scenario under observation.
- Earlier save/edit test timeouts were fixed by waiting for the previous save handler to finish before reopening a form.
- These are browser profiles, not physical iPhones/Samsung devices. Physical camera/HEIC, OS eviction/background suspension, installed-PWA upgrades, printing/PDF exports and every administrative/destructive action were not exhaustively tested. No claim that all functions are bug-free.

## Regression checks

Run all `tests/*.test.cjs` with `CODEX_NODE_MODULES` pointing to the existing Playwright install and a local `LIFTCHECK_TEST_URL` for browser tests that need it. Production access is blocked by the committed browser fixtures. Set `LIFTCHECK_TEST_ENGINE=webkit` for `photo-picker-recovery.test.cjs` and `quarterly-quota-cloud.test.cjs` (installed WebKit required). The quota suite covers server/upload/read failures, content mismatch, real quota, compaction, retry and delayed confirmation beyond 15 seconds. Existing mobile tests cover portrait layout, draft resumption and failed local photo persistence.

Further acceptance: compare read-only record-ID inventories on the actually affected PC/iPhone/iPad; reproduce SDK failure with a dedicated Firebase test project without production-write interception; test real camera/gallery, offline relaunch and background/resume on the affected phones.
