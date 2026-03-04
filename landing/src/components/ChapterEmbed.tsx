/**
 * ChapterEmbed — dynamically loads a chapter's App component at runtime via
 * Module Federation (@originjs/vite-plugin-federation).
 *
 * Each chapter builds a `remoteEntry.js` ES module that exports `get` and `init`
 * functions.  This component fetches that module at runtime and uses it to
 * render the chapter's React App inline — without a full page navigation.
 *
 * Usage:
 *   <ChapterEmbed chapterNumber={9} chapterColor="#8B5CF6" />
 */
import React, { Suspense, lazy, useState, useCallback, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Federation remote loader
// ---------------------------------------------------------------------------

/** Shape of a built remoteEntry.js module */
interface RemoteContainer {
  get: (module: string) => Promise<() => { default: React.ComponentType }>;
  init: (shareScope: Record<string, unknown>) => Promise<void>;
}

/** Cache of already-initialised containers */
const containerCache = new Map<number, RemoteContainer>();

/** Cache of lazy-wrapped App components */
const lazyCache = new Map<number, React.LazyExoticComponent<React.ComponentType>>();

/**
 * Returns the base URL for deployed chapter assets.
 * Falls back to a relative path when running in dev/test.
 */
function chapterBaseUrl(chapterNumber: number): string {
  const padded = String(chapterNumber).padStart(2, '0');
  // On jsurrea.github.io the site lives at /aima-visualizations/
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://jsurrea.github.io';
  return `${origin}/aima-visualizations/chapter-${padded}`;
}

/**
 * Dynamically imports the chapter's `remoteEntry.js`, initialises the
 * federation container, and returns a lazily-loaded React component.
 */
function getRemoteApp(chapterNumber: number): React.LazyExoticComponent<React.ComponentType> {
  if (lazyCache.has(chapterNumber)) {
    return lazyCache.get(chapterNumber)!;
  }

  const component = lazy(async () => {
    // Check container cache first
    let container = containerCache.get(chapterNumber);

    if (!container) {
      const remoteUrl = `${chapterBaseUrl(chapterNumber)}/assets/remoteEntry.js`;
      // Use /* @vite-ignore */ to skip Vite's static analysis of the dynamic URL
      const remote = await import(/* @vite-ignore */ remoteUrl) as RemoteContainer;
      // init() sets up the shared scope; pass empty object for simplicity
      await remote.init({});
      container = remote;
      containerCache.set(chapterNumber, container);
    }

    // get('./App') returns a factory function
    const factory = await container.get('./App');
    const mod = factory();
    return { default: mod.default };
  });

  lazyCache.set(chapterNumber, component);
  return component;
}

// ---------------------------------------------------------------------------
// Loading / error fallbacks
// ---------------------------------------------------------------------------

function LoadingSpinner({ color }: { color: string }) {
  return (
    <div
      role="status"
      aria-label="Loading chapter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        gap: '16px',
        color: '#9CA3AF',
        fontSize: '14px',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: `3px solid ${color}30`,
          borderTopColor: color,
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Loading chapter…
    </div>
  );
}

function ErrorFallback({
  chapterNumber,
  color,
  onRetry,
}: {
  chapterNumber: number;
  color: string;
  onRetry: () => void;
}) {
  const padded = String(chapterNumber).padStart(2, '0');
  return (
    <div
      role="alert"
      style={{
        padding: '32px 24px',
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: '14px',
      }}
    >
      <p style={{ marginBottom: '12px', color: '#EF4444' }}>
        Could not load chapter {padded} remotely.
      </p>
      <p style={{ marginBottom: '16px' }}>
        You can still open the full chapter page directly.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: `1px solid ${color}40`,
            background: `${color}15`,
            color: color,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Try again
        </button>
        <a
          href={`/aima-visualizations/chapter-${padded}/`}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: `1px solid ${color}40`,
            background: `${color}15`,
            color: color,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Open chapter page →
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error boundary (class component — required by React)
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  resetKey: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface ChapterEmbedProps {
  /** Chapter number (1–29). */
  chapterNumber: number;
  /** Accent color for the chapter (hex). Used for loading indicator and error state. */
  chapterColor?: string;
  /** Optional additional style for the outer wrapper. */
  style?: React.CSSProperties;
}

/**
 * Dynamically loads and renders a chapter's App component via Module Federation.
 *
 * The chapter's `remoteEntry.js` is fetched from the deployed GitHub Pages URL
 * on first render. React and react-dom are shared via the federation shared
 * scope to avoid duplicate instances.
 *
 * The chapter is wrapped in a `div` that re-declares the CSS custom properties
 * expected by each chapter's inline styles, so the component renders correctly
 * regardless of the host page's stylesheet.
 */
export default function ChapterEmbed({ chapterNumber, chapterColor = '#6366F1', style }: ChapterEmbedProps) {
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    // Clear caches so a fresh attempt is made
    lazyCache.delete(chapterNumber);
    containerCache.delete(chapterNumber);
    setRetryKey(k => k + 1);
  }, [chapterNumber]);

  const padded = String(chapterNumber).padStart(2, '0');
  const RemoteApp = getRemoteApp(chapterNumber);

  return (
    <div
      key={retryKey}
      style={{
        // Re-declare CSS custom properties used by chapter components
        '--surface-base': '#0A0A0F',
        '--surface-1': '#111118',
        '--surface-2': '#1A1A24',
        '--surface-3': '#242430',
        '--surface-border': 'rgba(255,255,255,0.08)',
        '--chapter-color': chapterColor,
        '--color-primary': chapterColor,
        '--radius': '12px',
        '--radius-lg': '20px',
        minHeight: '400px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        ...style,
      } as React.CSSProperties}
      aria-label={`Chapter ${padded} embedded visualization`}
      data-chapter={padded}
    >
      <ErrorBoundary
        resetKey={retryKey}
        fallback={
          <ErrorFallback
            chapterNumber={chapterNumber}
            color={chapterColor}
            onRetry={retry}
          />
        }
      >
        <Suspense fallback={<LoadingSpinner color={chapterColor} />}>
          <RemoteApp />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
