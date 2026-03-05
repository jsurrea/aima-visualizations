import React, { useState } from 'react';

const CC = '#F59E0B'; // chapter color

const ROBOT_TYPES = [
  {
    name: 'Manipulator Arms',
    icon: '🦾',
    desc: 'Fixed-base robotic arms for factory assembly, surgery, and assistive tasks. Have 6–7 DOF. Use revolute joints.',
    examples: ['Industrial welding robots', 'Surgical da Vinci robot', 'Wheelchair-mounted JACO arm'],
    sensors: ['Shaft decoders', 'Force/torque sensors', 'Vision cameras'],
  },
  {
    name: 'Mobile Robots',
    icon: '🤖',
    desc: 'Move through environments using wheels, legs, or tracks. Navigate from room to room or explore terrain.',
    examples: ['Roomba vacuum cleaner', 'Mars Curiosity rover', 'Hotel delivery robots'],
    sensors: ['LIDAR', 'Cameras', 'GPS', 'Odometry'],
  },
  {
    name: 'Aerial Drones (UAVs)',
    icon: '🚁',
    desc: 'Quadcopters and fixed-wing UAVs. Operate in 3-D airspace. Require fast control loops for stability.',
    examples: ['Skydio R1 (personal photographer)', 'Delivery drones', 'Search & rescue UAVs'],
    sensors: ['IMU / accelerometers', 'Radar', 'Stereo cameras'],
  },
  {
    name: 'Autonomous Vehicles',
    icon: '🚗',
    desc: 'Self-driving cars must handle dynamic environments, other agents, and complex decision-making at speed.',
    examples: ['Tesla Autopilot', 'Waymo robotaxi', 'DARPA Urban Challenge winner BOSS'],
    sensors: ['LIDAR', 'Radar', 'Cameras', 'GPS/differential GPS'],
  },
  {
    name: 'Legged Robots',
    icon: '🐕',
    desc: 'Traverse rough terrain inaccessible to wheels. Controlling legs is more complex than spinning wheels.',
    examples: ['Boston Dynamics Spot', 'Hexapod Genghis', 'BigDog for military logistics'],
    sensors: ['IMU', 'Force/torque at feet', 'Cameras', 'LIDAR'],
  },
  {
    name: 'Underwater AUVs',
    icon: '🌊',
    desc: "Autonomous Underwater Vehicles explore oceans. GPS does not work underwater — use sonar for localization.",
    examples: ['Ocean floor mapping', 'Shipwreck surveys', 'Pipeline inspection'],
    sensors: ['Sonar', 'Acoustic beacons', 'Pressure sensors', 'Cameras'],
  },
];

const SENSOR_TYPES = [
  { name: 'Range Finders', icon: '📡', passive: false, desc: 'Measure distance to objects. LIDAR, sonar, time-of-flight cameras. Accurate to cm at 100m range.' },
  { name: 'Cameras', icon: '📷', passive: true, desc: 'Passive sensors capturing RGB, depth, or infrared images. Stereo vision computes depth from parallax.' },
  { name: 'GPS', icon: '🛰️', passive: false, desc: 'Triangulates position from satellite signals. ±few meters outdoors. Differential GPS gives mm accuracy.' },
  { name: 'IMU / Gyroscopes', icon: '⚡', passive: true, desc: 'Proprioceptive sensors measuring acceleration and rotation rate. Drift over time but fast and cheap.' },
  { name: 'Force/Torque Sensors', icon: '🏋️', passive: true, desc: 'Measure grip force and joint torque at 100s Hz. Essential for delicate manipulation tasks.' },
  { name: 'Shaft Decoders', icon: '⚙️', passive: true, desc: 'Measure angular joint position via optical encoders. Used for odometry and arm joint tracking.' },
];

export default function RoboticsOverview() {
  const [selectedRobot, setSelectedRobot] = useState(0);
  const [selectedSensor, setSelectedSensor] = useState<number | null>(null);

  const robot = ROBOT_TYPES[selectedRobot]!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* §26.1 Robots */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: CC, marginBottom: '12px' }}>§26.1 What is a Robot?</h3>
        <p style={{ color: '#D1D5DB', lineHeight: 1.7, marginBottom: '16px' }}>
          A robot is a physical agent that performs tasks by manipulating the physical world. It has:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: 'Effectors', desc: 'Legs, wheels, joints, grippers — assert physical forces', icon: '🦿' },
            { label: 'Sensors', desc: 'Cameras, LIDAR, GPS, gyroscopes — perceive the world', icon: '👁️' },
            { label: 'Processor', desc: 'Runs the agent program: perception → plan → act', icon: '🧠' },
          ].map(item => (
            <div key={item.label} style={{ background: '#1A1A24', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontWeight: 700, color: 'white', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ color: '#9CA3AF', fontSize: '13px' }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#0A0A0F', borderRadius: '8px', padding: '12px', color: '#9CA3AF', fontSize: '13px', lineHeight: 1.6 }}>
          <strong style={{ color: CC }}>Key challenge:</strong> Robots operate in partially observable, stochastic, continuous-state environments.
          Unlike chess AI, robots can't just "see" the whole state — they must estimate it from noisy sensors.
          And unlike discrete actions, robot controls are continuous (e.g., how many amps to send to a motor).
        </div>
      </div>

      {/* §26.2 Robot Types */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: CC, marginBottom: '12px' }}>§26.2 Types of Robots</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '20px' }}>
          {ROBOT_TYPES.map((rt, i) => (
            <button
              key={rt.name}
              onClick={() => setSelectedRobot(i)}
              style={{
                background: selectedRobot === i ? `${CC}20` : '#1A1A24',
                border: `1px solid ${selectedRobot === i ? CC : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px', padding: '12px 8px', cursor: 'pointer', color: 'white',
                fontSize: '12px', fontWeight: 600, textAlign: 'center',
              }}
              aria-pressed={selectedRobot === i}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{rt.icon}</div>
              {rt.name}
            </button>
          ))}
        </div>

        <div style={{ background: '#1A1A24', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px' }}>{robot.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>{robot.name}</div>
              <div style={{ color: '#D1D5DB', lineHeight: 1.6 }}>{robot.desc}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: CC, marginBottom: '6px', textTransform: 'uppercase' }}>Real Examples</div>
              {robot.examples.map(e => (
                <div key={e} style={{ color: '#9CA3AF', fontSize: '13px', padding: '3px 0' }}>• {e}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: CC, marginBottom: '6px', textTransform: 'uppercase' }}>Typical Sensors</div>
              {robot.sensors.map(s => (
                <div key={s} style={{ color: '#9CA3AF', fontSize: '13px', padding: '3px 0' }}>• {s}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Types */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: CC, marginBottom: '12px' }}>Sensor Types</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {SENSOR_TYPES.map((s, i) => (
            <div
              key={s.name}
              style={{
                background: selectedSensor === i ? '#1A1A24' : '#0A0A0F',
                border: `1px solid ${selectedSensor === i ? CC : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px', padding: '14px', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onClick={() => setSelectedSensor(selectedSensor === i ? null : i)}
              role="button"
              aria-expanded={selectedSensor === i}
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setSelectedSensor(selectedSensor === i ? null : i)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>{s.icon}</span>
                <span style={{
                  fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                  background: s.passive ? '#3B82F620' : `${CC}20`,
                  color: s.passive ? '#60A5FA' : CC,
                }}>
                  {s.passive ? 'passive' : 'active'}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{s.name}</div>
              {selectedSensor === i && (
                <div style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.5, marginTop: '8px' }}>{s.desc}</div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', color: '#6B7280', fontSize: '12px' }}>
          Active sensors emit energy (sonar, LIDAR, radar) and measure reflections. Passive sensors (cameras, IMUs) only receive.
        </div>
      </div>
    </div>
  );
}
