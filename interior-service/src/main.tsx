import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Scroll animation observer
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
      }
    });
  },
  { threshold: 0.1 }
);

const observeElements = () => {
  document.querySelectorAll('.vrb-anim').forEach((el) => observer.observe(el));
};

observeElements();
const mutationObserver = new MutationObserver(observeElements);
mutationObserver.observe(document.body, { childList: true, subtree: true });
