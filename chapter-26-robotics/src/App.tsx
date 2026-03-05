import React from 'react';
import manifest from '../manifest.json';
import RoboticsOverview from './components/RoboticsOverview';
import ConfigSpaceViz from './components/ConfigSpaceViz';
import LocalizationViz from './components/LocalizationViz';
import MotionPlanningViz from './components/MotionPlanningViz';
import ControlViz from './components/ControlViz';
import UncertaintyViz from './components/UncertaintyViz';
import RLRoboticsViz from './components/RLRoboticsViz';
import HumanRobotViz from './components/HumanRobotViz';
import ApplicationsOverview from './components/ApplicationsOverview';

const NAV_LINKS = [
  { id: 'overview', label: 'Overview' },
  { id: 'config-space', label: 'C-Space' },
  { id: 'localization', label: 'Localization' },
  { id: 'motion-planning', label: 'Motion Planning' },
  { id: 'control', label: 'Control' },
  { id: 'uncertainty', label: 'Uncertainty' },
  { id: 'rl-robotics', label: 'RL' },
  { id: 'human-robot', label: 'HRI' },
  { id: 'applications', label: 'Applications' },
] as const;

const SECTIONS = [
  { id: 'overview', title: '§26.1–26.3 Robots, Hardware & Problem Types', component: <RoboticsOverview /> },
  { id: 'config-space', title: '§26.3–26.5 Configuration Space & Kinematics', component: <ConfigSpaceViz /> },
  { id: 'localization', title: '§26.4 Robotic Perception & Localization (MCL / EKF)', component: <LocalizationViz /> },
  { id: 'motion-planning', title: '§26.5.2 Motion Planning (RRT & PRM)', component: <MotionPlanningViz /> },
  { id: 'control', title: '§26.5.3–26.5.4 Trajectory Tracking Control (PID & MPC)', component: <ControlViz /> },
  { id: 'uncertainty', title: '§26.6 Planning Uncertain Movements', component: <UncertaintyViz /> },
  { id: 'rl-robotics', title: '§26.7 Reinforcement Learning in Robotics', component: <RLRoboticsViz /> },
  { id: 'human-robot', title: '§26.8–26.9 Human-Robot Interaction & Reactive Controllers', component: <HumanRobotViz /> },
  { id: 'applications', title: '§26.10 Application Domains & Future Challenges', component: <ApplicationsOverview /> },
] as const;

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base)', color: 'white', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <header style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--surface-border)', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <a href="/aima-visualizations/" style={{ color: manifest.color, textDecoration: 'none', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap' }} aria-label="Back to all chapters">
            ← Back
          </a>
          <nav aria-label="Section navigation" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto' }}>
            {NAV_LINKS.map(link => (
              <a key={link.id} href={`#${link.id}`} style={{ color: '#9CA3AF', textDecoration: 'none', fontSize: '13px', whiteSpace: 'nowrap', padding: '4px 8px', borderRadius: '4px' }}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section style={{ padding: '48px 24px 32px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: `${manifest.color}20`, color: manifest.color, fontWeight: 700, fontSize: '18px' }}>
            {String(manifest.chapter).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '32px' }} aria-hidden="true">{manifest.icon}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, marginBottom: '12px' }}>{manifest.title}</h1>
        <p style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1.6, maxWidth: '600px' }}>{manifest.description}</p>
      </section>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 64px' }}>
        {SECTIONS.map(section => (
          <section key={section.id} id={section.id} style={{ marginBottom: '64px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', color: '#E5E7EB', borderBottom: `2px solid ${manifest.color}40`, paddingBottom: '12px' }}>
              {section.title}
            </h2>
            {section.component}
          </section>
        ))}
      </main>
    </div>
  );
}

