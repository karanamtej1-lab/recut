// Mock catalog of "viral templates" — mirrors RollToReel's template gallery.
// In production these come from a backend, refreshed daily from top creators.

export interface CatalogTemplate {
  id: string;
  title: string;
  niche: Niche;
  clipCount: number;
  duration: number; // seconds
  audioName: string;
  trending: boolean;
  uses: number; // social proof
  gradient: [string, string]; // card background (no real thumbs in prototype)
}

export type Niche =
  | 'Trending' | 'Travel' | 'Fitness' | 'Food'
  | 'Fashion' | 'Business' | 'Lifestyle' | 'Pets';

export const NICHES: Niche[] = [
  'Trending', 'Travel', 'Fitness', 'Food', 'Fashion', 'Business', 'Lifestyle', 'Pets',
];

export const TEMPLATES: CatalogTemplate[] = [
  { id: 't1', title: 'Day In My Life', niche: 'Lifestyle', clipCount: 6, duration: 15, audioName: 'aesthetic • original audio', trending: true, uses: 48200, gradient: ['#FF6B9D', '#C239B3'] },
  { id: 't2', title: '3-Clip Velocity Transition', niche: 'Trending', clipCount: 3, duration: 8, audioName: 'phonk • Murder In My Mind', trending: true, uses: 91500, gradient: ['#7F00FF', '#E100FF'] },
  { id: 't3', title: 'Outfit Reveal', niche: 'Fashion', clipCount: 4, duration: 10, audioName: 'gimme more • sped up', trending: true, uses: 33100, gradient: ['#FF512F', '#DD2476'] },
  { id: 't4', title: 'Recipe POV', niche: 'Food', clipCount: 7, duration: 18, audioName: 'cooking ASMR loop', trending: false, uses: 21800, gradient: ['#F7971E', '#FFD200'] },
  { id: 't5', title: 'Travel Montage', niche: 'Travel', clipCount: 8, duration: 20, audioName: 'wanderlust • indie pop', trending: true, uses: 55400, gradient: ['#2193b0', '#6dd5ed'] },
  { id: 't6', title: 'Gym Push Day', niche: 'Fitness', clipCount: 5, duration: 12, audioName: 'hard phonk • workout', trending: false, uses: 18900, gradient: ['#232526', '#FF3B5C'] },
  { id: 't7', title: 'Get Ready With Me', niche: 'Fashion', clipCount: 6, duration: 15, audioName: 'soft girl • slowed', trending: true, uses: 62300, gradient: ['#ee9ca7', '#ffdde1'] },
  { id: 't8', title: 'Before / After Glow Up', niche: 'Trending', clipCount: 2, duration: 6, audioName: 'oh no oh no • beat drop', trending: true, uses: 88700, gradient: ['#42275a', '#734b6d'] },
  { id: 't9', title: 'Café Aesthetic', niche: 'Lifestyle', clipCount: 5, duration: 14, audioName: 'lo-fi morning', trending: false, uses: 14200, gradient: ['#C9A66B', '#603813'] },
  { id: 't10', title: 'Puppy Tax', niche: 'Pets', clipCount: 4, duration: 9, audioName: 'cute • playful loop', trending: false, uses: 27600, gradient: ['#F8B500', '#fceabb'] },
  { id: 't11', title: 'Founder Story', niche: 'Business', clipCount: 5, duration: 16, audioName: 'motivational • cinematic', trending: false, uses: 9800, gradient: ['#0F2027', '#2C5364'] },
  { id: 't12', title: 'Sunset Beach Reel', niche: 'Travel', clipCount: 6, duration: 15, audioName: 'summer • feel good', trending: true, uses: 40100, gradient: ['#FF9966', '#FF5E62'] },
];

export function templatesForNiche(niche: Niche): CatalogTemplate[] {
  if (niche === 'Trending') return TEMPLATES.filter(t => t.trending);
  return TEMPLATES.filter(t => t.niche === niche);
}

export function formatUses(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}
