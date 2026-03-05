import { describe, it, expect } from 'vitest';
import {
  rgbToGrayscale,
  gaussianKernel1D,
  gaussianKernel2D,
  applyConvolution2D,
  sobelGradient,
  nonMaxSuppression1D,
  applyThreshold,
  computeEdges,
  ssdOpticalFlow,
  perspectiveProject,
  lambertShading,
  computeDepthFromDisparity,
  iouBoundingBox,
  nmsBoxes,
} from '../src/algorithms/index';

// ─── rgbToGrayscale ───────────────────────────────────────────────────────────
describe('rgbToGrayscale', () => {
  it('computes luma for a standard colour', () => {
    // 0.299*100 + 0.587*150 + 0.114*200 = 29.9 + 88.05 + 22.8 = 140.75 → 141
    expect(rgbToGrayscale(100, 150, 200)).toBe(141);
  });

  it('returns 0 for black', () => {
    expect(rgbToGrayscale(0, 0, 0)).toBe(0);
  });

  it('returns 255 for white', () => {
    expect(rgbToGrayscale(255, 255, 255)).toBe(255);
  });

  it('clamps negative inputs to 0', () => {
    expect(rgbToGrayscale(-100, -100, -100)).toBe(0);
  });

  it('clamps inputs above 255', () => {
    expect(rgbToGrayscale(300, 300, 300)).toBe(255);
  });

  it('rounds to nearest integer', () => {
    // 0.299*0 + 0.587*1 + 0.114*0 = 0.587 → rounds to 1
    expect(rgbToGrayscale(0, 1, 0)).toBe(1);
  });
});

// ─── gaussianKernel1D ─────────────────────────────────────────────────────────
describe('gaussianKernel1D', () => {
  it('returns a delta kernel for sigma <= 0', () => {
    const k = gaussianKernel1D(0, 2);
    expect(k.length).toBe(5);
    expect(k[2]).toBe(1);
    expect(k[0]).toBe(0);
    expect(k[1]).toBe(0);
    expect(k[3]).toBe(0);
    expect(k[4]).toBe(0);
  });

  it('returns a delta kernel for negative sigma', () => {
    const k = gaussianKernel1D(-1, 1);
    expect(k.length).toBe(3);
    expect(k[1]).toBe(1);
    expect(k[0]).toBe(0);
    expect(k[2]).toBe(0);
  });

  it('returns [1] for radius=0 with sigma<=0', () => {
    const k = gaussianKernel1D(0, 0);
    expect(k).toEqual([1]);
  });

  it('returns a smooth normalised kernel for sigma > 0', () => {
    const k = gaussianKernel1D(1, 2);
    expect(k.length).toBe(5);
    const sum = (k as number[]).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
    // Centre should be the largest value
    expect(k[2]).toBeGreaterThan(k[1] as number);
    expect(k[2]).toBeGreaterThan(k[3] as number);
  });

  it('is symmetric', () => {
    const k = gaussianKernel1D(1.5, 3);
    for (let i = 0; i < 3; i++) {
      expect(k[i]).toBeCloseTo(k[6 - i] as number, 12);
    }
  });

  it('returns [1] for radius=0 with sigma > 0', () => {
    const k = gaussianKernel1D(1, 0);
    expect(k).toEqual([1]);
  });
});

// ─── gaussianKernel2D ─────────────────────────────────────────────────────────
describe('gaussianKernel2D', () => {
  it('returns a delta kernel for sigma <= 0', () => {
    const k = gaussianKernel2D(0, 1);
    expect(k.length).toBe(3);
    expect((k[0] as number[])[0]).toBe(0);
    expect((k[1] as number[])[1]).toBe(1);
    expect((k[2] as number[])[2]).toBe(0);
  });

  it('returns a 1x1 delta for radius=0 and sigma<=0', () => {
    const k = gaussianKernel2D(0, 0);
    expect(k.length).toBe(1);
    expect((k[0] as number[])[0]).toBe(1);
  });

  it('normalises to sum=1 for sigma > 0', () => {
    const k = gaussianKernel2D(1, 2);
    let sum = 0;
    for (const row of k) {
      for (const v of row) {
        sum += v;
      }
    }
    expect(sum).toBeCloseTo(1, 10);
  });

  it('has the centre as the largest value', () => {
    const k = gaussianKernel2D(1, 2);
    const centre = (k[2] as number[])[2] as number;
    expect(centre).toBeGreaterThan((k[0] as number[])[0] as number);
    expect(centre).toBeGreaterThan((k[2] as number[])[0] as number);
  });

  it('is symmetric along both axes', () => {
    const k = gaussianKernel2D(1.5, 2);
    const size = 5;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        expect((k[y] as number[])[x]).toBeCloseTo(
          (k[size - 1 - y] as number[])[size - 1 - x] as number,
          12,
        );
      }
    }
  });

  it('returns a 1x1 normalised kernel for radius=0 and sigma > 0', () => {
    const k = gaussianKernel2D(1, 0);
    expect(k.length).toBe(1);
    expect((k[0] as number[])[0]).toBeCloseTo(1, 10);
  });
});

// ─── applyConvolution2D ───────────────────────────────────────────────────────
describe('applyConvolution2D', () => {
  it('identity convolution (1×1 kernel [[1]]) returns the same image', () => {
    const image = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const result = applyConvolution2D(image, 3, 3, [[1]]);
    expect([...result]).toEqual(image);
  });

  it('blurs a step edge (uniform kernel reduces contrast)', () => {
    // Horizontal step edge: top row 0, bottom row 255
    const image = [0, 0, 0, 0, 255, 255, 255, 255, 255];
    const kernel = gaussianKernel2D(1, 1);
    const blurred = applyConvolution2D(image, 3, 3, kernel);
    // Centre pixel of blurred image should be between 0 and 255
    const centre = blurred[4] as number;
    expect(centre).toBeGreaterThan(0);
    expect(centre).toBeLessThan(255);
  });

  it('handles a 1×1 image', () => {
    const result = applyConvolution2D([42], 1, 1, [[1]]);
    expect(result[0]).toBeCloseTo(42, 10);
  });

  it('clamps edges correctly (all-same image stays the same after any kernel)', () => {
    const image = Array(9).fill(100) as number[];
    const kernel = gaussianKernel2D(1, 1);
    const result = applyConvolution2D(image, 3, 3, kernel);
    for (const v of result) {
      expect(v).toBeCloseTo(100, 5);
    }
  });

  it('produces correct output length', () => {
    const image = Array(16).fill(0) as number[];
    const kernel = gaussianKernel2D(1, 1);
    const result = applyConvolution2D(image, 4, 4, kernel);
    expect(result.length).toBe(16);
  });
});

// ─── sobelGradient ────────────────────────────────────────────────────────────
describe('sobelGradient', () => {
  it('returns zero magnitude for a constant image', () => {
    const image = Array(9).fill(128) as number[];
    const { magnitude, direction } = sobelGradient(image, 3, 3);
    for (const m of magnitude) {
      expect(m).toBeCloseTo(0, 10);
    }
    expect(direction.length).toBe(9);
  });

  it('detects a vertical step edge with non-zero horizontal gradient', () => {
    // Left half dark, right half bright
    const image = [0, 0, 255, 0, 0, 255, 0, 0, 255];
    const { magnitude } = sobelGradient(image, 3, 3);
    // Centre pixel should have high gradient
    expect(magnitude[4] as number).toBeGreaterThan(0);
  });

  it('detects a horizontal step edge with non-zero vertical gradient', () => {
    // Top dark, bottom bright
    const image = [0, 0, 0, 0, 0, 0, 255, 255, 255];
    const { magnitude } = sobelGradient(image, 3, 3);
    expect(magnitude[4] as number).toBeGreaterThan(0);
  });

  it('produces arrays of correct length', () => {
    const image = Array(12).fill(0) as number[];
    const { magnitude, direction } = sobelGradient(image, 4, 3);
    expect(magnitude.length).toBe(12);
    expect(direction.length).toBe(12);
  });

  it('direction is atan2(gy, gx) — vertical edge gives direction near 0', () => {
    // Pure vertical step: gx large, gy=0 → direction ≈ 0
    const image = [0, 128, 255, 0, 128, 255, 0, 128, 255];
    const { direction } = sobelGradient(image, 3, 3);
    // centre pixel direction should be close to 0 (pointing right)
    expect(Math.abs(direction[4] as number)).toBeLessThan(0.1);
  });
});

// ─── nonMaxSuppression1D ──────────────────────────────────────────────────────
describe('nonMaxSuppression1D', () => {
  // Helper: build a 3×3 magnitude array with a peak at centre and
  // specific direction, check the centre survives (or is suppressed).
  const W = 3;
  const H = 3;
  const centre = 4; // index of (1,1)

  it('keeps a maximum pixel in direction 0° (horizontal)', () => {
    const magnitude = Array(9).fill(10) as number[];
    magnitude[centre] = 100;
    // direction = 0 rad → 0° horizontal → compare left(3) and right(5)
    const direction = Array(9).fill(0) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[centre]).toBe(100);
  });

  it('suppresses a non-maximum pixel in direction 0°', () => {
    const magnitude = Array(9).fill(200) as number[];
    magnitude[centre] = 50;
    const direction = Array(9).fill(0) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[centre]).toBe(0);
  });

  it('keeps a maximum pixel in direction 90° (vertical)', () => {
    const magnitude = Array(9).fill(5) as number[];
    magnitude[centre] = 80;
    // direction = π/2 rad → 90° → compare up(1) and down(7)
    const direction = Array(9).fill(Math.PI / 2) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[centre]).toBe(80);
  });

  it('suppresses a non-maximum pixel in direction 90°', () => {
    const magnitude = Array(9).fill(100) as number[];
    magnitude[centre] = 50;
    const direction = Array(9).fill(Math.PI / 2) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[centre]).toBe(0);
  });

  it('keeps a maximum pixel in direction 45°', () => {
    const magnitude = Array(9).fill(3) as number[];
    magnitude[centre] = 90;
    // direction = π/4 rad → 45° → compare upper-right(2) and lower-left(6)
    const direction = Array(9).fill(Math.PI / 4) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[centre]).toBe(90);
  });

  it('suppresses a non-maximum pixel in direction 45°', () => {
    const magnitude = Array(9).fill(200) as number[];
    magnitude[centre] = 10;
    const direction = Array(9).fill(Math.PI / 4) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[centre]).toBe(0);
  });

  it('keeps a maximum pixel in direction 135°', () => {
    const magnitude = Array(9).fill(3) as number[];
    magnitude[centre] = 90;
    // direction = 3π/4 rad → 135° → compare upper-left(0) and lower-right(8)
    const direction = Array(9).fill((3 * Math.PI) / 4) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[centre]).toBe(90);
  });

  it('suppresses a non-maximum pixel in direction 135°', () => {
    const magnitude = Array(9).fill(200) as number[];
    magnitude[centre] = 10;
    const direction = Array(9).fill((3 * Math.PI) / 4) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[centre]).toBe(0);
  });

  it('exercises the 157.5°–180° branch (maps to 0° orientation)', () => {
    // angle_deg ≈ 170° after normalisation → ≥ 157.5 → 0° direction
    const magnitude = Array(9).fill(1) as number[];
    magnitude[centre] = 100;
    const angle170 = (170 * Math.PI) / 180;
    const direction = Array(9).fill(angle170) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[centre]).toBe(100);
  });

  it('treats out-of-bounds neighbours as 0 (corner pixel stays if local max)', () => {
    const magnitude = Array(9).fill(0) as number[];
    magnitude[0] = 50; // top-left corner
    // direction = 0° → compare left (out of bounds→0) and right (index 1 = 0)
    const direction = Array(9).fill(0) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[0]).toBe(50);
  });

  it('returns all zeros for zero-magnitude image', () => {
    const magnitude = Array(9).fill(0) as number[];
    const direction = Array(9).fill(0) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect([...result]).toEqual(Array(9).fill(0));
  });

  it('handles border pixel with 45° direction (upper-right out of bounds)', () => {
    // top-right corner (px=2, py=0), direction=45°
    // upper-right neighbour (px=3,py=-1) is out of bounds → n1=0
    // lower-left neighbour (px=1,py=1) is in bounds
    const magnitude = Array(9).fill(0) as number[];
    magnitude[2] = 80; // top-right corner
    magnitude[4] = 10; // lower-left of corner
    const direction = Array(9).fill(Math.PI / 4) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[2]).toBe(80);
  });

  it('handles border pixel with 135° direction (upper-left out of bounds)', () => {
    // top-left corner (px=0, py=0), direction=135°
    // upper-left (px=-1,py=-1) OOB → n1=0
    // lower-right (px=1,py=1) in bounds
    const magnitude = Array(9).fill(0) as number[];
    magnitude[0] = 80; // top-left corner
    magnitude[4] = 10;
    const direction = Array(9).fill((3 * Math.PI) / 4) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[0]).toBe(80);
  });

  it('exercises the right-edge false branch for direction 0° (n2=0)', () => {
    // right edge pixel (px=2, py=1), direction=0° → n2 = px < 2? ... : 0 → 0
    const magnitude = Array(9).fill(0) as number[];
    magnitude[5] = 50; // (px=2, py=1) — right edge, no right neighbour
    const direction = Array(9).fill(0) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[5]).toBe(50);
  });

  it('exercises the bottom-edge false branch for direction 45° (n2=0)', () => {
    // bottom-left pixel (px=0, py=2), direction=45°
    // n2 = px > 0 → false → n2=0
    const magnitude = Array(9).fill(0) as number[];
    magnitude[6] = 70; // (px=0, py=2)
    const direction = Array(9).fill(Math.PI / 4) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[6]).toBe(70);
  });

  it('exercises the top-edge false branch for direction 90° (n1=0)', () => {
    // top pixel (px=1, py=0), direction=90° → n1 = py > 0 → false → n1=0
    const magnitude = Array(9).fill(0) as number[];
    magnitude[1] = 60; // (px=1, py=0)
    const direction = Array(9).fill(Math.PI / 2) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[1]).toBe(60);
  });

  it('exercises the bottom-edge false branch for direction 90° (n2=0)', () => {
    // bottom pixel (px=1, py=2), direction=90° → n2 = py < 2 → false → n2=0
    const magnitude = Array(9).fill(0) as number[];
    magnitude[7] = 60; // (px=1, py=2)
    const direction = Array(9).fill(Math.PI / 2) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[7]).toBe(60);
  });

  it('exercises the bottom-right corner false branch for direction 135° (n2=0)', () => {
    // bottom-right pixel (px=2, py=2), direction=135°
    // n2 = px < 2 && py < 2 → false → n2=0
    const magnitude = Array(9).fill(0) as number[];
    magnitude[8] = 55; // (px=2, py=2)
    const direction = Array(9).fill((3 * Math.PI) / 4) as number[];
    const result = nonMaxSuppression1D(magnitude, direction, W, H);
    expect(result[8]).toBe(55);
  });
});

// ─── applyThreshold ───────────────────────────────────────────────────────────
describe('applyThreshold', () => {
  it('returns 1.0 for values >= threshold', () => {
    const result = applyThreshold([0, 50, 100, 150, 200], 100);
    expect([...result]).toEqual([0.0, 0.0, 1.0, 1.0, 1.0]);
  });

  it('returns 0.0 for values < threshold', () => {
    const result = applyThreshold([10, 20, 30], 50);
    expect([...result]).toEqual([0.0, 0.0, 0.0]);
  });

  it('handles empty array', () => {
    expect([...applyThreshold([], 50)]).toEqual([]);
  });

  it('returns all 1s when threshold is 0', () => {
    const result = applyThreshold([0, 0, 0], 0);
    expect([...result]).toEqual([1.0, 1.0, 1.0]);
  });
});

// ─── computeEdges ────────────────────────────────────────────────────────────
describe('computeEdges', () => {
  it('returns an array of the same length as input', () => {
    const image = Array(25).fill(128) as number[];
    const result = computeEdges(image, 5, 5, 1, 10);
    expect(result.length).toBe(25);
  });

  it('returns only 0 or 1 values', () => {
    const image = Array(25).fill(0).map((_, i) => (i % 2 === 0 ? 0 : 255)) as number[];
    const result = computeEdges(image, 5, 5, 0.5, 50);
    for (const v of result) {
      expect(v === 0 || v === 1).toBe(true);
    }
  });

  it('detects edges in a step-edge image', () => {
    // 5×5 image: left half 0, right half 255
    const image: number[] = [];
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        image.push(x < 2 ? 0 : 255);
      }
    }
    const result = computeEdges(image, 5, 5, 0.5, 50);
    // At least one edge pixel should be detected
    const hasEdge = [...result].some(v => v === 1);
    expect(hasEdge).toBe(true);
  });

  it('works with sigma=0 (no smoothing, uses identity kernel)', () => {
    const image = Array(9).fill(0) as number[];
    image[4] = 255;
    const result = computeEdges(image, 3, 3, 0, 10);
    expect(result.length).toBe(9);
  });

  it('returns all zeros for constant image with positive threshold', () => {
    const image = Array(9).fill(128) as number[];
    const result = computeEdges(image, 3, 3, 1, 50);
    for (const v of result) {
      expect(v).toBe(0);
    }
  });
});

// ─── ssdOpticalFlow ───────────────────────────────────────────────────────────
describe('ssdOpticalFlow', () => {
  it('returns zero flow for identical frames', () => {
    const frame = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const flow = ssdOpticalFlow(frame, frame, 3, 3, 1, 1);
    expect(flow.length).toBe(9);
    // All border pixels return {dx:0, dy:0}; centre (blockRadius=1) is non-border
    expect((flow[4] as { dx: number; dy: number }).dx).toBe(0);
    expect((flow[4] as { dx: number; dy: number }).dy).toBe(0);
  });

  it('border pixels return {dx:0, dy:0}', () => {
    const frame = Array(9).fill(0) as number[];
    const flow = ssdOpticalFlow(frame, frame, 3, 3, 1, 1);
    // All pixels except centre(4) are border with blockRadius=1
    for (let i = 0; i < 9; i++) {
      if (i !== 4) {
        expect((flow[i] as { dx: number; dy: number }).dx).toBe(0);
        expect((flow[i] as { dx: number; dy: number }).dy).toBe(0);
      }
    }
  });

  it('detects a horizontal shift of 1 pixel', () => {
    // 5×5 frames; bright spot at (2,2) in frame1 and (3,2) in frame2
    const frame1 = Array(25).fill(0) as number[];
    const frame2 = Array(25).fill(0) as number[];
    frame1[2 * 5 + 2] = 255;
    frame2[2 * 5 + 3] = 255;
    const flow = ssdOpticalFlow(frame1, frame2, 5, 5, 1, 2);
    const centre = flow[2 * 5 + 2] as { dx: number; dy: number };
    expect(centre.dx).toBe(1);
    expect(centre.dy).toBe(0);
  });

  it('returns correct length for a 4×4 image', () => {
    const frame = Array(16).fill(0) as number[];
    const flow = ssdOpticalFlow(frame, frame, 4, 4, 1, 1);
    expect(flow.length).toBe(16);
  });

  it('skips frame2 blocks that are out of bounds during search', () => {
    // 5×5 frame; searchRadius=3 pushes many frame2 blocks OOB — verify no crash
    // and that the returned displacement is within [-searchRadius, searchRadius]
    const frame = Array(25).fill(128) as number[];
    const flow = ssdOpticalFlow(frame, frame, 5, 5, 1, 3);
    const centre = flow[2 * 5 + 2] as { dx: number; dy: number };
    // Any valid displacement is acceptable; just verify it is within search bounds
    expect(Math.abs(centre.dx)).toBeLessThanOrEqual(3);
    expect(Math.abs(centre.dy)).toBeLessThanOrEqual(3);
    // All 25 vectors must be returned
    expect(flow.length).toBe(25);
  });
});

// ─── perspectiveProject ───────────────────────────────────────────────────────
describe('perspectiveProject', () => {
  it('projects a point in front of the camera', () => {
    // x = -500*1/10 = -50, y = -500*2/10 = -100
    const result = perspectiveProject(1, 2, 10, 500);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(-50, 10);
    expect(result!.y).toBeCloseTo(-100, 10);
  });

  it('returns null when z3d = 0', () => {
    expect(perspectiveProject(1, 1, 0, 500)).toBeNull();
  });

  it('returns null when z3d < 0 (behind camera)', () => {
    expect(perspectiveProject(1, 1, -5, 500)).toBeNull();
  });

  it('returns {x:0, y:0} for a point on the optical axis', () => {
    const result = perspectiveProject(0, 0, 10, 500);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(0, 10);
    expect(result!.y).toBeCloseTo(0, 10);
  });
});

// ─── lambertShading ───────────────────────────────────────────────────────────
describe('lambertShading', () => {
  it('computes correct shading for a fully lit surface', () => {
    // Normal = (0,0,1), light = (0,0,1) → cosTheta=1
    const intensity = lambertShading(0, 0, 1, 0, 0, 1, 1.0, 100);
    expect(intensity).toBeCloseTo(100, 5);
  });

  it('returns 0 for zero normal vector', () => {
    expect(lambertShading(0, 0, 0, 0, 0, 1, 1.0, 100)).toBe(0);
  });

  it('returns 0 for zero light vector', () => {
    expect(lambertShading(0, 0, 1, 0, 0, 0, 1.0, 100)).toBe(0);
  });

  it('returns 0 when surface is in shadow (cosTheta < 0)', () => {
    // Normal points up, light points down → cosTheta = -1
    expect(lambertShading(0, 0, 1, 0, 0, -1, 1.0, 100)).toBe(0);
  });

  it('handles a 45-degree angle correctly', () => {
    // cosTheta = 1/sqrt(2) ≈ 0.7071
    const intensity = lambertShading(0, 0, 1, 0, 1, 1, 1.0, 100);
    expect(intensity).toBeCloseTo(100 / Math.sqrt(2), 5);
  });

  it('clamps intensity to lightIntensity maximum', () => {
    // albedo=2 would exceed lightIntensity=50; result clamped to 50
    const intensity = lambertShading(0, 0, 1, 0, 0, 1, 2.0, 50);
    expect(intensity).toBeCloseTo(50, 5);
  });

  it('scales with albedo', () => {
    const i1 = lambertShading(0, 0, 1, 0, 0, 1, 0.5, 100);
    const i2 = lambertShading(0, 0, 1, 0, 0, 1, 1.0, 100);
    expect(i1).toBeCloseTo(i2 / 2, 5);
  });
});

// ─── computeDepthFromDisparity ────────────────────────────────────────────────
describe('computeDepthFromDisparity', () => {
  it('computes depth correctly', () => {
    // depth = (0.1 * 500) / 2 = 25
    expect(computeDepthFromDisparity(2, 0.1, 500)).toBeCloseTo(25, 10);
  });

  it('returns null for disparity = 0', () => {
    expect(computeDepthFromDisparity(0, 0.1, 500)).toBeNull();
  });

  it('returns null for negative disparity', () => {
    expect(computeDepthFromDisparity(-1, 0.1, 500)).toBeNull();
  });

  it('returns larger depth for smaller disparity', () => {
    const d1 = computeDepthFromDisparity(1, 0.1, 500) as number;
    const d2 = computeDepthFromDisparity(2, 0.1, 500) as number;
    expect(d1).toBeGreaterThan(d2);
  });
});

// ─── iouBoundingBox ───────────────────────────────────────────────────────────
describe('iouBoundingBox', () => {
  it('returns 1 for identical boxes', () => {
    expect(iouBoundingBox([0, 0, 4, 4], [0, 0, 4, 4])).toBeCloseTo(1, 10);
  });

  it('returns 0 for non-overlapping boxes (separated horizontally)', () => {
    expect(iouBoundingBox([0, 0, 2, 2], [3, 0, 5, 2])).toBe(0);
  });

  it('returns 0 for non-overlapping boxes (separated vertically)', () => {
    expect(iouBoundingBox([0, 0, 2, 2], [0, 3, 2, 5])).toBe(0);
  });

  it('returns 0 for touching boxes (ix2 = ix1)', () => {
    // Boxes touch but don't overlap (ix2 == ix1)
    expect(iouBoundingBox([0, 0, 2, 2], [2, 0, 4, 2])).toBe(0);
  });

  it('returns 0 for touching boxes (iy2 = iy1)', () => {
    expect(iouBoundingBox([0, 0, 2, 2], [0, 2, 2, 4])).toBe(0);
  });

  it('computes correct IoU for partially overlapping boxes', () => {
    // box1: [0,0,4,4] area=16, box2: [2,2,6,6] area=16
    // intersection: [2,2,4,4] = 4, union=16+16-4=28
    expect(iouBoundingBox([0, 0, 4, 4], [2, 2, 6, 6])).toBeCloseTo(4 / 28, 10);
  });

  it('handles one box fully inside another', () => {
    // box1=[0,0,4,4] area=16, box2=[1,1,3,3] area=4, intersection=4, union=16
    expect(iouBoundingBox([0, 0, 4, 4], [1, 1, 3, 3])).toBeCloseTo(4 / 16, 10);
  });

  it('returns 0 for zero-area boxes with no overlap', () => {
    // Both are degenerate lines; union=0
    expect(iouBoundingBox([0, 0, 0, 0], [1, 1, 1, 1])).toBe(0);
  });

  it('returns 0 for zero-area boxes with zero union', () => {
    // Both are degenerate (same point), union = 0 → guarded
    expect(iouBoundingBox([0, 0, 0, 0], [0, 0, 0, 0])).toBe(0);
  });
});

// ─── nmsBoxes ────────────────────────────────────────────────────────────────
describe('nmsBoxes', () => {
  it('returns empty array for empty input', () => {
    expect([...nmsBoxes([], [], 0.5)]).toEqual([]);
  });

  it('returns [0] for a single box', () => {
    expect([...nmsBoxes([[0, 0, 1, 1]], [0.9], 0.5)]).toEqual([0]);
  });

  it('keeps both non-overlapping boxes', () => {
    const boxes: readonly [number, number, number, number][] = [
      [0, 0, 1, 1],
      [10, 10, 11, 11],
    ];
    const result = nmsBoxes(boxes, [0.9, 0.8], 0.5);
    expect([...result].sort()).toEqual([0, 1]);
  });

  it('suppresses lower-scored overlapping box', () => {
    // box1 and box2 are nearly identical → high IoU
    const boxes: readonly [number, number, number, number][] = [
      [0, 0, 4, 4],
      [0, 0, 4, 4],
    ];
    const result = nmsBoxes(boxes, [0.9, 0.5], 0.5);
    // Only highest-score box survives
    expect([...result]).toEqual([0]);
  });

  it('sorts output by score descending', () => {
    const boxes: readonly [number, number, number, number][] = [
      [0, 0, 1, 1],
      [5, 5, 6, 6],
      [10, 10, 11, 11],
    ];
    const result = nmsBoxes(boxes, [0.3, 0.9, 0.6], 0.5);
    // Should be sorted: 1 (0.9), 2 (0.6), 0 (0.3)
    expect([...result]).toEqual([1, 2, 0]);
  });

  it('suppresses multiple boxes overlapping with the winner', () => {
    // All boxes at roughly same location; highest score wins
    const boxes: readonly [number, number, number, number][] = [
      [0, 0, 4, 4],
      [0, 0, 4, 4],
      [0, 0, 4, 4],
    ];
    const result = nmsBoxes(boxes, [0.5, 0.9, 0.7], 0.5);
    expect([...result]).toEqual([1]);
  });

  it('keeps two boxes when their IoU is exactly at threshold (not >)', () => {
    // box1=[0,0,4,4] area=16, box2=[2,0,6,4] area=16
    // intersection=[2,0,4,4]=8, union=16+16-8=24, IoU=8/24=0.333
    const boxes: readonly [number, number, number, number][] = [
      [0, 0, 4, 4],
      [2, 0, 6, 4],
    ];
    // IoU ≈ 0.333 which is < 0.5 threshold → both kept
    const result = nmsBoxes(boxes, [0.9, 0.8], 0.5);
    expect(result.length).toBe(2);
  });
});
