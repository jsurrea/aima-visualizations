/** A single section within a chapter visualization. */
export interface ManifestSection {
  id: string;
  title: string;
  status: string;
}

/** Shape of each chapter's manifest.json file. */
export interface ManifestData {
  chapter: number;
  label?: string;
  title: string;
  shortTitle: string;
  description: string;
  part: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  partName: string;
  icon: string;
  color: string;
  basePath: string;
  sections: ManifestSection[];
  status: 'planned' | 'in-progress' | 'complete';
  techStack: string[];
}

/** Derived chapter data used by the landing page. */
export interface ChapterData {
  id: number;
  label: string;
  slug: string;
  urlPath: string;
  title: string;
  shortTitle: string;
  description: string;
  part: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  partName: string;
  icon: string;
  color: string;
  status: 'planned' | 'in-progress' | 'complete';
  techStack: string[];
  visualizationCount: number;
  isAppendix?: boolean;
}

export const PART_NAMES: Record<number, string> = {
  1: 'Artificial Intelligence',
  2: 'Problem Solving',
  3: 'Knowledge, Reasoning, and Planning',
  4: 'Uncertain Knowledge and Reasoning',
  5: 'Machine Learning',
  6: 'Communicating, Perceiving, and Acting',
  7: 'Conclusions',
  8: 'Appendices',
};

export const PART_COLORS: Record<number, string> = {
  1: '#6366F1',
  2: '#3B82F6',
  3: '#8B5CF6',
  4: '#EC4899',
  5: '#10B981',
  6: '#F59E0B',
  7: '#EF4444',
  8: '#64748B',
};

/** Convert a manifest.json payload into a ChapterData object for the landing page. */
export function manifestToChapterData(manifest: ManifestData): ChapterData {
  const num = String(manifest.chapter).padStart(2, '0');
  const isAppendix = manifest.part === 8;
  return {
    id: manifest.chapter,
    label: manifest.label ?? `Chapter ${num}`,
    slug: `chapter-${num}`,
    urlPath: manifest.basePath,
    title: manifest.title,
    shortTitle: manifest.shortTitle,
    description: manifest.description,
    part: manifest.part,
    partName: manifest.partName,
    icon: manifest.icon,
    color: manifest.color,
    status: manifest.status,
    techStack: manifest.techStack,
    visualizationCount: manifest.sections.length,
    isAppendix,
  };
}
