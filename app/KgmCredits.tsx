export default function KgmCredits() {
  const cofounders = [
    "Devarakonda Chinna",
    "Gunda Sandeep",
    "Marthi Jashwanth",
  ];

  return (
    <section className="kgm-credits" aria-label="KGM co-founders">
      <div className="kgm-credits-copy">
        <span>KGM · KORATLAGUDEM COMMUNITY</span>
        <strong>Built together in our village.</strong>
        <p>Apps, music, gallery and community spaces made for Koratlagudem.</p>
      </div>
      <div className="kgm-cofounders">
        <small>CO-FOUNDERS</small>
        <div>
          {cofounders.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
