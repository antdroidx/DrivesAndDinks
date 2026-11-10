# Native Packaging

The career app ships from the same bundled web assets on Windows and Android. Neither shell requires an account or a hosted backend.

## Build requirements

- .NET SDK 10 with Windows Desktop and Android workloads.
- Android SDK 36 and a local Java runtime for the APK.
- Microsoft Edge WebView2 Evergreen Runtime on Windows.

## Windows

```powershell
npm run package:windows
```

Output:

```text
packaging/windows/artifacts/DrivesAndDinks.exe
packaging/windows/artifacts/www/
```

The executable hosts `www/career-mode/index.html` through WebView2's virtual `https://app.local` origin and does not make a network request.

Verified:

- Release publish succeeds.
- The packaged executable launches.
- The career creation screen loads from bundled assets.
- localStorage and ES modules use the same origin.

## Android

```powershell
npm run package:android
```

Output:

```text
packaging/android/artifacts/com.drivesanddinks.career-Signed.apk
```

The APK bundles `career-mode`, `src`, and `assets` as Android assets. A WebView client intercepts `https://appassets.local/` and serves those bytes without Internet permission. DOM storage is enabled for career saves.

Verified on the `pixel_9_-_api_36` emulator:

- Signed APK installs and launches.
- Career creation screen renders correctly.
- Wi-Fi and mobile data can be disabled and the app still relaunches.
- Crash log remains empty.

The visual evidence is stored at `validation/packaging-android-offline.png`.

## Portable saves

Use **EXPORT SAVE** in the career header area to create a `.dnd` file and **IMPORT SAVE** on another supported build. Imports are compressed, versioned, migrated, and validated before replacing the active career.

## Remaining store work

- Sign Windows with a production code-signing certificate.
- Sign Android with the production upload/release keystore.
- Capture final screenshots and store descriptions.
- Run physical-device timing, heat, battery, touch, and storage tests.
- Complete Apple/iOS packaging later if that platform is added to scope.