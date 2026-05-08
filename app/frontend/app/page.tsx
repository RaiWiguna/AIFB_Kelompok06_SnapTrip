const categories = ["pantai", "gunung", "air_terjun", "wisata_tradisional"];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="panel">
        <div>
          <h1>SnapTrip Foundation</h1>
          <p>
            Runtime scaffold for Explore, auth, collections, image classification, and destination
            seeds.
          </p>
        </div>
        <div className="status-grid">
          {categories.map((category) => (
            <div className="status-tile" key={category}>
              <strong>{category}</strong>
              <span>Canonical tourism category</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
