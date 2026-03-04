import katex from 'katex';

/**
 * Renders a LaTeX expression as inline HTML using KaTeX.
 *
 * @param latex - The LaTeX source string (without delimiters).
 * @returns HTML string with rendered math.
 */
export function renderInlineMath(latex: string): string {
  return katex.renderToString(latex, { throwOnError: false, displayMode: false });
}

/**
 * Renders a LaTeX expression in display mode using KaTeX.
 *
 * @param latex - The LaTeX source string (without delimiters).
 * @returns HTML string with rendered display math.
 */
export function renderDisplayMath(latex: string): string {
  return katex.renderToString(latex, { throwOnError: false, displayMode: true });
}

/**
 * Linearly interpolates between two hex colors.
 *
 * @param color1 - Start hex color (e.g. "#FF0000").
 * @param color2 - End hex color (e.g. "#0000FF").
 * @param t - Interpolation parameter in [0, 1].
 * @returns Interpolated hex color string.
 * @complexity O(1)
 */
export function interpolateColor(color1: string, color2: string, t: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const parse = (hex: string) => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean;
    const n = parseInt(full, 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as const;
  };
  const [r1, g1, b1] = parse(color1);
  const [r2, g2, b2] = parse(color2);
  const r = clamp(r1 + (r2 - r1) * t);
  const g = clamp(g1 + (g2 - g1) * t);
  const b = clamp(b1 + (b2 - b1) * t);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Smooth ease-in-out function (cubic).
 *
 * @param t - Input parameter in [0, 1].
 * @returns Smoothed value in [0, 1].
 * @complexity O(1)
 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Returns a promise that resolves after the specified number of milliseconds.
 * Useful for step-by-step animation delays.
 *
 * @param ms - Duration in milliseconds.
 * @returns A promise resolving after `ms` milliseconds.
 * @complexity O(1)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Returns a consistent CSSProperties object for the chapter's standard button style.
 *
 * @param active   Whether the button is in an active/pressed state.
 * @param disabled Whether the button is disabled.
 * @param color    Primary accent color (default: chapter color #10B981).
 * @returns React CSSProperties object.
 * @complexity O(1)
 */
export function btnStyle(
  active: boolean,
  disabled: boolean,
  color = '#10B981',
): React.CSSProperties {
  return {
    padding: '7px 14px',
    borderRadius: '7px',
    border: `1px solid ${active ? color : 'rgba(255,255,255,0.12)'}`,
    background: active ? `${color}20` : 'transparent',
    color: disabled ? '#374151' : active ? color : '#D1D5DB',
    fontSize: '13px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
    opacity: disabled ? 0.4 : 1,
  };
}
