import { PlannedRelease } from './types';

export const mockPlannedReleases: PlannedRelease[] = [
  {
    id: 'p1',
    title: 'Fortun MasterMind & AI Agents Expansion',
    description: 'Building the strategic intelligence core of Fortun Wishnet. The MasterMind module with its Brain analytics engine and Heart engagement system is taking shape, alongside Osha as your dedicated platform assistant.',
    targetDate: 'April 2026',
    quarter: 'Q2 2026',
    status: 'in-progress',
    features: ['MasterMind Hub', 'Brain Knowledge base', 'Heart Engagement', 'Osha Assistant']
  },
  {
    id: 'p6',
    title: 'Continuous Evolution & AI Enhancement',
    description: 'The journey never stops. Throughout September and beyond, expect continuous system upgrades, enhanced AI agent capabilities, performance optimizations, and new features driven by your feedback. Fortun Wishnet grows with you.',
    targetDate: 'September 2026',
    quarter: 'Q3 2026',
    status: 'planned',
    features: ['System Upgrades', 'AI Capabilities Boost', 'Performance Optimization', 'Community-Driven Features']
  },
];
