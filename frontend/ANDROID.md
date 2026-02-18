# Building an Android APK from this frontend

Run these commands from the `frontend` folder on Windows.

1) Install Capacitor packages:

```bash
npm install @capacitor/core @capacitor/cli --save
```

2) Build the web app (Vite):

```bash
npm run build
```

3) Initialize Capacitor (only if not already initialized):

```bash
npx cap init "Hear" com.example.hear --web-dir=dist
```

4) Add Android platform:

```bash
npx cap add android
```

5) Copy web assets into the native project:

```bash
npx cap copy
```

6) Open Android Studio and generate the APK:

```bash
npx cap open android
```

In Android Studio: Build > Generate Signed Bundle / APK. Create or use an existing keystore to sign the APK.

Notes:
- Make sure your `frontend/.env.local` values are correct before building (Vite inlines env vars at build time).
- If you need native features (camera, file access, audio), install Capacitor plugins and request permissions in Android.
