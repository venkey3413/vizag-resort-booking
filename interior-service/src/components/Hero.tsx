export default function Hero() {
  return (
    <section
      id="home"
      className="vrb-hero"
      style={{
        backgroundImage: `url("https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1800")`,
        minHeight: '50vh',
      }}
    >
      <div className="vrb-overlay" />
      <div className="vrb-hero-content">
        <h1 style={{ 
          fontSize: 32, 
          lineHeight: 1.1, 
          fontFamily: 'Playfair Display, serif',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          Transform Your Space Into<br />
          <span style={{ 
            color: '#ff9a3c',
            fontStyle: 'italic',
            fontWeight: 800
          }}>A Living Masterpiece</span>
        </h1>
        <p style={{
          fontSize: 14,
          fontWeight: 300,
          letterSpacing: '0.3px',
          marginTop: 12,
          textShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}>Award-winning interior design studio crafting bespoke spaces that inspire, comfort, and captivate.</p>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          {[['500+', 'Projects Done'], ['15+', 'Years Experience'], ['98%', 'Client Satisfaction'], ['50+', 'Awards Won']].map(([n, l]) => (
            <div key={l} style={{ textAlign: 'center', color: '#fff' }}>
              <div style={{ 
                fontSize: 24, 
                fontWeight: 900, 
                color: '#ff9a3c',
                fontFamily: 'Playfair Display, serif',
                textShadow: '0 3px 15px rgba(255,154,60,0.5)'
              }}>{n}</div>
              <div style={{ 
                fontSize: 10, 
                fontWeight: 600, 
                opacity: 0.95,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginTop: 4
              }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
