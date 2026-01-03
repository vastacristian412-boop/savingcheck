
export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export type AdStyle = 'Custom Template' | 'Standard Professional';

export enum ProductionMode {
  STUDIO = 'STUDIO',
  FASHION = 'FASHION',
  AD_GEN = 'AD_GEN',
  TEMPLATES = 'TEMPLATES'
}

export enum WorkflowStage {
  DASHBOARD = 'DASHBOARD',
  ASSET = 'ASSET',
  HUMAN_BUILDER = 'HUMAN_BUILDER',
  CREATIVE = 'CREATIVE',
  REVIEW = 'REVIEW'
}

export interface AIModel {
  id: string;
  name: string;
  age: 'Child' | 'Teen' | 'Adult' | 'Senior';
  gender: 'Male' | 'Female' | 'Neutral';
  ethnicity: 'White' | 'Black' | 'East Asian' | 'South Asian' | 'Hispanic' | 'Middle Eastern';
  skinTone: 'Fair' | 'Olive' | 'Deep' | 'Golden' | 'Warm Ivory' | 'Cool Ebony';
  faceShape: 'Oval' | 'Round' | 'Heart' | 'Square' | 'Diamond';
  eyeColor: 'Brown' | 'Blue' | 'Green' | 'Hazel' | 'Grey';
  hairStyle: 'Straight' | 'Wavy' | 'Curly' | 'Coily' | 'Short' | 'Long' | 'Pixie' | 'Buzzcut' | 'Braids';
  hairColor: 'Black' | 'Dark Brown' | 'Light Brown' | 'Blonde' | 'Red' | 'Grey' | 'Platinum' | 'Auburn';
  bodyType: 'Slim' | 'Athletic' | 'Average' | 'Plus';
  height: 'Petite' | 'Average' | 'Tall';
  isSaved?: boolean;
  headshotUrl?: string;
}

export interface ImageAnalysis {
  productType: string;
  materials: string[];
  colors: string[];
  lightingSuggestion: string;
  description: string;
  emotionalEssence: string;
  thematicProps: string[];
  suggestedBackground: string;
  suggestedAtmosphere: string;
  suggestedAdCopy?: string;
}

export interface StudioImage {
  id: string;
  url: string;
  type: 'original' | 'edited';
  prompt?: string;
  timestamp: number;
  aspectRatio: AspectRatio;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Project {
  id: string;
  name: string;
  images: StudioImage[];
  analysis: ImageAnalysis | null;
  background: string;
  atmosphere: string;
  additionalDetails: string;
  chatMessages: ChatMessage[];
  timestamp: number;
  mode: ProductionMode;
  aspectRatio: AspectRatio;
  logoUrl?: string;
  adText?: string;
  adCta?: string;
  adStyle?: AdStyle;
  styleTemplateUrl?: string;
  modelId?: string;
  selectedThematicProps: string[];
}
