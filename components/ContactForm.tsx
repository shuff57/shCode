import Script from 'next/script';
import type { CSSProperties } from 'react';

// The shared Left Hand Dev contact form (repo lhd-contact, https://contact.lefthanddev.com).
// embed.js draws the form into the empty placeholder and sends it to support@lefthanddev.com
// (site key "shcode"). React must never render children into the placeholder.
// The colours are the theme's variables, so every theme (Dracula, light, ...) applies.
const card = {
  background: 'var(--c-deep)',
  border: '1px solid var(--c-line)',
  borderRadius: 8,
  padding: 24,
  margin: '8px 0 24px',
  lineHeight: 1.5,
  '--lhd-cf-accent': 'var(--brand)',
  '--lhd-cf-field-bg': 'var(--c-bg)',
  '--lhd-cf-border': '1px solid var(--c-line)',
  '--lhd-cf-radius': '4px',
  '--lhd-cf-btn-bg': 'var(--brand)',
  '--lhd-cf-btn-fg': 'var(--on-brand)',
  '--lhd-cf-error': 'var(--c-red)',
  '--lhd-cf-max': '100%',
} as CSSProperties;

export default function ContactForm() {
  return (
    <section style={card} aria-label="Send us a message">
      <div data-lhd-contact data-site="shcode" suppressHydrationWarning />
      <Script src="https://contact.lefthanddev.com/embed.js" strategy="afterInteractive" />
    </section>
  );
}
