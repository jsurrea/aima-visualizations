import katex from 'katex';

/**
 * Render a LaTeX string to an HTML string using KaTeX.
 * Returns an empty string if the input is empty.
 */
export function renderMath(latex: string, displayMode = false): string {
  if (!latex) return '';
  return katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
  });
}

/**
 * Returns a CSS color string with the given opacity applied.
 */
export function withOpacity(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Returns true if the user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
