import "./privacy.css";

export const metadata = {
  title: "Privacy & Safety · KGM Youthverse",
  description: "Privacy, safety and public-upload policy for KGM Youthverse.",
};

export default function PrivacyPage() {
  return (
    <main className="kgm-policy-page">
      <a className="kgm-policy-back" href="/">← Back to KGM</a>
      <header className="kgm-policy-hero">
        <span>KGM · KORATLAGUDEM YOUTHVERSE</span>
        <h1>Privacy should be understandable.</h1>
        <p>KGM is a public youth and community space. This page explains what is public, what account information we keep, and the choices you have.</p>
      </header>

      <section className="kgm-policy-grid">
        <article><b>PUBLIC BY DESIGN</b><h2>Uploads and Village Chat</h2><p>Gallery uploads, uploader nickname and role, and messages posted in the public Village Chat can be seen by other KGM visitors. Do not post private documents, phone numbers, email addresses, home addresses, passwords or other sensitive information.</p></article>
        <article><b>ACCOUNT DATA</b><h2>What KGM stores</h2><p>KGM stores the email address used for your account, nickname, selected role, password verification data, account session information and the content you choose to publish. Passwords are not stored as plain text.</p></article>
        <article><b>YOUR MEDIA</b><h2>Photos, videos, music and APKs</h2><p>Only upload content you own or have permission to share. Public media can be viewed or saved by other people. Community APKs are not automatically trusted or installed by KGM.</p></article>
        <article><b>CONTROL</b><h2>Edit, delete and report</h2><p>Signed-in members can edit or delete their own uploads and delete their own chat messages. Members can report content they believe is unsafe or inappropriate.</p></article>
      </section>

      <section className="kgm-policy-section" id="safety">
        <span>YOUTH SAFETY</span>
        <h2>A public room, not a private-message network.</h2>
        <p>KGM Village Chat is designed as a shared public room. Direct messages, links and personal contact details are restricted in the chat experience. Children and teens should avoid sharing information that could identify where they live, study or can be contacted privately.</p>
      </section>

      <section className="kgm-policy-section">
        <span>VIDEO CHAT</span>
        <h2>Camera and microphone are permission-based.</h2>
        <p>KGM asks for browser/device permission before camera or microphone access. The Video Room interface starts with camera and microphone muted by default. You can leave the room at any time.</p>
      </section>

      <section className="kgm-policy-section">
        <span>DATA LOCATION</span>
        <h2>KGM-owned service storage.</h2>
        <p>KGM account, community and upload data used by this application is handled by the KGM Playstore service and its configured storage. KGM is being kept separate from unrelated projects and services.</p>
      </section>

      <section className="kgm-policy-section">
        <span>IMPORTANT</span>
        <h2>Browser security warnings are separate from this policy.</h2>
        <p>A Privacy Policy explains how a service handles information. It does not create or repair an HTTPS/TLS certificate. If your browser shows a connection-security warning, do not enter a password until the browser reports a secure connection.</p>
      </section>

      <footer className="kgm-policy-footer">
        <strong>KGM · Knowledge. Creation. Community.</strong>
        <p>Last updated: 12 August 2026</p>
        <a href="/">Return to KGM Youthverse →</a>
      </footer>
    </main>
  );
}
