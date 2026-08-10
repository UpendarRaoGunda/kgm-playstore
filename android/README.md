# KGM Playstore for Android

This is the native Android container for the KGM community experience hosted at
`https://kgm-playstore.onrender.com/`. It provides Android navigation, secure WebView
defaults, file selection for KGM uploads, Android download notifications, verified
HTTPS-only transport, an offline retry screen, and App Link handling.

## Build a local debug APK

```powershell
cd android
.\gradlew.bat assembleDebug
```

## Publish a signed APK to the website

Create `android/keystore.properties` (ignored by Git):

```properties
storeFile=keystore/kgm-release.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=kgm
keyPassword=YOUR_KEY_PASSWORD
```

Then run from the repository root:

```powershell
npm run android:publish
```

The script builds the release, verifies its signature, publishes it as
`public/downloads/kgm-playstore-latest.apk`, and updates the public checksum manifest.
Back up the keystore and passwords securely; Android updates must use the same key.
