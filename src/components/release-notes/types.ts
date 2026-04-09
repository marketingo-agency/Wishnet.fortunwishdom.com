export type UpdateCategory = 'feature' | 'improvement' | 'fix';

export interface ReleaseUpdate {
  id: string;
  version: string;
  date: string;
  category: UpdateCategory;
  title: string;
  description?: string;
  changes: string[];
  imageUrl?: string;
  ctaLink?: string;
  isFeatured?: boolean;
}

export interface FeedbackState {
  [updateId: string]: 'up' | 'neutral' | 'down';
}

export type PlannedStatus = 'in-progress' | 'coming-soon' | 'planned';

export interface PlannedRelease {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  quarter: string;
  status: PlannedStatus;
  features?: string[];
}
