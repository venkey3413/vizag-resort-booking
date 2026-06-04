import { useState } from 'react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', whatsapp: true });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contact" style={{ padding: '40px 2%', background: 'linear-gradient(135deg,#f8f2ff,#f4ecff)' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth > 1024 ? '1fr 1fr' : '1fr',
        background: '#fff',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(125,87,175,.12)',
        maxWidth: '1000px',
        margin: 'auto',
        minHeight: window.innerWidth > 1024 ? '600px' : 'auto'
      }}>
        
        {/* LEFT IMAGE AREA */}
        <div style={{ position: 'relative', minHeight: '400px' }}>
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

          {/* FEATURES - Now at bottom with smaller size */}
          <div style={{
            position: 'absolute',
            bottom: '15px',
            left: '15px',
            right: '15px',
            zIndex: 2,
            background: 'rgba(255,255,255,.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: '8px',
            padding: '10px',
          }}>
            {[
              { icon: '🪑', title: 'Expert Designers', desc: 'Luxury interiors.' },
              { icon: '✨', title: 'Personalized', desc: 'Tailored concepts.' },
              { icon: '🏆', title: 'Premium Quality', desc: 'High-end finishes.' },
            ].map((feature, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  margin: 'auto',
                  marginBottom: '6px',
                  borderRadius: '50%',
                  border: '2px solid #8a45d1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  color: '#8a45d1',
                  background: '#f8f2ff',
                }}>
                  {feature.icon}
                </div>
                <h4 style={{ fontSize: '11px', color: '#4b2367', marginBottom: '4px', fontWeight: 700 }}>{feature.title}</h4>
                <p style={{ color: '#666', lineHeight: 1.4, fontSize: '9px' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT FORM AREA */}
        <div style={{
          padding: '25px 30px',
          background: 'linear-gradient(180deg,#f9f5ff,#f5effd)',
          position: 'relative',
          overflowY: 'auto',
          maxHeight: window.innerWidth > 1024 ? '600px' : 'none'
        }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>✅</div>
              <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: '#5f238b' }}>Thank You!</h3>
              <p style={{ color: '#555', fontSize: 13 }}>We've received your inquiry. Our design expert will reach out within 24 hours.</p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '16px', position: 'relative', zIndex: 2 }}>
                <span style={{ color: '#b07a2d', letterSpacing: '2px', fontSize: '10px', fontWeight: 600 }}>
                  BOOK FREE
                </span>
                <h2 style={{
                  fontSize: '32px',
                  lineHeight: 1,
                  margin: '8px 0',
                  color: '#5f238b',
                  fontFamily: 'Playfair Display, serif',
                }}>
                  Consultation
                </h2>
                <p style={{ color: '#555', lineHeight: 1.5, fontSize: '11px' }}>
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
                    height: '48px',
                    background: '#fff',
                    border: '1.5px solid #e4d9f5',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px',
                    padding: '0 16px',
                    transition: '.3s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9b5fe0'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e4d9f5'}
                  >
                    <span style={{ fontSize: '18px', marginRight: '12px', color: '#7f4ca5' }}>{input.icon}</span>
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
                        fontSize: '14px',
                        color: '#444',
                        fontFamily: 'Poppins, sans-serif',
                      }}
                    />
                  </div>
                ))}

                <div style={{
                  height: '48px',
                  background: '#fff',
                  border: '1.5px solid #e4d9f5',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '12px',
                  padding: '0 16px',
                  transition: '.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9b5fe0'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e4d9f5'}
                >
                  <span style={{ fontSize: '18px', marginRight: '12px', color: '#7f4ca5' }}>📍</span>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '14px',
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
                  gap: '8px',
                  margin: '10px 0 16px',
                  color: '#444',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#7b2cbf' }}
                  />
                  <span>Send me updates on WhatsApp</span>
                </label>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    height: '50px',
                    border: 'none',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg,#7b2cbf,#5a189a)',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: '.4s',
                    boxShadow: '0 15px 30px rgba(123,44,191,.25)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
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
                  marginTop: '14px',
                  textAlign: 'center',
                  color: '#777',
                  fontSize: '10px',
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
