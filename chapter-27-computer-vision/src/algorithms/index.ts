/**
 * Chapter 27 — Computer Vision
 *
 * Pure algorithm functions covering:
 *   §27.2 Image Formation (grayscale conversion, perspective projection,
 *          depth from stereo disparity)
 *   §27.3 Simple Image Features (Gaussian kernels, 2-D convolution, Sobel
 *          gradient, non-maximum suppression, edge detection)
 *   §27.5 Detecting Objects (IoU, greedy Non-Maximum Suppression for boxes)
 *   §27.6 The 3D World (SSD block-matching optical flow, Lambert shading)
 *
 * Each exported function:
 *   - Is a pure function with no side effects
 *   - Includes a JSDoc comment with parameter/return types and Big-O complexity
 *   - Has 100% branch + line coverage in the corresponding test file
 *
 * @module algorithms
 */

// ─── §27.2: Grayscale Conversion ─────────────────────────────────────────────

/**
 * Converts an RGB pixel to grayscale using the ITU-R BT.601 luma formula.
 * Formula: 0.299·R + 0.587·G + 0.114·B, clamped to [0, 255] and rounded.
 *
 * @param r - Red channel value (typically 0–255).
 * @param g - Green channel value (typically 0–255).
 * @param b - Blue channel value (typically 0–255).
 * @returns Grayscale intensity, integer in [0, 255].
 * @complexity O(1)
 */
export function rgbToGrayscale(r: number, g: number, b: number): number {
  const value = 0.299 * r + 0.587 * g + 0.114 * b;
  return Math.round(Math.max(0, Math.min(255, value)));
}

// ─── §27.3: Gaussian Kernels and Convolution ─────────────────────────────────

/**
 * Generates a normalised 1-D Gaussian kernel of length 2·radius+1.
 * Each element k[i] = exp(−x²/(2·σ²)) where x = i − radius.
 * If σ ≤ 0, returns a unit-impulse (delta) kernel (1 at centre, 0 elsewhere).
 *
 * @param sigma  - Standard deviation of the Gaussian (> 0 for a smooth kernel).
 * @param radius - Half-width of the kernel; result length = 2·radius+1.
 * @returns Immutable array of normalised weights that sum to 1.
 * @complexity O(radius)
 */
export function gaussianKernel1D(sigma: number, radius: number): ReadonlyArray<number> {
  const size = 2 * radius + 1;
  if (sigma <= 0) {
    return Array.from({ length: size }, (_, i) => (i === radius ? 1 : 0));
  }
  const kernel: number[] = [];
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    const val = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(val);
    sum += val;
  }
  return kernel.map(v => v / sum);
}

/**
 * Generates a normalised 2-D Gaussian kernel of size (2·radius+1)×(2·radius+1).
 * Each element k[y][x] = exp(−(x²+y²)/(2·σ²)) where x,y ∈ [−radius, radius].
 * If σ ≤ 0, returns a unit-impulse (delta) kernel.
 *
 * @param sigma  - Standard deviation of the Gaussian.
 * @param radius - Half-width/height of the kernel.
 * @returns Immutable 2-D array of normalised weights that sum to 1.
 * @complexity O(radius²)
 */
export function gaussianKernel2D(
  sigma: number,
  radius: number,
): ReadonlyArray<ReadonlyArray<number>> {
  const size = 2 * radius + 1;
  if (sigma <= 0) {
    return Array.from({ length: size }, (_, iy) =>
      Array.from({ length: size }, (_, ix) => (iy === radius && ix === radius ? 1 : 0)),
    );
  }
  const kernel: number[][] = [];
  let sum = 0;
  for (let iy = 0; iy < size; iy++) {
    const row: number[] = [];
    for (let ix = 0; ix < size; ix++) {
      const x = ix - radius;
      const y = iy - radius;
      const val = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      row.push(val);
      sum += val;
    }
    kernel.push(row);
  }
  return kernel.map(row => row.map(v => v / sum));
}

/**
 * Applies a 2-D convolution to a flat row-major grayscale image.
 * Out-of-bounds pixel reads are handled by clamping coordinates to the valid range.
 *
 * @param image  - Flat row-major pixel array (length = width × height).
 * @param width  - Image width in pixels.
 * @param height - Image height in pixels.
 * @param kernel - Square 2-D convolution kernel ((2r+1) × (2r+1)).
 * @returns New flat array with the same dimensions as the input.
 * @complexity O(width · height · kernelSize²)
 */
export function applyConvolution2D(
  image: ReadonlyArray<number>,
  width: number,
  height: number,
  kernel: ReadonlyArray<ReadonlyArray<number>>,
): ReadonlyArray<number> {
  const kSize = kernel.length;
  const kRadius = Math.floor(kSize / 2);
  const result = new Array<number>(width * height);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let sum = 0;
      for (let ky = 0; ky < kSize; ky++) {
        const kRow = kernel[ky]!;
        for (let kx = 0; kx < kSize; kx++) {
          const sy = Math.max(0, Math.min(height - 1, py + ky - kRadius));
          const sx = Math.max(0, Math.min(width - 1, px + kx - kRadius));
          // Safe: sy and sx are clamped to [0, height/width-1]; ky < kSize = kernel.length
          sum += image[sy * width + sx]! * kRow[kx]!;
        }
      }
      result[py * width + px] = sum;
    }
  }
  return result;
}

// ─── §27.3: Edge Detection ────────────────────────────────────────────────────

/**
 * Computes the Sobel gradient magnitude and direction for a grayscale image.
 *
 * Sobel kernels:
 *   Kx = [[-1,0,1],[-2,0,2],[-1,0,1]]  (detects vertical edges / horizontal gradients)
 *   Ky = [[-1,-2,-1],[0,0,0],[1,2,1]]   (detects horizontal edges / vertical gradients)
 *
 * Out-of-bounds reads are clamped.
 *
 * @param image  - Flat row-major grayscale pixel array.
 * @param width  - Image width in pixels.
 * @param height - Image height in pixels.
 * @returns Object containing:
 *   - `magnitude`: sqrt(Gx²+Gy²) for each pixel
 *   - `direction`: atan2(Gy, Gx) in radians for each pixel
 * @complexity O(width · height)
 */
export function sobelGradient(
  image: ReadonlyArray<number>,
  width: number,
  height: number,
): { magnitude: ReadonlyArray<number>; direction: ReadonlyArray<number> } {
  const Kx = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ] as const;
  const Ky = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ] as const;
  const n = width * height;
  const magnitude = new Array<number>(n);
  const direction = new Array<number>(n);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let gx = 0;
      let gy = 0;
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const sy = Math.max(0, Math.min(height - 1, py + ky - 1));
          const sx = Math.max(0, Math.min(width - 1, px + kx - 1));
          // Safe: sy/sx clamped to valid range; ky,kx ∈ [0,2] matching Kx/Ky dims
          const pixel = image[sy * width + sx]!;
          gx += pixel * Kx[ky]![kx]!;
          gy += pixel * Ky[ky]![kx]!;
        }
      }
      const idx = py * width + px;
      magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
      direction[idx] = Math.atan2(gy, gx);
    }
  }
  return { magnitude, direction };
}

/**
 * Performs non-maximum suppression on gradient magnitude along the gradient direction.
 *
 * The gradient direction is quantised to one of four orientations (0°, 45°, 90°, 135°).
 * A pixel is kept only if it is a local maximum along its gradient direction; otherwise
 * it is set to 0. Out-of-bounds neighbours are treated as having magnitude 0.
 *
 * @param magnitude - Gradient magnitude array (flat row-major).
 * @param direction - Gradient direction array in radians (flat row-major).
 * @param width     - Image width in pixels.
 * @param height    - Image height in pixels.
 * @returns Flat array with non-maximum pixels set to 0.
 * @complexity O(width · height)
 */
export function nonMaxSuppression1D(
  magnitude: ReadonlyArray<number>,
  direction: ReadonlyArray<number>,
  width: number,
  height: number,
): ReadonlyArray<number> {
  const result = new Array<number>(width * height).fill(0);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const idx = py * width + px;
      const mag = magnitude[idx]!;
      const angleDeg = direction[idx]! * (180 / Math.PI);
      // Normalise to [0°, 180°) so opposite directions map to the same orientation
      const normAngle = ((angleDeg % 180) + 180) % 180;

      let n1: number;
      let n2: number;
      if (normAngle < 22.5 || normAngle >= 157.5) {
        // 0° — compare left and right neighbours
        n1 = px > 0 ? magnitude[py * width + px - 1]! : 0;
        n2 = px < width - 1 ? magnitude[py * width + px + 1]! : 0;
      } else if (normAngle < 67.5) {
        // 45° — compare upper-right and lower-left neighbours
        n1 = px < width - 1 && py > 0 ? magnitude[(py - 1) * width + px + 1]! : 0;
        n2 = px > 0 && py < height - 1 ? magnitude[(py + 1) * width + px - 1]! : 0;
      } else if (normAngle < 112.5) {
        // 90° — compare up and down neighbours
        n1 = py > 0 ? magnitude[(py - 1) * width + px]! : 0;
        n2 = py < height - 1 ? magnitude[(py + 1) * width + px]! : 0;
      } else {
        // 135° — compare upper-left and lower-right neighbours
        n1 = px > 0 && py > 0 ? magnitude[(py - 1) * width + px - 1]! : 0;
        n2 =
          px < width - 1 && py < height - 1
            ? magnitude[(py + 1) * width + px + 1]!
            : 0;
      }
      result[idx] = mag >= n1 && mag >= n2 ? mag : 0;
    }
  }
  return result;
}

/**
 * Applies a binary threshold to a grayscale image.
 * Returns 1.0 for pixels ≥ threshold, 0.0 otherwise.
 *
 * @param image     - Flat grayscale pixel array.
 * @param threshold - Threshold value.
 * @returns Binary flat array with values 0.0 or 1.0.
 * @complexity O(n)
 */
export function applyThreshold(
  image: ReadonlyArray<number>,
  threshold: number,
): ReadonlyArray<number> {
  return image.map(v => (v >= threshold ? 1.0 : 0.0));
}

/**
 * Full edge detection pipeline (simplified Canny-style):
 *   1. Gaussian smoothing with the given σ
 *   2. Sobel gradient computation
 *   3. Non-maximum suppression
 *   4. Binary thresholding
 *
 * @param grayscaleImage - Flat row-major grayscale image.
 * @param width          - Image width in pixels.
 * @param height         - Image height in pixels.
 * @param sigma          - Standard deviation for Gaussian smoothing (≥ 0).
 * @param threshold      - Edge-strength threshold for the binary output.
 * @returns Binary flat array: 1 = edge pixel, 0 = non-edge pixel.
 * @complexity O(width · height)
 */
export function computeEdges(
  grayscaleImage: ReadonlyArray<number>,
  width: number,
  height: number,
  sigma: number,
  threshold: number,
): ReadonlyArray<number> {
  const radius = Math.ceil(2 * sigma);
  const kernel = gaussianKernel2D(sigma, radius);
  const blurred = applyConvolution2D(grayscaleImage, width, height, kernel);
  const { magnitude, direction } = sobelGradient(blurred, width, height);
  const suppressed = nonMaxSuppression1D(magnitude, direction, width, height);
  return applyThreshold(suppressed, threshold);
}

// ─── §27.6: Optical Flow ─────────────────────────────────────────────────────

/**
 * Estimates dense optical flow using Sum of Squared Differences (SSD) block matching.
 *
 * For each pixel (x, y), finds the displacement (dx, dy) that minimises the SSD
 * between the block centred at (x, y) in frame1 and the block centred at
 * (x+dx, y+dy) in frame2, searching over all |dx|, |dy| ≤ searchRadius.
 *
 * Border pixels whose block in frame1 extends outside image bounds return {dx:0, dy:0}.
 *
 * @param frame1       - Flat row-major grayscale pixel array (first frame).
 * @param frame2       - Flat row-major grayscale pixel array (second frame).
 * @param width        - Image width in pixels.
 * @param height       - Image height in pixels.
 * @param blockRadius  - Half-size of the matching block (block = (2r+1)×(2r+1)).
 * @param searchRadius - Maximum displacement to search in each direction.
 * @returns Array of {dx, dy} flow vectors, one per pixel (row-major order).
 * @complexity O(width · height · searchRadius² · blockRadius²)
 */
export function ssdOpticalFlow(
  frame1: ReadonlyArray<number>,
  frame2: ReadonlyArray<number>,
  width: number,
  height: number,
  blockRadius: number,
  searchRadius: number,
): ReadonlyArray<{ dx: number; dy: number }> {
  const result: { dx: number; dy: number }[] = [];
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // Border pixels whose source block in frame1 goes out of bounds
      if (
        px - blockRadius < 0 ||
        px + blockRadius >= width ||
        py - blockRadius < 0 ||
        py + blockRadius >= height
      ) {
        result.push({ dx: 0, dy: 0 });
        continue;
      }
      let bestDx = 0;
      let bestDy = 0;
      let bestSSD = Infinity;
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          // Skip displacements where the frame2 block goes out of bounds
          if (
            nx - blockRadius < 0 ||
            nx + blockRadius >= width ||
            ny - blockRadius < 0 ||
            ny + blockRadius >= height
          ) {
            continue;
          }
          let ssd = 0;
          for (let by = -blockRadius; by <= blockRadius; by++) {
            for (let bx = -blockRadius; bx <= blockRadius; bx++) {
              // Safe: frame1 block in-bounds (checked above); frame2 bounds guarded above
              const v1 = frame1[(py + by) * width + (px + bx)]!;
              const v2 = frame2[(ny + by) * width + (nx + bx)]!;
              const diff = v1 - v2;
              ssd += diff * diff;
            }
          }
          if (ssd < bestSSD) {
            bestSSD = ssd;
            bestDx = dx;
            bestDy = dy;
          }
        }
      }
      result.push({ dx: bestDx, dy: bestDy });
    }
  }
  return result;
}

// ─── §27.2: Perspective Projection and Depth ─────────────────────────────────

/**
 * Projects a 3-D point onto the image plane using the pinhole camera model.
 * Formula: x_img = −f·X/Z, y_img = −f·Y/Z (standard pinhole sign convention).
 *
 * @param x3d         - 3-D X coordinate.
 * @param y3d         - 3-D Y coordinate.
 * @param z3d         - 3-D depth (must be > 0; points at or behind the camera return null).
 * @param focalLength - Camera focal length.
 * @returns Projected 2-D point {x, y}, or null if z3d ≤ 0.
 * @complexity O(1)
 */
export function perspectiveProject(
  x3d: number,
  y3d: number,
  z3d: number,
  focalLength: number,
): { x: number; y: number } | null {
  if (z3d <= 0) return null;
  return {
    x: (-focalLength * x3d) / z3d,
    y: (-focalLength * y3d) / z3d,
  };
}

/**
 * Computes Lambertian (diffuse) shading intensity for a surface point.
 * Intensity = albedo × lightIntensity × max(0, n̂·l̂)
 * where n̂ and l̂ are the normalised surface normal and light direction vectors.
 *
 * Returns 0 for degenerate inputs (zero-length normal or light vector).
 *
 * @param normalX        - X component of the surface normal.
 * @param normalY        - Y component of the surface normal.
 * @param normalZ        - Z component of the surface normal.
 * @param lightX         - X component of the light direction vector.
 * @param lightY         - Y component of the light direction vector.
 * @param lightZ         - Z component of the light direction vector.
 * @param albedo         - Surface reflectance coefficient (typically [0, 1]).
 * @param lightIntensity - Light source intensity.
 * @returns Shading intensity clamped to [0, lightIntensity].
 * @complexity O(1)
 */
export function lambertShading(
  normalX: number,
  normalY: number,
  normalZ: number,
  lightX: number,
  lightY: number,
  lightZ: number,
  albedo: number,
  lightIntensity: number,
): number {
  const normalMag = Math.sqrt(normalX ** 2 + normalY ** 2 + normalZ ** 2);
  if (normalMag === 0) return 0;
  const lightMag = Math.sqrt(lightX ** 2 + lightY ** 2 + lightZ ** 2);
  if (lightMag === 0) return 0;
  const nx = normalX / normalMag;
  const ny = normalY / normalMag;
  const nz = normalZ / normalMag;
  const lx = lightX / lightMag;
  const ly = lightY / lightMag;
  const lz = lightZ / lightMag;
  const cosTheta = nx * lx + ny * ly + nz * lz;
  if (cosTheta < 0) return 0;
  return Math.min(lightIntensity, albedo * lightIntensity * cosTheta);
}

/**
 * Computes scene depth from stereo disparity using the triangulation formula.
 * depth = (baseline × focalLength) / disparity
 *
 * @param disparity   - Pixel disparity between left and right stereo views (must be > 0).
 * @param baseline    - Distance between the two camera centres.
 * @param focalLength - Camera focal length.
 * @returns Depth value, or null if disparity ≤ 0 (undefined depth).
 * @complexity O(1)
 */
export function computeDepthFromDisparity(
  disparity: number,
  baseline: number,
  focalLength: number,
): number | null {
  if (disparity <= 0) return null;
  return (baseline * focalLength) / disparity;
}

// ─── §27.5: Bounding-Box Object Detection ────────────────────────────────────

/**
 * Computes Intersection over Union (IoU) between two axis-aligned bounding boxes.
 * Each box is represented as [x1, y1, x2, y2] with x1 ≤ x2 and y1 ≤ y2.
 *
 * @param box1 - First bounding box [x1, y1, x2, y2].
 * @param box2 - Second bounding box [x1, y1, x2, y2].
 * @returns IoU in [0, 1]; 0 if boxes do not overlap or union area is zero.
 * @complexity O(1)
 */
export function iouBoundingBox(
  box1: readonly [number, number, number, number],
  box2: readonly [number, number, number, number],
): number {
  const ix1 = Math.max(box1[0], box2[0]);
  const iy1 = Math.max(box1[1], box2[1]);
  const ix2 = Math.min(box1[2], box2[2]);
  const iy2 = Math.min(box1[3], box2[3]);
  if (ix2 <= ix1 || iy2 <= iy1) return 0;
  const intersection = (ix2 - ix1) * (iy2 - iy1);
  const area1 = (box1[2] - box1[0]) * (box1[3] - box1[1]);
  const area2 = (box2[2] - box2[0]) * (box2[3] - box2[1]);
  const union = area1 + area2 - intersection;
  return intersection / union;
}

/**
 * Applies greedy Non-Maximum Suppression (NMS) to a list of bounding boxes.
 *
 * Algorithm: sort boxes by score (descending); iteratively keep the
 * highest-scoring box and discard all remaining boxes whose IoU with
 * any kept box exceeds iouThreshold.
 *
 * @param boxes        - Array of bounding boxes [x1, y1, x2, y2].
 * @param scores       - Confidence score for each box (same order as boxes).
 * @param iouThreshold - IoU threshold above which overlapping boxes are suppressed.
 * @returns Array of surviving box indices sorted by score descending.
 * @complexity O(n²) worst case
 */
export function nmsBoxes(
  boxes: ReadonlyArray<readonly [number, number, number, number]>,
  scores: ReadonlyArray<number>,
  iouThreshold: number,
): ReadonlyArray<number> {
  if (boxes.length === 0) return [];
  const indices = Array.from({ length: boxes.length }, (_, i) => i).sort(
    (a, b) => scores[b]! - scores[a]!,
  );
  const kept: number[] = [];
  const suppressed = new Set<number>();
  for (const idx of indices) {
    if (suppressed.has(idx)) continue;
    kept.push(idx);
    const keptBox = boxes[idx]!;
    for (const other of indices) {
      if (other !== idx && !suppressed.has(other)) {
        if (iouBoundingBox(keptBox, boxes[other]!) > iouThreshold) {
          suppressed.add(other);
        }
      }
    }
  }
  return kept;
}
