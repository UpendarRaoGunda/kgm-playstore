# Koratlagudem APK Hub

A community-first Android app shelf for software imagined and built by young creators in Koratlagudem, Telangana.

## What is included

- Responsive bilingual village identity
- Searchable and filterable app catalog
- Accessible app-detail modal with version, compatibility and permissions
- Safety review and Android sideloading guidance
- Young-creator submission workflow
- Installable web-app manifest
- Mobile, tablet and desktop layouts

The initial catalog contains clearly labelled preview concepts. It does not pretend that an APK is available before a file has passed review.

## Publish an APK

1. Create a versioned GitHub Release for the app and attach the signed APK.
2. Scan the exact release file with a reputable malware scanner and record its SHA-256 checksum.
3. Review permissions, privacy, age suitability and content with an adult mentor.
4. Add or update the app entry in `app/page.tsx`.
5. Set `apkUrl` to the permanent release-asset URL. The interface will automatically replace the preview state with a **Download APK** action.

Do not silently replace an APK at an existing release URL. Publish a new version so people can verify what changed.

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
