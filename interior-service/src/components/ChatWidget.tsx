import { useState, useRef, useEffect } from 'react';

type Message = { from: 'bot' | 'user'; text: string };

const QUICK = ['View Portfolio', 'Get a Quote', 'Design Styles', 'Our Process'];

const BOT_REPLIES: Record<string, string> = {
  'view portfolio': 'We have 500+ stunning projects! Scroll up to our Portfolio section to explore by category — Residential, Luxury, Commercial, and Minimalist.',
  'get a quote': 'Getting a quote is easy! Fill out our contact form above or tell me your project type and budget range and I\'ll guide you.',
  'design styles': 'We specialize in Modern, Classic, Minimalist, Scandinavian, Art Deco, and Coastal styles. What resonates with you?',
  'our process': '1. Free Consultation → 2. Concept & Mood Board → 3. Design Development → 4. Procurement → 5. Installation → 6. Final Reveal! 🎉',
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { from: 'bot', text: 'Hello! Welcome to Interiors. I\'m here to help you create your dream space. How can I assist you today?' },
  ]);
  const [input, setInput] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, open]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { from: 'user', text };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setTimeout(() => {
      const key = text.toLowerCase();
      const reply = Object.entries(BOT_REPLIES).find(([k]) => key.includes(k))?.[1]
        ?? 'Great question! Our team of expert designers would love to help. Please fill out the contact form above or call us at +1 (212) 555-8899 for immediate assistance.';
      setMessages(m => [...m, { from: 'bot', text: reply }]);
    }, 700);
  };

  return (
    <div className="vrb-chat-widget">
      <div className={`vrb-chat-box${open ? ' open' : ''}`}>
        <div className="vrb-chat-header">
          <div className="vrb-chat-title">
            <img src="https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=60" alt="designer" />
            <div>
              <h4>Design Assistant</h4>
              <p className="chat-status">● Online now</p>
            </div>
          </div>
          <button className="vrb-chat-close" onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className="vrb-chat-body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div key={i} className={`vrb-msg ${m.from === 'bot' ? 'vrb-bot' : 'vrb-user'}`}>
              {m.from === 'bot' && <div className="bot-avatar">✨</div>}
              <div className="msg-content">{m.text}</div>
            </div>
          ))}
        </div>

        <div className="vrb-chat-quick">
          {QUICK.map(q => (
            <button key={q} className="vrb-q" onClick={() => send(q)}>{q}</button>
          ))}
        </div>

        <div className="vrb-chat-footer">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask about our services..."
          />
          <button className="vrb-chat-send" onClick={() => send(input)}>➤</button>
        </div>
      </div>

      <button className="vrb-chat-fab" onClick={() => setOpen(!open)}>
        <div className="chat-pulse" />
        <span style={{ fontSize: 24, position: 'relative', zIndex: 1 }}>💬</span>
      </button>
    </div>
  );
}
