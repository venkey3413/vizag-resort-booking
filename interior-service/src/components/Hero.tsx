export default function Hero() {
  return (
    <section
      id="home"
      className="vrb-hero"
      style={{
        backgroundImage: `url("https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1800")`,
        minHeight: '100vh',
      }}
    >
      <div className="vrb-overlay" />
      <div className="vrb-hero-content">
        <h1 style={{ fontSize: 56, lineHeight: 1.1 }}>
          Transform Your Space Into<br />
          <span style={{ color: '#ff9a3c' }}>A Living Masterpiece</span>
        </h1>
        <p>Award-winning interior design studio crafting bespoke spaces that inspire, comfort, and captivate.</p>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {[['500+', 'Projects Done'], ['15+', 'Years Experience'], ['98%', 'Client Satisfaction'], ['50+', 'Awards Won']].map(([n, l]) => (
            <div key={l} style={{ textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#ff9a3c' }}>{n}</div>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
