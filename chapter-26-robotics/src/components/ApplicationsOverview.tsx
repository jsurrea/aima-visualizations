import React, { useState } from 'react';

const CC = '#F59E0B';

const DOMAINS = [
  {
    name: 'Manipulation & Industrial',
    icon: '🦾',
    color: '#6366F1',
    examples: [
      { task: 'Automotive Welding', desc: 'ABB/KUKA arms spot-weld car frames at sub-mm precision, 24/7.', tech: 'Trajectory planning, force control' },
      { task: 'Circuit Board Assembly', desc: 'SMT robots pick and place chips at thousands per hour.', tech: 'Computer vision, high-speed servos' },
      { task: 'Surgical Assistance', desc: 'da Vinci robot amplifies surgeon hand motions and filters tremors.', tech: 'Teleoperation, haptic feedback' },
    ],
  },
  {
    name: 'Mobile / Outdoor',
    icon: '🏔️',
    color: '#10B981',
    examples: [
      { task: 'Mars Rovers', desc: 'Curiosity/Perseverance navigate autonomously over Martian terrain at ~100m/day.', tech: 'Visual odometry, SLAM, A*' },
      { task: 'Agricultural Robots', desc: 'Harvest strawberries, prune vines — unstructured outdoor environments.', tech: 'Computer vision, GPS+SLAM' },
      { task: 'Search & Rescue', desc: 'Navigate collapsed buildings, locate survivors via thermal cameras.', tech: 'SLAM, multi-robot coordination' },
    ],
  },
  {
    name: 'Autonomous Vehicles',
    icon: '🚗',
    color: '#EC4899',
    examples: [
      { task: 'Self-Driving Cars', desc: 'Waymo robotaxi operates commercially in Phoenix — 100% autonomously on public roads.', tech: 'LIDAR, HD maps, behavior prediction' },
      { task: 'Mining Trucks', desc: 'Rio Tinto operates 100+ autonomous haul trucks in Australian mines since 2008.', tech: 'GPS, obstacle avoidance, fleet coordination' },
      { task: 'Airport Tugs', desc: 'Push aircraft to gates without human drivers.', tech: 'Precise localization, safety systems' },
    ],
  },
  {
    name: 'Home & Service',
    icon: '🏠',
    color: '#F59E0B',
    examples: [
      { task: 'Vacuum Cleaning', desc: 'Roomba navigates around furniture, builds a room map, returns to charger.', tech: 'MCL, bump sensors, camera SLAM' },
      { task: 'Warehouse Logistics', desc: 'Amazon Kiva robots move entire shelving units to workers.', tech: 'Grid navigation, fleet scheduling' },
      { task: 'Delivery Robots', desc: 'Starship sidewalk robots deliver food/packages at campuses.', tech: 'SLAM, pedestrian detection' },
    ],
  },
  {
    name: 'Aerial & Underwater',
    icon: '🌊',
    color: '#8B5CF6',
    examples: [
      { task: 'Power Line Inspection', desc: 'Drones autonomously follow power lines, detect faults via thermal cameras.', tech: 'Computer vision, GPS-denied navigation' },
      { task: 'Pipeline Inspection', desc: 'Underwater AUVs map subsea pipelines for oil & gas companies.', tech: 'Acoustic localization, sonar' },
      { task: 'Disaster Response', desc: 'Deploy UAVs to map disaster zones and direct responders.', tech: 'Real-time mapping, communications relay' },
    ],
  },
];

const FUTURE_CHALLENGES = [
  { label: 'Manipulation dexterity', desc: 'Humans can pick up a grape without crushing it and a hammer with a firm grip. Robots still struggle to achieve this.', icon: '✋' },
  { label: 'Long-horizon planning', desc: 'Planning thousands of steps into the future (cooking a meal from scratch) requires combining high-level reasoning with low-level control.', icon: '🗓️' },
  { label: 'Learning from few examples', desc: 'Humans learn a new task from 1-2 demonstrations. Current RL needs thousands to millions of trials.', icon: '💡' },
  { label: 'Safe AI deployment', desc: 'Verifying that a neural-network policy will never harm a human is an open research problem.', icon: '🛡️' },
  { label: 'Natural language interface', desc: 'Telling a robot "please set the table" and having it figure out the rest is a key challenge for HRI.', icon: '💬' },
];

export default function ApplicationsOverview() {
  const [selectedDomain, setSelectedDomain] = useState(0);
  const [showFuture, setShowFuture] = useState(false);

  const domain = DOMAINS[selectedDomain]!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '12px' }}>§26.10 Robotics Application Domains</h3>

        {/* Domain tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {DOMAINS.map((d, i) => (
            <button key={d.name}
              onClick={() => setSelectedDomain(i)}
              style={{
                background: selectedDomain === i ? `${d.color}20` : '#1A1A24',
                border: `1px solid ${selectedDomain === i ? d.color : 'rgba(255,255,255,0.08)'}`,
                color: selectedDomain === i ? d.color : '#9CA3AF',
                borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '12px',
              }}
              aria-pressed={selectedDomain === i}>
              {d.icon} {d.name}
            </button>
          ))}
        </div>

        {/* Domain content */}
        <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '28px' }}>{domain.icon}</span>
            <span style={{ fontWeight: 700, fontSize: '16px', color: domain.color }}>{domain.name}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {domain.examples.map(ex => (
              <div key={ex.task} style={{ background: '#242430', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: 'white' }}>{ex.task}</div>
                <div style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.5, marginBottom: '6px' }}>{ex.desc}</div>
                <div style={{ display: 'inline-block', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: `${domain.color}15`, color: domain.color }}>
                  {ex.tech}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key algorithms used across domains */}
        <div style={{ background: '#0A0A0F', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: CC, marginBottom: '10px' }}>
            Core Technologies Across All Domains
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
            {[
              { name: 'SLAM', desc: 'Simultaneous Localization and Mapping — build map while using it to localize' },
              { name: 'Motion Planning', desc: 'RRT, PRM — find collision-free paths in C-space' },
              { name: 'State Estimation', desc: 'EKF, Particle filter — maintain belief over robot state' },
              { name: 'Trajectory Control', desc: 'PID, MPC — execute planned motions accurately' },
              { name: 'Computer Vision', desc: 'Object detection, depth estimation, semantic segmentation' },
              { name: 'Behavior Trees / FSM', desc: 'Reactive control for robust real-time decision making' },
            ].map(tech => (
              <div key={tech.name} style={{ background: '#111118', borderRadius: '6px', padding: '10px' }}>
                <div style={{ fontWeight: 600, fontSize: '12px', color: CC, marginBottom: '4px' }}>{tech.name}</div>
                <div style={{ color: '#6B7280', fontSize: '11px', lineHeight: 1.4 }}>{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open challenges */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC }}>Open Challenges & The Future</h3>
          <button
            onClick={() => setShowFuture(f => !f)}
            style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#9CA3AF', padding: '4px 12px', cursor: 'pointer', fontSize: '12px' }}
            aria-expanded={showFuture}>
            {showFuture ? 'Hide ▲' : 'Show ▼'}
          </button>
        </div>

        {showFuture && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FUTURE_CHALLENGES.map(ch => (
              <div key={ch.label} style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px', display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{ch.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{ch.label}</div>
                  <div style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.5 }}>{ch.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chapter summary */}
        <div style={{ marginTop: '16px', background: '#0A0A0F', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: CC, marginBottom: '10px' }}>Chapter 26 Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              'Robots are physical agents with effectors + sensors operating in the real, continuous world.',
              'Localization (where am I?) uses particle filters (MCL) or EKF. SLAM does both simultaneously.',
              'Motion planning in C-space: RRT/PRM for sampling-based methods; trajectory optimization for smooth paths.',
              'Trajectory tracking uses PID (closed-loop feedback) or MPC (receding horizon optimization).',
              'Uncertainty calls for POMDP policies, MPC replanning, or guarded motions — not just the most likely state.',
              'RL in robotics: sim-to-real transfer via domain randomization bridges the simulation gap.',
              'Human-robot interaction: Boltzmann rationality models let robots infer human intent from observations.',
              'Reactive control (subsumption) layers simple behaviors, enabling robust real-time response.',
            ].map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#D1D5DB', lineHeight: 1.5 }}>
                <span style={{ color: CC, flexShrink: 0, fontWeight: 700 }}>{i + 1}.</span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
