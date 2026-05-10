const SERVICES = [
  {
    icon: '🛋️',
    title: 'Living Room Design',
    desc: 'Curated furniture, lighting and layout plans to craft your perfect living space with timeless elegance.',
    tags: ['Furniture Curation', 'Lighting', 'Layout'],
    price: 'From $2,500',
  },
  {
    icon: '🍳',
    title: 'Kitchen & Dining',
    desc: 'Functional kitchens with beautiful aesthetics — from custom cabinetry to premium countertops.',
    tags: ['Cabinetry', 'Countertops', 'Appliances'],
    price: 'From $4,000',
  },
  {
    icon: '🛏️',
    title: 'Bedroom Sanctuary',
    desc: 'Restful retreats designed with plush textures, serene palettes, and tailored storage solutions.',
    tags: ['Custom Wardrobes', 'Lighting', 'Textiles'],
    price: 'From $3,000',
  },
  {
    icon: '🏢',
    title: 'Commercial Spaces',
    desc: 'Brand-aligned commercial interiors that inspire productivity and impress clients.',
    tags: ['Branding', 'Ergonomics', 'Flow'],
    price: 'From $8,000',
  },
  {
    icon: '🛁',
    title: 'Luxury Bathrooms',
    desc: 'Spa-inspired bathrooms with premium tiles, fixtures, and serene design concepts.',
    tags: ['Tiles', 'Fixtures', 'Lighting'],
    price: 'From $5,000',
  },
  {
    icon: '🌿',
    title: 'Outdoor & Landscape',
    desc: 'Seamless indoor-outdoor living through expert landscaping and patio design.',
    tags: ['Landscaping', 'Patio', 'Lighting'],
    price: 'From $3,500',
  },
];

export default function Services() {
  return (
    <section id="services" className="vrb-section">
      <div className="vrb-container">
        <div className="vrb-section-head vrb-anim">
          <div className="vrb-title">Our Design Services</div>
          <p className="vrb-subtitle">End-to-end interior solutions tailored to your vision and lifestyle</p>
        </div>

        <div className="vrb-grid">
          {SERVICES.map((s, i) => (
            <div className="vrb-card vrb-anim" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="vrb-img" style={{ background: 'linear-gradient(135deg,#f0f4ff,#e8f0fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 64 }}>{s.icon}</span>
              </div>
              <div className="vrb-body">
                <h3>{s.title}</h3>
                <p className="vrb-meta">{s.desc}</p>
                <div className="vrb-tags">
                  {s.tags.map(t => <span key={t}>{t}</span>)}
                </div>
                <div className="vrb-bottom">
                  <div>
                    <div className="vrb-price">{s.price}</div>
                    <div className="vrb-small">Free consultation included</div>
                  </div>
                  <button className="vrb-btn-primary">Learn More →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
