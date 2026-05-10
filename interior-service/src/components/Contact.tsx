import { useState } from 'react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', type: '', budget: '', message: '' });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contact" className="vrb-section" style={{ background: 'linear-gradient(135deg, #f8f9ff, #e8f0fe)' }}>
      <div className="vrb-container">
        <div className="vrb-section-head vrb-anim">
          <div className="vrb-title">Start Your Design Journey</div>
          <p className="vrb-subtitle">Book a free 30-minute consultation with one of our senior designers</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 40, marginTop: 50, alignItems: 'start' }}>
          {/* Left info */}
          <div className="vrb-anim">
            <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: 36, boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: 26, fontWeight: 900, marginBottom: 16, color: '#0f172a' }}>Let's Create Something Extraordinary</h3>
              <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: 28 }}>
                Whether you're starting from scratch or refreshing an existing space, our team is ready to bring your vision to life with precision and artistry.
              </p>

              {[
                ['📍', 'Studio Address', '432 Park Avenue, Suite 1800, New York, NY 10022'],
                ['📞', 'Phone', '+1 (212) 555-8899'],
                ['✉️', 'Email', 'hello@interiors.com'],
                ['🕐', 'Hours', 'Mon–Fri: 9am–7pm · Sat: 10am–5pm'],
              ].map(([icon, label, value]) => (
                <div key={label} style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,111,0,0.1)', border: '1px solid rgba(255,111,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="vrb-anim">
            <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: 36, boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
                  <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>Thank You!</h3>
                  <p style={{ color: '#475569' }}>We've received your inquiry. A senior designer will reach out within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handle} className="vrb-form">
                  <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4, color: '#0f172a' }}>Book Free Consultation</h3>
                  <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>Fill in your details and we'll be in touch shortly.</p>

                  <div className="vrb-form-grid">
                    <input
                      placeholder="Your Full Name"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="vrb-form-grid">
                    <input
                      placeholder="Phone Number"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                    />
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required>
                      <option value="">Project Type</option>
                      <option>Residential Interior</option>
                      <option>Commercial Space</option>
                      <option>Luxury Villa</option>
                      <option>Office Design</option>
                      <option>Hospitality</option>
                    </select>
                  </div>
                  <select value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} required>
                    <option value="">Budget Range</option>
                    <option>$10K – $50K</option>
                    <option>$50K – $150K</option>
                    <option>$150K – $500K</option>
                    <option>$500K+</option>
                  </select>
                  <textarea
                    placeholder="Tell us about your project, style preferences, and timeline..."
                    rows={4}
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(15,23,42,0.12)', fontWeight: 700, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                  <button type="submit" className="vrb-btn vrb-btn-orange" style={{ width: '100%', padding: '16px', fontSize: 16 }}>
                    Book My Free Consultation →
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
