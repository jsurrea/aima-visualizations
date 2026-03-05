import React, { useState, useRef, useCallback } from 'react';
import { renderInlineMath } from '../utils/mathUtils';

const CC = '#F59E0B';

interface Point { x: number; y: number; }

// A triangular robot shape at configuration (cx, cy, theta)
function trianglePoints(cx: number, cy: number, theta: number, size: number): [number, number][] {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const pts: [number, number][] = [
    [cx + size * cos - (size * 0.5) * sin, cy + size * sin + (size * 0.5) * cos],
    [cx - (size * 0.5) * cos - (size * 0.5) * sin, cy - (size * 0.5) * sin + (size * 0.5) * cos],
    [cx - (size * 0.5) * cos + (size * 0.5) * sin, cy - (size * 0.5) * sin - (size * 0.5) * cos],
  ];
  return pts;
}

function polyStr(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

const OBSTACLE_W = 80;
const OBSTACLE_H = 50;
const OBS_X = 160;
const OBS_Y = 75;

// C-space obstacle: for a non-rotating triangle of size 20,
// the C-space obstacle is obtained by Minkowski sum of obstacle with mirror of robot.
// For simplicity, we expand the obstacle by the robot half-size on all sides.
const ROBOT_SIZE = 16;
const COBS_X = OBS_X - ROBOT_SIZE;
const COBS_Y = OBS_Y - ROBOT_SIZE;
const COBS_W = OBSTACLE_W + ROBOT_SIZE * 2;
const COBS_H = OBSTACLE_H + ROBOT_SIZE * 2;

// Check if (x, y) is inside C-space obstacle
function inCObs(x: number, y: number): boolean {
  return x >= COBS_X && x <= COBS_X + COBS_W && y >= COBS_Y && y <= COBS_Y + COBS_H;
}

export default function ConfigSpaceViz() {
  const [robotPos, setRobotPos] = useState<Point>({ x: 30, y: 130 });
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 340;
  const H = 200;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const clampedX = Math.max(ROBOT_SIZE, Math.min(W - ROBOT_SIZE, x));
    const clampedY = Math.max(ROBOT_SIZE, Math.min(H - ROBOT_SIZE, y));
    setRobotPos({ x: clampedX, y: clampedY });
  }, [dragging]);

  const inCollision = inCObs(robotPos.x, robotPos.y);
  const trianglePts = trianglePoints(robotPos.x, robotPos.y, 0.3, ROBOT_SIZE);

  // C-space view: mirror workspace to the right (200px width)
  const CSPACE_OFFSET = 380;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '8px' }}>Configuration Space (C-Space)</h3>
        <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
          Instead of tracking all points on the robot, we represent its entire body with a single point in an abstract space —
          the <strong style={{ color: CC }}>configuration space (C-space)</strong>. Each point in C-space specifies the robot's
          full configuration (position + orientation). Obstacles in workspace become expanded regions in C-space (C-obstacles).
        </p>

        <div style={{ overflowX: 'auto' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CSPACE_OFFSET + W} ${H + 10}`}
            style={{ width: '100%', maxWidth: '760px', height: 'auto', cursor: dragging ? 'grabbing' : 'default' }}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
            role="img"
            aria-label="Configuration space visualization"
          >
            {/* Workspace panel */}
            <rect x={0} y={0} width={W} height={H} fill="#1A1A24" rx={8} />
            <text x={W / 2} y={16} textAnchor="middle" fill="#9CA3AF" fontSize={11}>Workspace</text>
            <text x={W / 2} y={28} textAnchor="middle" fill="#6B7280" fontSize={9}>← drag the robot →</text>

            {/* Obstacle */}
            <rect x={OBS_X} y={OBS_Y} width={OBSTACLE_W} height={OBSTACLE_H} fill="#EF444440" stroke="#EF4444" strokeWidth={1.5} />
            <text x={OBS_X + OBSTACLE_W / 2} y={OBS_Y + OBSTACLE_H / 2 + 4} textAnchor="middle" fill="#EF4444" fontSize={10}>Obstacle</text>

            {/* Robot triangle */}
            <polygon
              points={polyStr(trianglePts)}
              fill={inCollision ? '#EF444480' : `${CC}60`}
              stroke={inCollision ? '#EF4444' : CC}
              strokeWidth={2}
              style={{ cursor: 'grab' }}
              onMouseDown={() => setDragging(true)}
            />
            <circle cx={robotPos.x} cy={robotPos.y} r={3} fill={inCollision ? '#EF4444' : CC} />
            <text x={robotPos.x} y={robotPos.y - 12} textAnchor="middle" fill={inCollision ? '#EF4444' : CC} fontSize={9} fontWeight={600}>
              q=({Math.round(robotPos.x)},{Math.round(robotPos.y)})
            </text>

            {/* Arrow */}
            <line x1={W + 10} y1={H / 2} x2={CSPACE_OFFSET - 10} y2={H / 2} stroke="#4B5563" strokeWidth={1} />
            <polygon points={`${CSPACE_OFFSET - 10},${H / 2 - 4} ${CSPACE_OFFSET - 10},${H / 2 + 4} ${CSPACE_OFFSET},${H / 2}`} fill="#4B5563" />
            <text x={W + (CSPACE_OFFSET - W) / 2} y={H / 2 - 6} textAnchor="middle" fill="#6B7280" fontSize={9}>C-space</text>
            <text x={W + (CSPACE_OFFSET - W) / 2} y={H / 2 + 4} textAnchor="middle" fill="#6B7280" fontSize={9}>mapping</text>

            {/* C-space panel */}
            <rect x={CSPACE_OFFSET} y={0} width={W} height={H} fill="#1A1A24" rx={8} />
            <text x={CSPACE_OFFSET + W / 2} y={16} textAnchor="middle" fill="#9CA3AF" fontSize={11}>C-Space</text>
            <text x={CSPACE_OFFSET + W / 2} y={28} textAnchor="middle" fill="#6B7280" fontSize={9}>robot reference point only</text>

            {/* C-space obstacle (expanded) */}
            <rect
              x={CSPACE_OFFSET + COBS_X}
              y={COBS_Y}
              width={COBS_W}
              height={COBS_H}
              fill="#EF444430"
              stroke="#EF4444"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
            <rect
              x={CSPACE_OFFSET + OBS_X}
              y={OBS_Y}
              width={OBSTACLE_W}
              height={OBSTACLE_H}
              fill="#EF444418"
              stroke="#EF444450"
              strokeWidth={1}
            />
            <text x={CSPACE_OFFSET + COBS_X + COBS_W / 2} y={COBS_Y - 5} textAnchor="middle" fill="#EF444490" fontSize={9}>
              C-obstacle (expanded)
            </text>

            {/* Robot point in C-space */}
            <circle
              cx={CSPACE_OFFSET + robotPos.x}
              cy={robotPos.y}
              r={5}
              fill={inCollision ? '#EF4444' : CC}
              stroke="white"
              strokeWidth={1}
            />
            <text x={CSPACE_OFFSET + robotPos.x} y={robotPos.y - 10} textAnchor="middle" fill={inCollision ? '#EF4444' : CC} fontSize={9}>
              q
            </text>
          </svg>
        </div>

        {/* Status */}
        <div style={{
          marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
          background: inCollision ? '#EF444420' : '#10B98120',
          border: `1px solid ${inCollision ? '#EF4444' : '#10B981'}40`,
          color: inCollision ? '#F87171' : '#34D399', fontSize: '13px', fontWeight: 600,
        }}>
          {inCollision
            ? '⚠ Configuration in collision — the robot\'s reference point is inside the C-obstacle (Cfree excludes this region)'
            : '✓ Configuration is in Cfree — the robot can safely be placed here'}
        </div>

        {/* Degrees of freedom */}
        <div style={{ marginTop: '16px', background: '#0A0A0F', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: CC, marginBottom: '8px' }}>
            Degrees of Freedom (DOF)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            {[
              { robot: 'Non-rotating triangle', dof: 2, dims: '(x, y)', eg: 'Sliding puzzle tile' },
              { robot: 'Rotating rigid body', dof: 3, dims: '(x, y, θ)', eg: 'Mobile ground robot' },
              { robot: 'Two-link arm', dof: 2, dims: '(θ₁, θ₂)', eg: 'Planar manipulator' },
              { robot: 'Full humanoid', dof: '30+', dims: 'joint angles', eg: 'Boston Dynamics Atlas' },
            ].map(item => (
              <div key={item.robot} style={{ background: '#1A1A24', borderRadius: '6px', padding: '10px' }}>
                <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '4px' }}>{item.robot}</div>
                <div style={{ color: CC, fontSize: '11px', fontFamily: 'monospace' }}>{item.dims}</div>
                <div style={{ color: '#6B7280', fontSize: '11px' }}>{item.eg}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forward & Inverse Kinematics */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '12px' }}>
          Forward & Inverse Kinematics
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px', color: '#60A5FA' }}>Forward Kinematics</div>
            <div style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: renderInlineMath('\\varphi : \\mathcal{C} \\to \\mathcal{W}') }} />
            <div style={{ color: '#9CA3AF', fontSize: '13px', lineHeight: 1.6 }}>
              Given joint angles (configuration), compute where each point on the robot is in workspace.
              <br /><strong style={{ color: '#60A5FA' }}>Easy:</strong> straightforward trigonometry.
            </div>
          </div>
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px', color: '#EC4899' }}>Inverse Kinematics IK</div>
            <div style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: renderInlineMath('\\text{IK}(x) = \\{q \\in \\mathcal{C} : \\varphi(q) = x\\}') }} />
            <div style={{ color: '#9CA3AF', fontSize: '13px', lineHeight: 1.6 }}>
              Given a desired end-effector position, find joint angles that achieve it.
              <br /><strong style={{ color: '#EC4899' }}>Hard:</strong> may have 0, 1, or many solutions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
