import release from "../public/downloads/release.json";

const APK_URL = "https://kgm-playstore.onrender.com/downloads/kgm-playstore-latest.apk";

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AndroidInstall() {
  return (
    <section className="install-section" id="install">
      <div className="install-preview">
        <div className="download-ring" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
          </svg>
          <span />
        </div>
        <small>ANDROID APP · HOSTED ON RENDER</small>
        <strong>KGM in your pocket.<br />One safe download.</strong>
      </div>
      <div className="install-copy">
        <span className="section-kicker">KGM FOR ANDROID</span>
        <h2>Install the native<br />KGM mobile app.</h2>
        <p className="install-intro">The APK is served directly by the official KGM website on Render. It opens the live community shelf, music, gallery and Village Chat in an Android app made for KGM.</p>
        <a className="android-install-button" href={APK_URL} download>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
          Download KGM Android APK
        </a>
        <div className="release-facts">
          <span><small>VERSION</small><strong>{release.versionName}</strong></span>
          <span><small>REQUIRES</small><strong>{release.minimumAndroid}</strong></span>
          <span><small>DOWNLOAD</small><strong>{formatSize(release.bytes)}</strong></span>
        </div>
        <p className="apk-checksum"><strong>SHA-256</strong><code>{release.sha256}</code></p>
        <ol>
          <li><span>1</span><div><strong>Download from KGM on Render</strong><p>Tap the button above. No GitHub download page or account is required.</p></div></li>
          <li><span>2</span><div><strong>Allow this one installation</strong><p>Android may ask permission for your browser to install the APK.</p></div></li>
          <li><span>3</span><div><strong>Install, then switch permission off</strong><p>Open the downloaded APK, confirm Install, and disable “unknown apps” access afterward.</p></div></li>
        </ol>
      </div>
    </section>
  );
}
