import React from 'react';
import manifest from '../manifest.json';
import NormalFormGameViz from './components/NormalFormGameViz';
import RepeatedGameViz from './components/RepeatedGameViz';
import ShapleyViz from './components/ShapleyViz';
import AuctionViz from './components/AuctionViz';
import VotingViz from './components/VotingViz';
import BargainingViz from './components/BargainingViz';

const CHAPTER_COLOR = '#EC4899';

const sectionStyle: React.CSSProperties = {
  padding: '0 24px 48px',
  maxWidth: '960px',
  margin: '0 auto',
};

const vizHeadingStyle: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 700,
  color: 'white',
  marginBottom: '8px',
  borderLeft: `4px solid ${CHAPTER_COLOR}`,
  paddingLeft: '16px',
};

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base)', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: 'var(--surface-1)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px' }}>
        <a
          href="/aima-visualizations/"
          style={{ color: 'var(--chapter-color)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
          aria-label="Back to all chapters"
        >
          ← Back to All Chapters
        </a>
      </header>

      {/* Chapter hero */}
      <section style={{ padding: '48px 24px 32px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px', borderRadius: '12px',
            background: `${manifest.color}20`, color: manifest.color, fontWeight: 700, fontSize: '18px',
          }}>
            {String(manifest.chapter).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '32px' }} aria-hidden="true">{manifest.icon}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, marginBottom: '12px' }}>
          {manifest.title}
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1.6, maxWidth: '600px' }}>
          {manifest.description}
        </p>
      </section>

      {/* Visualizations */}
      <section style={sectionStyle}>
        <div style={{ marginBottom: '48px' }}>
          <h2 style={vizHeadingStyle}>17.1 — Normal-Form Games &amp; Nash Equilibria</h2>
          <p style={{ color: '#9CA3AF', marginBottom: '24px' }}>Explore payoff matrices, Nash equilibria, dominant strategies, and social welfare in two-player games.</p>
          <NormalFormGameViz />
        </div>
        <div style={{ marginBottom: '48px' }}>
          <h2 style={vizHeadingStyle}>17.2 — Repeated Games &amp; Strategies</h2>
          <p style={{ color: '#9CA3AF', marginBottom: '24px' }}>Simulate iterated prisoner's dilemma with strategies like Tit-for-Tat and Grim Trigger.</p>
          <RepeatedGameViz />
        </div>
        <div style={{ marginBottom: '48px' }}>
          <h2 style={vizHeadingStyle}>17.3 — Cooperative Games &amp; Shapley Value</h2>
          <p style={{ color: '#9CA3AF', marginBottom: '24px' }}>Compute fair value distributions using the Shapley value and analyze coalition stability via the core.</p>
          <ShapleyViz />
        </div>
        <div style={{ marginBottom: '48px' }}>
          <h2 style={vizHeadingStyle}>17.4 — Auction Mechanisms</h2>
          <p style={{ color: '#9CA3AF', marginBottom: '24px' }}>Compare English, Vickrey, and VCG auction formats — observe how mechanism design affects bidder strategy and revenue.</p>
          <AuctionViz />
        </div>
        <div style={{ marginBottom: '48px' }}>
          <h2 style={vizHeadingStyle}>17.5 — Voting Procedures</h2>
          <p style={{ color: '#9CA3AF', marginBottom: '24px' }}>Compare plurality, Borda count, instant-runoff, and Condorcet voting with interactive preference profiles.</p>
          <VotingViz />
        </div>
        <div style={{ marginBottom: '48px' }}>
          <h2 style={vizHeadingStyle}>17.6 — Bargaining</h2>
          <p style={{ color: '#9CA3AF', marginBottom: '24px' }}>Visualize Rubinstein alternating-offers and Zeuthen negotiation protocols.</p>
          <BargainingViz />
        </div>
      </section>
    </div>
  );
}
