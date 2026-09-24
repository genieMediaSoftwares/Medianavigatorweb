export * from '../shared/types';

export type NavigationTab = 
  | 'overview'
  | 'analytics'
  | 'content'
  | 'top_performers'
  | 'bottom_performers'
  | 'intelligence'
  | 'trends'
  | 'timing'
  | 'patterns'
  | 'reports'
  | 'alerts'
  | 'connections'
  | 'settings'
  | 'planner'
  | 'recommendations'
  | 'crossplatform';

export type AppViewMode = 'landing' | 'signin' | 'signup' | 'onboarding' | 'app';

export interface BrandProfile {
  brandName: string;
  niche: string;
  targetAudience: string;
  primaryLocation: string;
  mainGoal: string;
  currentExperience: string;
  preferredFormats: string[];
}

export interface UserAccount {
  fullName: string;
  email: string;
  organization: string;
  accountType: 'Creator' | 'Business' | 'Marketing agency' | 'Personal brand' | 'E-commerce' | 'Other';
  avatarUrl?: string;
}

export interface ReportItem {
  id: string;
  title: string;
  period: string;
  generatedAt: string;
  status: 'Ready' | 'Generating' | 'Failed';
  platforms: string[];
  executiveSummary: string;
  metrics: {
    totalReach: number;
    totalViews: number;
    avgEngagement: number;
    growthRate: number;
  };
  highlights: string[];
  topPerformerTitle: string;
}
