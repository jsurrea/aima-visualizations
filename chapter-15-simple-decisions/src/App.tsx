import MEUExplorer from './components/MEUExplorer';
import UtilityAxiomsViz from './components/UtilityAxiomsViz';
import UtilityFunctionsViz from './components/UtilityFunctionsViz';
import MultiattributeViz from './components/MultiattributeViz';
import DecisionNetworkViz from './components/DecisionNetworkViz';
import VPIExplorer from './components/VPIExplorer';
import UnknownPreferencesViz from './components/UnknownPreferencesViz';
import manifest from '../manifest.json';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px' }}>
        <a href="/aima-visualizations/" style={{ color: '#EC4899', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }} aria-label="Back to all chapters">
          ← Back to All Chapters
        </a>
      </header>
      <section style={{ padding: '48px 24px 32px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: '#EC489920', color: '#EC4899', fontWeight: 700, fontSize: '18px' }}>
            {String(manifest.chapter).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '32px' }} aria-hidden="true">{manifest.icon}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, marginBottom: '12px' }}>{manifest.title}</h1>
        <p style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1.6, maxWidth: '600px' }}>{manifest.description}</p>
      </section>
      <section style={{ padding: '0 24px 48px', maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '32px' }}>
        <MEUExplorer />
        <UtilityAxiomsViz />
        <UtilityFunctionsViz />
        <MultiattributeViz />
        <DecisionNetworkViz />
        <VPIExplorer />
        <UnknownPreferencesViz />
      </section>
    </div>
  );
}
