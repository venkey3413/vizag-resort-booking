import { useState } from 'react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', whatsapp: true });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contact" style={{ padding: '80px 6%', background: 'linear-gradient(135deg,#f8f2ff,#f4ecff)' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.9fr',
        background: '#fff',
        borderRadius: '32px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(125,87,175,.12)',
      }}>
        
        {/* LEFT IMAGE AREA */}
        <div style={{ position: 'relative', minHeight: '850px' }}>
          <img
            src="https://raw.githubusercontent.com/venkey3413/vizag-resort-booking/main/interior-service/wooden_luxury_interior_only.png"
            alt="Luxury Interior"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(62,31,87,.35), rgba(0,0,0,0.05))',
          }} />

          {/* FEATURES */}
          <div style={{
            position: 'absolute',
            bottom: '35px',
            left: '35px',
            right: '35px',
            zIndex: 2,
            background: 'rgba(255,255,255,.88)',
            backdropFilter: 'blur(10px)',
            borderRadius: '26px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: '20px',
            padding: '28px',
          }}>
            {[
              { icon: '🪑', title: 'Expert Designers', desc: 'Luxury interiors crafted with precision.' },
              { icon: '✨', title: 'Personalized Ideas', desc: 'Tailored concepts matching your vision.' },
              { icon: '🏆', title: 'Premium Quality', desc: 'High-end wooden finishes & décor.' },
            ].map((feature, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '70px',
                  height: '70px',
                  margin: 'auto',
                  marginBottom: '18px',
                  borderRadius: '50%',
                  border: '2px solid #8a45d1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  color: '#8a45d1',
                  background: '#f8f2ff',
                }}>
                  {feature.icon}
                </div>
                <h4 style={{ fontSize: '20px', color: '#4b2367', marginBottom: '10px' }}>{feature.title}</h4>
                <p style={{ color: '#666', lineHeight: 1.7, fontSize: '14px' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT FORM AREA */}
        <div style={{
          padding: '70px 55px',
          background: 'linear-gradient(180deg,#f9f5ff,#f5effd)',
          position: 'relative',
        }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontSize: 32, fontWeight: 900, marginBottom: 12, color: '#5f238b' }}>Thank You!</h3>
              <p style={{ color: '#555', fontSize: 18 }}>We've received your inquiry. Our design expert will reach out within 24 hours.</p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '45px', position: 'relative', zIndex: 2 }}>
                <span style={{ color: '#b07a2d', letterSpacing: '4px', fontSize: '15px', fontWeight: 600 }}>
                  BOOK FREE
                </span>
                <h2 style={{
                  fontSize: '78px',
                  lineHeight: 1,
                  margin: '20px 0',
                  color: '#5f238b',
                  fontFamily: 'Playfair Display, serif',
                }}>
                  Consultation
                </h2>
                <p style={{ color: '#555', lineHeight: 1.9, fontSize: '18px' }}>
                  Share your requirements and our design experts will get in touch with you.
                </p>
              </div>

              <form onSubmit={handle} style={{ position: 'relative', zIndex: 2 }}>
                <div style={{
                  height: '78px',
                  background: '#fff',
                  border: '1.5px solid #e4d9f5',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px',
                  padding: '0 25px',
                  transition: '.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9b5fe0'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e4d9f5'}
                >
                  <span style={{ fontSize: '24px', marginRight: '18px', color: '#7f4ca5' }}>👤</span>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '18px',
                      color: '#444',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  />
                </div>

                <div style={{
                  height: '78px',
                  background: '#fff',
                  border: '1.5px solid #e4d9f5',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px',
                  padding: '0 25px',
                  transition: '.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9b5fe0'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e4d9f5'}
                >
                  <span style={{ fontSize: '24px', marginRight: '18px', color: '#7f4ca5' }}>✉️</span>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '18px',
                      color: '#444',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  />
                </div>

                <div style={{
                  height: '78px',
                  background: '#fff',
                  border: '1.5px solid #e4d9f5',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px',
                  padding: '0 25px',
                  transition: '.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9b5fe0'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e4d9f5'}
                >
                  <span style={{ fontSize: '24px', marginRight: '18px', color: '#7f4ca5' }}>📞</span>
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '18px',
                      color: '#444',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  />
                </div>

                <div style={{
                  height: '78px',
                  background: '#fff',
                  border: '1.5px solid #e4d9f5',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px',
                  padding: '0 25px',
                  transition: '.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9b5fe0'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e4d9f5'}
                >
                  <span style={{ fontSize: '24px', marginRight: '18px', color: '#7f4ca5' }}>📍</span>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '18px',
                      color: '#444',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  >
                    <option value="">Select City</option>
                    <option>Hyderabad</option>
                    <option>Vijayawada</option>
                    <option>Vizag</option>
                    <option>Guntur</option>
                  </select>
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '15px 0 35px',
                  color: '#444',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.checked })}
                    style={{ width: '20px', height: '20px', accentColor: '#7b2cbf' }}
                  />
                  <span>Send me updates on WhatsApp</span>
                </label>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    height: '76px',
                    border: 'none',
                    borderRadius: '18px',
                    background: 'linear-gradient(135deg,#7b2cbf,#5a189a)',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: '.4s',
                    boxShadow: '0 15px 30px rgba(123,44,191,.25)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(123,44,191,.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 15px 30px rgba(123,44,191,.25)';
                  }}
                >
                  GET FREE CONSULTATION →
                </button>

                <p style={{
                  marginTop: '25px',
                  textAlign: 'center',
                  color: '#777',
                  fontSize: '14px',
                  lineHeight: 1.8,
                }}>
                  We respect your privacy. Your information is safe with us.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
