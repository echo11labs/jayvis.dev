'use client';

import { useEffect } from 'react';

/** Keeps the Next.js dev overlay out of the product accessibility tree. */
export function DevChrome() {
  useEffect(() => {
    const hide = () => {
      document.querySelectorAll('nextjs-portal').forEach((el) => {
        if (el.getAttribute('data-jayvis-hidden') === 'true') return;
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('inert', '');
        el.setAttribute('data-jayvis-hidden', 'true');
        if (el instanceof HTMLElement) el.style.setProperty('display', 'none', 'important');
      });
    };
    hide();
    const observer = new MutationObserver(hide);
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
