
export interface WorkflowState {
  step: WorkflowStep;
  uploadedImages: string[];
  analysis: AnalysisResult | null;
  research: ResearchResult | null;
  researchOverrides: Partial<ResearchResult> | null;
  generatedAssets: GeneratedAsset[];
  site: GeneratedSite | null;
  previousSite: GeneratedSite | null; // For Diff View
  isProcessing: boolean;
  deployment: DeploymentState | null;
  error: string | null;
  logs: string[];
  gallery: GeneratedSite[];
  selectedRecipe: ForgeRecipe;
}

export type ForgeRecipe = 'default' | 'neo-brutalism' | 'glassmorphism' | 'saas-minimal' | 'cyberpunk-dark';

export interface DeploymentState {
  status: 'idle' | 'authorizing' | 'uploading' | 'ready' | 'error';
  url?: string;
  siteId?: string;
  repoUrl?: string;
  repoName?: string;
  prUrl?: string; // New: PR URL
  platform?: 'netlify' | 'github';
  timestamp?: number;
}

export enum WorkflowStep {
  UPLOAD = 'UPLOAD',
  RECIPE = 'RECIPE',
  ANALYSIS = 'ANALYSIS',
  RESEARCH = 'RESEARCH',
  EDITOR = 'EDITOR',
  GENERATION = 'GENERATION',
  CODING = 'CODING',
  PREVIEW = 'PREVIEW'
}

export interface AnalysisResult {
  pageType: string;
  industry: string;
  intent: string;
  targetAudience: string;
  colorPalette: string[];
  layoutStructure: string[];
  uxPatterns: string[];
  isEcommerce: boolean;
}

export interface PaymentConfig {
  method: 'upi' | 'qr';
  upiId?: string;
  qrImage?: string; // base64
}

export interface ProductItem {
  id: string;
  name: string;
  price: string;
  description?: string;
  image?: string; // base64 or URL
}

export interface ResearchResult {
  trends: string[];
  competitors: string[];
  keywords: string[];
  recommendedDesignSystem: {
    primaryColor: string;
    fontStyle: string;
    borderRadius: string;
  };
  sources: { title: string; uri: string }[];
  marketContent: {
    aboutUs: string;
    services: string[];
    valueProposition: string;
  };
  paymentConfig?: PaymentConfig;
  products?: ProductItem[];
}

export interface GeneratedAsset {
  id: string;
  type: 'hero' | 'feature' | 'product' | 'abstract' | 'icon' | 'car';
  url: string;
  prompt: string;
}

export interface WebPage {
  name: string;
  filename: string;
  code: string;
}

export interface GeneratedSite {
  id: string;
  name: string;
  pages: WebPage[];
  activePageIndex: number;
  timestamp: number;
  assets: GeneratedAsset[];
  deployment?: DeploymentState;
  analysis?: AnalysisResult;
  recipe?: ForgeRecipe;
}

export const INITIAL_STATE: WorkflowState = {
  step: WorkflowStep.UPLOAD,
  uploadedImages: [],
  analysis: null,
  research: null,
  researchOverrides