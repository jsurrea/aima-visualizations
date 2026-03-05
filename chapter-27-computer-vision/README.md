# Chapter 27 — Computer Vision

Interactive visualizations for *AI: A Modern Approach, 4th Ed.* Chapter 27, covering §27.1–§27.7.

## Sections & Visualizations

### §27.1 Introduction
Overview cards summarizing all six major topics: image formation, feature detection, deep learning for vision, object detection, 3D world understanding, and CV applications.

### §27.2 Image Formation
**Perspective Projection & Lambert Shading**
- Interactive 3D cube wireframe rendered via the pinhole camera model
- Adjustable Y-rotation, focal length (50–300 px), light angle (0–180°), and surface albedo
- Lambertian sphere rendered on a `<canvas>` using `I = ρ·I₀·cos θ`
- KaTeX-rendered projection formula

### §27.3 Simple Image Features
**Canny-Style Edge Detection Pipeline**
- 5-step pipeline on a 16×16 synthetic step-edge image:
  1. Original image
  2. Gaussian blur (adjustable σ = 0.5–3.0)
  3. Sobel gradient magnitude
  4. Non-maximum suppression
  5. Threshold edge map (adjustable T = 10–100)
- Click through steps with Prev/Next buttons
- Hover any pixel to inspect its value
- KaTeX formula updates per step

### §27.4 Classifying Images
**CNN Feature Map Visualization**
- Three convolution kernels: Horizontal Edge, Vertical Edge, Corner
- 8×8 input image (T-shape) → kernel → heat-map feature map
- Toggle Rotate 90° and Shift Right augmentations to demonstrate equivariance
- Max activation pixel highlighted in amber

### §27.5 Detecting Objects
**Non-Maximum Suppression (NMS)**
- 8 candidate bounding boxes across 4 simulated objects
- 3-step walkthrough: All Boxes → Sorted by Score → After NMS
- Adjustable IoU threshold (0.2–0.8) with live kept/suppressed counts
- Color legend: blue (all) → green (kept) / red (suppressed)
- KaTeX IoU formula

### §27.6 The 3D World
**Stereo Vision & Depth from Disparity**
- Two cameras (L/R) viewing 4 scene points at adjustable depths
- Adjustable baseline (50–200) and focal length (50–200)
- Disparity vs. depth curve updates live
- Formula: d = b·f/Z

**Block-Matching Optical Flow (SSD)**
- Animated pixel-by-pixel SSD matching between two 16×16 Gaussian blob frames
- Flow vectors drawn as arrows over Frame 2
- Adjustable block radius (1–3), search radius (1–4), animation speed
- Play/Pause/Reset controls; respects `prefers-reduced-motion`

### §27.7 Using Computer Vision
**Applications Gallery** — 6 interactive cards:
1. **Human Action Recognition** — click stick figures (stand/walk/sit) to see confidence bars
2. **Image Captioning** — press Generate Caption for word-by-word generation animation
3. **3D Reconstruction** — sinusoidal depth map grid with color-coded near/far legend
4. **Style Transfer** — 8×8 image transformed to Impressionist / Sketch / Watercolor styles
5. **Self-Driving Perception** — annotated SVG scene with car, pedestrian, bicycle bounding boxes
6. **Medical Imaging** — scan SVG with highlighted malignant/benign region labels

## Algorithm Implementations (`src/algorithms/index.ts`)

| Function | Description |
|----------|-------------|
| `rgbToGrayscale` | Luminance-weighted grayscale conversion |
| `gaussianKernel1D` / `gaussianKernel2D` | Gaussian filter kernel generation |
| `applyConvolution2D` | 2D discrete convolution with zero-padding |
| `sobelGradient` | Sobel operator for gradient magnitude + direction |
| `nonMaxSuppression1D` | Thin edges by suppressing non-local-maxima |
| `applyThreshold` | Binary threshold for edge maps |
| `computeEdges` | Full Canny-style pipeline in one call |
| `ssdOpticalFlow` | Block-matching optical flow via SSD |
| `perspectiveProject` | Pinhole camera 3D→2D projection |
| `lambertShading` | Lambertian diffuse reflectance model |
| `computeDepthFromDisparity` | Stereo depth from disparity formula |
| `iouBoundingBox` | Intersection-over-Union for two AABB boxes |
| `nmsBoxes` | Non-Maximum Suppression for bounding boxes |

## Tech Stack

- **React 18** with lazy-loaded components
- **TypeScript** strict mode (no `any`)
- **KaTeX** for all mathematical notation
- **Vite** for bundling
- **Vitest** for unit tests (100% coverage on algorithm functions)

## Development

```bash
npm install
npm run dev      # dev server on http://localhost:5173/chapter-27/
npm run build    # production build
npm run test     # run Vitest suite
npm run preview  # preview production build
```
