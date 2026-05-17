import { useState } from 'react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', whatsapp: true });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contact" style={{ padding: '40px 5%', background: 'linear-gradient(135deg,#f8f2ff,#f4ecff)' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: '#fff',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(125,87,175,.12)',
        maxWidth: '1100px',
        margin: 'auto',
        height: '85vh',
        maxHeight: '650px'
      }}>
        
        {/* LEFT IMAGE AREA */}
        <div style={{ position: 'relative', height: '100%' }}>
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
            bottom: '20px',
            left: '20px',
            right: '20px',
            zIndex: 2,
            background: 'rgba(255,255,255,.88)',
            backdropFilter: 'blur(10px)',
            borderRadius: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: '12px',
            padding: '16px',
          }}>
            {[
              { icon: '🪑', title: 'Expert Designers', desc: 'Luxury interiors crafted.' },
              { icon: '✨', title: 'Personalized Ideas', desc: 'Tailored concepts.' },
              { icon: '🏆', title: 'Premium Quality', desc: 'High-end finishes.' },
            ].map((feature, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  margin: 'auto',
                  marginBottom: '10px',
                  borderRadius: '50%',
                  border: '2px solid #8a45d1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  color: '#8a45d1',
                  background: '#f8f2ff',
                }}>
                  {feature.icon}
                </div>
                <h4 style={{ fontSize: '14px', color: '#4b2367', marginBottom: '6px', fontWeight: 700 }}>{feature.title}</h4>
                <p style={{ color: '#666', lineHeight: 1.5, fontSize: '11px' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT FORM AREA */}
        <div style={{
          padding: '30px 35px',
          background: 'linear-gradient(180deg,#f9f5ff,#f5effd)',
          position: 'relative',
          height: '100%',
          overflowY: 'auto'
        }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, color: '#5f238b' }}>Thank You!</h3>
              <p style={{ color: '#555', fontSize: 14 }}>We've received your inquiry. Our design expert will reach out within 24 hours.</p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '20px', position: 'relative', zIndex: 2 }}>
                <span style={{ color: '#b07a2d', letterSpacing: '2px', fontSize: '11px', fontWeight: 600 }}>
                  BOOK FREE
                </span>
                <h2 style={{
                  fontSize: '42px',
                  lineHeight: 1,
                  margin: '10px 0',
                  color: '#5f238b',
                  fontFamily: 'Playfair Display, serif',
                }}>
                  Consultation
                </h2>
                <p style={{ color: '#555', lineHeight: 1.5, fontSize: '12px' }}>
                  Share your requirements and our design experts will get in touch.
                </p>
              </div>

              <form onSubmit={handle} style={{ position: 'relative', zIndex: 2 }}>
                {[
                  { icon: '👤', type: 'text', placeholder: 'Your Name', field: 'name' },
                  { icon: '✉️', type: 'email', placeholder: 'Email Address', field: 'email' },
                  { icon: '📞', type: 'text', placeholder: 'Phone Number', field: 'phone' },
                ].map((input, i) => (
                  <div key={i} style={{
                    height: '55px',
                    background: '#fff',
                    border: '1.5px solid #e4d9f5',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '16px',
                    padding: '0 18px',
                    transition: '.3s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9b5fe0'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e4d9f5'}
                  >
                    <span style={{ fontSize: '20px', marginRight: '14px', color: '#7f4ca5' }}>{input.icon}</span>
                    <input
                      type={input.type}
                      placeholder={input.placeholder}
                      value={form[input.field as keyof typeof form] as string}
                      onChange={(e) => setForm({ ...form, [input.field]: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        fontSize: '15px',
                        color: '#444',
                        fontFamily: 'Poppins, sans-serif',
                      }}
                    />
                  </div>
                ))}

                <div style={{
                  height: '55px',
                  background: '#fff',
                  border: '1.5px solid #e4d9f5',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '16px',
                  padding: '0 18px',
                  transition: '.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9b5fe0'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e4d9f5'}
                >
                  <span style={{ fontSize: '20px', marginRight: '14px', color: '#7f4ca5' }}>📍</span>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '15px',
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
                  gap: '10px',
                  margin: '12px 0 20px',
                  color: '#444',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#7b2cbf' }}
                  />
                  <span>Send me updates on WhatsApp</span>
                </label>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    height: '56px',
                    border: 'none',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg,#7b2cbf,#5a189a)',
                    color: 'white',
                    fontSize: '16px',
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
                  marginTop: '16px',
                  textAlign: 'center',
                  color: '#777',
                  fontSize: '11px',
                  lineHeight: 1.6,
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
