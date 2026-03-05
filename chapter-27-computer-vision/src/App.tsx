import { useState, Suspense, lazy } from 'react';
import manifest from '../manifest.json';

const ImageFormationViz = lazy(() => import('./components/ImageFormationViz'));
const EdgeDetectionViz = lazy(() => import('./components/EdgeDetectionViz'));
const OpticalFlowViz = lazy(() => import('./components/OpticalFlowViz'));
const CNNViz = lazy(() => import('./components/CNNViz'));
const ObjectDetectionViz = lazy(() => import('./components/ObjectDetectionViz'));
const StereopsisViz = lazy(() => import('./components/StereopsisViz'));
const CVApplicationsViz = lazy(() => import('./components/CVApplicationsViz'));

const CHAPTER_COLOR = '#F59E0B';

function SectionHeader({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div id={id} style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
        {title}
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, maxWidth: '700px', margin: 0 }}>
        {subtitle}
      </p>
    </div>
  );
}

function VizCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#111118',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '24px',
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>{title}</h3>
      <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px' }}>
        {description}
      </p>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Loading…</div>}>
        {children}
      </Suspense>
    </div>
  );
}

type SectionId = 'introduction' | 'image-formation' | 'image-features' | 'classification' | 'object-detection' | '3d-world' | 'applications';

const sections: Array<{ id: SectionId; label: string; book: string }> = [
  { id: 'introduction', label: 'Introduction', book: '§27.1' },
  { id: 'image-formation', label: 'Image Formation', book: '§27.2' },
  { id: 'image-features', label: 'Image Features', book: '§27.3' },
  { id: 'classification', label: 'Classification', book: '§27.4' },
  { id: 'object-detection', label: 'Object Detection', book: '§27.5' },
  { id: '3d-world', label: '3D World', book: '§27.6' },
  { id: 'applications', label: 'Applications', book: '§27.7' },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('introduction');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base, #0A0A0F)', color: 'white', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface-1, #111118)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 24px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <a href="/aima-visualizations/" style={{ color: CHAPTER_COLOR, textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
            aria-label="Back to all chapters">← All Chapters</a>
          <nav aria-label="Chapter sections" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                aria-current={activeSection === s.id ? 'page' : undefined}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer',
                  background: activeSection === s.id ? `${CHAPTER_COLOR}20` : 'transparent',
                  border: `1px solid ${activeSection === s.id ? CHAPTER_COLOR : 'rgba(255,255,255,0.12)'}`,
                  color: activeSection === s.id ? CHAPTER_COLOR : '#9CA3AF',
                  transition: 'all 0.15s',
                }}
              >
                {s.label}
                <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.6 }}>{s.book}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Chapter hero */}
      <section style={{ padding: '48px 24px 32px', maxWidth: '1000px', margin: '0 auto' }} aria-label="Chapter introduction">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px', borderRadius: '12px',
            background: `${CHAPTER_COLOR}20`, color: CHAPTER_COLOR, fontWeight: 700, fontSize: '18px',
          }}>27</span>
          <span style={{ fontSize: '32px' }} aria-hidden="true">{manifest.icon}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, marginBottom: '12px' }}>{manifest.title}</h1>
        <p style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: 1.6, maxWidth: '600px' }}>{manifest.description}</p>
      </section>

      {/* Main content */}
      <main style={{ padding: '0 24px 64px', maxWidth: '1000px', margin: '0 auto' }}>

        {activeSection === 'introduction' && (
          <section aria-labelledby="intro-heading">
            <SectionHeader id="intro-heading" title="Computer Vision Overview"
              subtitle="Computer vision enables machines to interpret and understand the visual world. From image formation through a lens to 3D scene understanding, §27 covers the full pipeline." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {[
                { icon: '📷', title: 'Image Formation', desc: 'Pinhole camera model, perspective projection, and Lambertian shading model the physical process of image capture (§27.2).' },
                { icon: '🔍', title: 'Feature Detection', desc: 'Edge detection via Gaussian smoothing + Sobel gradients + NMS, the foundation of classical CV (§27.3).' },
                { icon: '🧠', title: 'Deep Learning for Vision', desc: 'Convolutional neural networks learn hierarchical features — from edges to objects — enabling image classification (§27.4).' },
                { icon: '📦', title: 'Object Detection', desc: 'Bounding box regression + Non-Maximum Suppression locate and classify multiple objects in a single image (§27.5).' },
                { icon: '🌐', title: '3D World Understanding', desc: 'Stereo disparity and optical flow recover depth and motion from 2D image sequences (§27.6).' },
                { icon: '🚀', title: 'CV Applications', desc: 'Action recognition, image captioning, medical imaging, autonomous driving — vision powers modern AI applications (§27.7).' },
              ].map(card => (
                <div key={card.title} style={{
                  background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px', padding: '20px',
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '10px' }} aria-hidden="true">{card.icon}</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>{card.title}</div>
                  <div style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6 }}>{card.desc}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === 'image-formation' && (
          <section aria-labelledby="imgform-heading">
            <SectionHeader id="imgform-heading" title="§27.2 Image Formation"
              subtitle="The pinhole camera model projects 3D world points onto a 2D image plane. Lambertian shading models diffuse reflection as I = ρ·I₀·cos θ." />
            <VizCard title="Perspective Projection & Lambert Shading"
              description="Rotate the cube to see perspective foreshortening. Adjust focal length and light angle to explore image formation parameters.">
              <ImageFormationViz />
            </VizCard>
          </section>
        )}

        {activeSection === 'image-features' && (
          <section aria-labelledby="imgfeat-heading">
            <SectionHeader id="imgfeat-heading" title="§27.3 Simple Image Features"
              subtitle="Edge detection pipeline: Gaussian smoothing → Sobel gradient → non-maximum suppression → thresholding. Step through each stage to see the transformation." />
            <VizCard title="Canny-Style Edge Detection Pipeline"
              description="A 16×16 synthetic step-edge image processed through the full edge detection pipeline. Adjust σ and threshold and navigate the 5 pipeline stages.">
              <EdgeDetectionViz />
            </VizCard>
          </section>
        )}

        {activeSection === 'classification' && (
          <section aria-labelledby="cls-heading">
            <SectionHeader id="cls-heading" title="§27.4 Classifying Images"
              subtitle="Convolutional Neural Networks apply learned filters (kernels) to produce feature maps that highlight spatial patterns like edges and corners." />
            <VizCard title="CNN Feature Map Visualization"
              description="Apply horizontal edge, vertical edge, or corner detection kernels to an 8×8 'T' shape. Toggle augmentations to see equivariance properties.">
              <CNNViz />
            </VizCard>
          </section>
        )}

        {activeSection === 'object-detection' && (
          <section aria-labelledby="det-heading">
            <SectionHeader id="det-heading" title="§27.5 Detecting Objects"
              subtitle="Object detectors propose many bounding boxes; Non-Maximum Suppression removes duplicates by keeping only the highest-scoring box in each overlapping group." />
            <VizCard title="Non-Maximum Suppression (NMS)"
              description="8 candidate boxes with confidence scores. Step through: all boxes → sorted by score → after NMS filtering. Adjust IoU threshold to see the effect.">
              <ObjectDetectionViz />
            </VizCard>
          </section>
        )}

        {activeSection === '3d-world' && (
          <section aria-labelledby="threed-heading">
            <SectionHeader id="threed-heading" title="§27.6 The 3D World"
              subtitle="Depth can be recovered from two cameras (stereopsis) or two frames over time (optical flow). Both rely on finding corresponding image points." />
            <VizCard title="Stereo Vision & Depth from Disparity"
              description="Two cameras observe scene points at different depths. Disparity d = b·f/Z. Adjust depth and camera parameters to see how disparity changes.">
              <StereopsisViz />
            </VizCard>
            <VizCard title="Block-Matching Optical Flow (SSD)"
              description="A Gaussian blob moves from frame 1 to frame 2. The algorithm finds the best-matching block using Sum of Squared Differences and computes a flow vector for each pixel.">
              <OpticalFlowViz />
            </VizCard>
          </section>
        )}

        {activeSection === 'applications' && (
          <section aria-labelledby="apps-heading">
            <SectionHeader id="apps-heading" title="§27.7 Using Computer Vision"
              subtitle="Modern CV applications span action recognition, captioning, 3D reconstruction, style transfer, autonomous driving, and medical imaging." />
            <VizCard title="Computer Vision Applications Gallery"
              description="Six interactive cards demonstrating key CV application domains covered in §27.7.">
              <CVApplicationsViz />
            </VizCard>
          </section>
        )}

      </main>
    </div>
  );
}
