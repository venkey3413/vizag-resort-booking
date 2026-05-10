const TESTIMONIALS = [
  {
    name: 'Sarah & Michael Chen',
    role: 'Homeowners, Manhattan Penthouse',
    img: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100',
    quote: "Interiors transformed our empty penthouse into the home of our dreams. Every detail was thoughtfully considered — from the bespoke furniture to the hand-sourced artwork. Truly life-changing.",
    rating: 5,
  },
  {
    name: 'James Whitmore',
    role: 'CEO, Whitmore Capital',
    img: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=100',
    quote: "Our office redesign by Interiors boosted team morale and impressed every client who visited. The ROI on great design is real — productivity up 30% since the renovation.",
    rating: 5,
  },
  {
    name: 'Isabelle Fontaine',
    role: 'Fashion Designer, Paris',
    img: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100',
    quote: "As someone with a very particular aesthetic, I was skeptical anyone could match my vision. Interiors not only matched it — they exceeded it. My atelier is breathtaking.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section style={{ padding: '100px 0', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
      <div className="vrb-container">
        <div className="vrb-section-head vrb-anim">
          <div className="vrb-title" style={{ background: 'linear-gradient(135deg,#fff,#ff9a3c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Client Stories
          </div>
          <p className="vrb-subtitle" style={{ color: 'rgba(255,255,255,0.6)' }}>Real transformations, real results, real happiness</p>
        </div>

        <div className="vrb-grid" style={{ marginTop: 50 }}>
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="vrb-anim"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 24,
                padding: 32,
                backdropFilter: 'blur(20px)',
                transition: 'all 0.4s ease',
              }}
            >
              <div style={{ color: '#ff9a3c', fontSize: 20, marginBottom: 16 }}>
                {'★'.repeat(t.rating)}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 24, fontSize: 15 }}>
                "{t.quote}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img
                  src={t.img}
                  alt={t.name}
                  style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,154,60,0.5)' }}
                />
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{t.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 20, marginTop: 60 }}>
          {['AD100 Listed', 'Elle Décor Top 25', 'Architectural Digest Featured', 'ASID Member', 'LEED Certified'].map(b => (
            <div
              key={b}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 999,
                padding: '10px 20px',
                color: 'rgba(255,255,255,0.8)',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {b}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
