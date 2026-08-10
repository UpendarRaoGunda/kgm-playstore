# Koratlagudem APK Hub

A community-first Android app shelf for software imagined and built by young creators in Koratlagudem, Telangana.

## What is included

- Responsive bilingual village identity
- Searchable and filterable app catalog
- Accessible app-detail modal with version, compatibility and permissions
- Safety review and Android sideloading guidance
- Young-creator submission workflow
- Installable web-app manifest and a native Android package
- Mobile, tablet and desktop layouts

The initial catalog contains clearly labelled preview concepts. It does not pretend that an APK is available before a file has passed review.

## Publish a community APK

1. Upload the signed APK to the approved KGM/Render storage path.
2. Scan the exact release file with a reputable malware scanner and record its SHA-256 checksum.
3. Review permissions, privacy, age suitability and content with an adult mentor.
4. Add or update the app entry in `app/page.tsx`.
5. Set `apkUrl` to the permanent KGM Render URL. The interface will automatically replace the preview state with a **Download APK** action.

Do not silently replace an APK at an existing release URL. Publish a new version so people can verify what changed.

## KGM Android app

The native Android container lives in `android/` and loads the official KGM site over HTTPS.
It supports Android back navigation, KGM uploads, download notifications, secure browsing and
an offline retry screen. Run `npm run android:publish` with local signing configuration to build
the release and publish it into `public/downloads/`, which Render serves from the official site.

## Local development

```bash
npm ci
npm run dev
```

Then open `http://localhost:3000` (or the URL printed by the development server).

## Quality checks

```bash
npm run lint
npm test
```

## Safety policy

- No deceptive downloads or install prompts
- No APK is listed as published before malware and permission review
- No collection of a child’s personal information without an appropriate lawful, parent/guardian-supported process
- No hidden ads, tracking SDKs or unnecessary permissions
- Every release keeps visible creator, version and compatibility information
- Under-18 submissions require parent, teacher or mentor involvement

## Repository

Built for the Koratlagudem community: <https://github.com/UpendarRaoGunda/kgm-playstore>
