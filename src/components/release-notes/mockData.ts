import { ReleaseUpdate } from './types';

export const mockReleaseUpdates: ReleaseUpdate[] = [
  {
    id: '1',
    version: '1.0.0',
    date: '2026-01-22',
    category: 'feature',
    title: 'Fortun Wishnet Official Launch',
    description: 'The first Wishnet portal has officially unlocked. Inside v1.0 you will find a full launch stack: Dashboard for clarity, Files Manager for order, AI Agents Hub with Nexus for OpenAI and Google Gemini connection testing, and a Prompt Library to build repeatable magic. Add Settings and User Management, then discover the coming soon pages for the Fortun MasterMind, Marketing Hub, Wishdom product catalog, Taskforce collaboration, and the Release Notes plus Roadmap to follow the expansion.',
    changes: [
      'Complete platform foundation with secure authentication',
      'AI-powered Nexus Control Center with multi-provider support',
      'Six specialized AI agents ready to transform your workflow',
      'Comprehensive Files Manager with sectors and organization tools',
      'Full Settings suite with branding customization and user management',
      'Modular navigation with MasterMind, Wishdom, and more',
      'Role-based permissions system for team collaboration',
      'Release Notes hub to keep you informed on every update'
    ],
    isFeatured: true,
    ctaLink: '/dashboard'
  },
  {
    id: '2',
    version: '1.0.0',
    date: '2026-01-22',
    category: 'feature',
    title: 'Launch Day Features Unveiled',
    changes: [
      'Dashboard: Your central command center for quick insights and navigation',
      'Files Manager: Upload, organize, and inspect files with grid/list views and custom sectors',
      'AI Agents Hub: Browse all agents — Nexus, Promptor, Osha, Pixel, Pulse, and Echo',
      'Nexus Control Center: Configure OpenAI & Google Gemini providers, test connections in real-time',
      'Prompt Library: Create, edit, and organize quick prompts and agent-specific templates',
      'Settings: Manage account details, upload custom branding (logo & favicon), configure LLM keys',
      'User Management: Add team members with granular role-based permissions',
      'Release Notes & Roadmap: Stay updated with version history and upcoming features'
    ]
  },
  {
    id: '3',
    version: '0.9.1',
    date: '2026-01-21',
    category: 'improvement',
    title: 'Pre-Launch Polish & Preparation',
    changes: [
      'Designed consistent Coming Soon pages for all future modules',
      'Enhanced sidebar navigation with collapsible menus and color-coded icons',
      'Improved responsive layout across all screen sizes',
      'Optimized tab-based Settings page for better organization',
      'Refined AI Agents cards with active/coming soon status indicators',
      'Streamlined branding settings with dynamic logo and favicon support',
      'Enhanced user permissions UI with module-specific access controls',
      'Improved prompt library with categorized templates and quick prompts'
    ]
  },
  {
    id: '4',
    version: '0.9.0',
    date: '2026-01-20',
    category: 'fix',
    title: 'Foundation Stability Fixes',
    changes: [
      'Fixed sidebar icon alignment in collapsed state',
      'Resolved session persistence issues on page refresh',
      'Corrected navigation active state highlighting',
      'Fixed quick prompt edit button click propagation',
      'Addressed footer icon centering in sidebar',
      'Resolved file upload dialog validation errors',
      'Fixed breadcrumb navigation path display',
      'Corrected user permissions dropdown default values'
    ]
  }
];
