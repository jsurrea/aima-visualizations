import React, { useState } from 'react';
import { evaluateDomainRandomization, type DomainRandomizationResult } from '../algorithms/index';

const CC = '#F59E0B';

export default function RLRoboticsViz() {
  const [kp, setKp] = useState(5);
  const [frictionLo, setFrictionLo] = useState(0.1);
  const [frictionHi, setFrictionHi] = useState(0.9);
  const [numInstances, setNumInstances] = useState(30);

  const results = evaluateDomainRandomization(0, 1, frictionLo, frictionHi, numInstances, 100, 0.01, kp, 42);
  const successRate = (results.filter(r => r.success).length / results.length * 100).toFixed(1);

  const sortedByParam = [...results].sort((a, b) => a.paramValue - b.paramValue);

  // Simulate narrow vs wide domain randomization
  const narrowResults = evaluateDomainRandomization(0, 1, 0.4, 0.6, numInstances, 100, 0.01, kp, 42);
  const wideResults = evaluateDomainRandomization(0, 1, 0.05, 0.95, numInstances, 100, 0.01, kp, 42);
  const narrowSucc = (narrowResults.filter(r => r.success).length / narrowResults.length * 100).toFixed(1);
  const wideSucc = (wideResults.filter(r => r.success).length / wideResults.length * 100).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* RL in Robotics concepts */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '8px' }}>§26.7 Reinforcement Learning in Robotics</h3>
        <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
          When we don't have a dynamics model, RL can learn from trial-and-error. But robots can't run millions of trials in real time!
          The <strong style={{ color: CC }}>sim-to-real problem</strong>: learn in simulation (fast), then transfer to real robot.
          <strong style={{ color: CC }}> Domain randomization</strong> makes the policy robust by training across many randomized simulation variants.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            {
              title: 'Model-Free RL', icon: '🎲', color: '#10B981',
              desc: 'Learn policy directly from rewards. Works without knowing dynamics. But needs many samples — too slow on real robots.',
            },
            {
              title: 'Model-Based RL', icon: '🗺️', color: '#6366F1',
              desc: 'Learn a dynamics model first, then plan in it. Much more sample efficient. But model errors compound.',
            },
            {
              title: 'Domain Randomization', icon: '🎨', color: CC,
              desc: 'Train across many simulation variants (friction, mass, etc.). Policy becomes robust to real-world variation.',
            },
            {
              title: 'Imitation Learning', icon: '🎓', color: '#8B5CF6',
              desc: 'Learn from human demonstrations. Much faster than RL from scratch. Used for learning human preferences.',
            },
          ].map(item => (
            <div key={item.title} style={{ background: '#1A1A24', borderRadius: '8px', padding: '14px', border: `1px solid ${item.color}30` }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontWeight: 700, color: item.color, marginBottom: '6px', fontSize: '13px' }}>{item.title}</div>
              <div style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Domain randomization visualization */}
        <div style={{ background: '#0A0A0F', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontWeight: 700, color: CC, fontSize: '13px', marginBottom: '12px' }}>
            Interactive: Domain Randomization Experiment
          </div>
          <p style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.6, marginBottom: '14px' }}>
            A proportional controller (gain K_P) tries to reach goal=1.0 from start=0 in a 1-D world with friction.
            Friction is sampled from [lo, hi]. How does the success rate change with gain and friction range?
          </p>

          {/* Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
              Proportional Gain K_P: <span style={{ color: CC }}>{kp}</span>
              <input type="range" min={0.5} max={20} step={0.5} value={kp}
                onChange={e => setKp(Number(e.target.value))}
                style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="Proportional gain" />
            </label>
            <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
              Friction Low: <span style={{ color: CC }}>{frictionLo.toFixed(2)}</span>
              <input type="range" min={0.01} max={0.5} step={0.01} value={frictionLo}
                onChange={e => setFrictionLo(Math.min(Number(e.target.value), frictionHi - 0.05))}
                style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="Friction low" />
            </label>
            <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
              Friction High: <span style={{ color: CC }}>{frictionHi.toFixed(2)}</span>
              <input type="range" min={0.5} max={0.99} step={0.01} value={frictionHi}
                onChange={e => setFrictionHi(Math.max(Number(e.target.value), frictionLo + 0.05))}
                style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="Friction high" />
            </label>
            <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
              # Instances: <span style={{ color: CC }}>{numInstances}</span>
              <input type="range" min={10} max={60} step={5} value={numInstances}
                onChange={e => setNumInstances(Number(e.target.value))}
                style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="Number of instances" />
            </label>
          </div>

          {/* Results chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '80px', background: '#111118', borderRadius: '6px', padding: '8px', overflowX: 'auto' }}>
            {sortedByParam.map((r, i) => (
              <div
                key={i}
                title={`Friction: ${r.paramValue.toFixed(3)}, Reward: ${r.reward.toFixed(1)}, ${r.success ? 'SUCCESS' : 'FAIL'}`}
                style={{
                  flex: '1', minWidth: '6px', maxWidth: '20px',
                  height: `${Math.max(4, (Math.abs(r.reward) / (numInstances * 100)) * 64)}px`,
                  background: r.success ? '#10B981' : '#EF4444',
                  borderRadius: '2px 2px 0 0',
                  opacity: 0.8,
                  transition: 'height 0.2s',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>
            <span>friction={frictionLo.toFixed(2)}</span>
            <span>← sorted by friction parameter →</span>
            <span>friction={frictionHi.toFixed(2)}</span>
          </div>

          {/* Summary */}
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { label: 'Success Rate', value: `${successRate}%`, color: parseFloat(successRate) > 70 ? '#10B981' : '#EF4444' },
              { label: '✓ Successes', value: String(results.filter(r => r.success).length), color: '#10B981' },
              { label: '✗ Failures', value: String(results.filter(r => !r.success).length), color: '#EF4444' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#111118', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <div style={{ color: '#6B7280', fontSize: '11px', marginBottom: '4px' }}>{label}</div>
                <div style={{ color, fontSize: '18px', fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Narrow vs Wide domain randomization */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '12px' }}>
          Narrow vs Wide Domain Randomization (K_P={kp})
        </h3>
        <p style={{ color: '#9CA3AF', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
          If you train with only narrow friction variation, the policy is brittle outside that range.
          Wide randomization produces more robust policies — but may be harder to train.
          This is the core insight behind domain randomization as a sim-to-real transfer technique.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Narrow DR', range: 'friction ∈ [0.4, 0.6]', succRate: narrowSucc, color: '#60A5FA' },
            { label: 'Wide DR', range: 'friction ∈ [0.05, 0.95]', succRate: wideSucc, color: CC },
          ].map(item => (
            <div key={item.label} style={{ background: '#1A1A24', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: item.color, marginBottom: '4px' }}>{item.label}</div>
              <div style={{ color: '#6B7280', fontSize: '12px', marginBottom: '8px' }}>{item.range}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: parseFloat(item.succRate) > 50 ? '#10B981' : '#EF4444' }}>
                {item.succRate}%
              </div>
              <div style={{ color: '#6B7280', fontSize: '11px', marginTop: '4px' }}>success rate</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sim-to-real challenges */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '12px' }}>
          The Sim-to-Real Gap
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {[
            { label: 'Physics fidelity', desc: 'Real friction, elasticity, and deformation are hard to simulate exactly', icon: '⚙️' },
            { label: 'Sensor noise', desc: 'Real cameras, LIDAR have noise patterns not captured by simulation', icon: '📡' },
            { label: 'Contact dynamics', desc: 'Grasping and manipulation involve subtle contact forces', icon: '🤏' },
            { label: 'Time delays', desc: 'Actuator response has latency; simulation runs faster than real time', icon: '⏱️' },
          ].map(item => (
            <div key={item.label} style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{item.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ color: '#6B7280', fontSize: '11px', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
