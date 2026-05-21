import {
  Search,
  Star,
  Wand2,
  FileText,
  Bot,
  MessageSquare,
  Lightbulb,
  Code,
  Sparkles,
  Mountain,
  Palette,
  TrendingUp,
  Users,
  Cpu,
  Globe,
  Mail,
  Send,
  BookOpen,
  Newspaper,
  Brush,
  Camera,
  Video,
  Music,
  Heart,
  Zap,
  Target,
  Flag,
  Award,
  Gift,
  ShoppingCart,
  DollarSign,
  BarChart,
  PieChart,
  Activity,
  Layers,
  Grid,
  List,
  Calendar,
  Clock,
  Bell,
  Settings,
  Wrench,
  Key,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
} from 'lucide-react';
import type React from 'react';
import type { Prompt, IconEntry } from './promptLibraryTypes';

// Icon gallery organized by category
export const iconCategories: Record<string, IconEntry[]> = {
  'Communication': [
    { name: 'MessageSquare', icon: MessageSquare },
    { name: 'Mail', icon: Mail },
    { name: 'Send', icon: Send },
    { name: 'Bell', icon: Bell },
  ],
  'Content': [
    { name: 'FileText', icon: FileText },
    { name: 'BookOpen', icon: BookOpen },
    { name: 'Newspaper', icon: Newspaper },
    { name: 'List', icon: List },
  ],
  'Creative': [
    { name: 'Palette', icon: Palette },
    { name: 'Brush', icon: Brush },
    { name: 'Sparkles', icon: Sparkles },
    { name: 'Wand2', icon: Wand2 },
    { name: 'Lightbulb', icon: Lightbulb },
    { name: 'Star', icon: Star },
  ],
  'Media': [
    { name: 'Camera', icon: Camera },
    { name: 'Video', icon: Video },
    { name: 'Music', icon: Music },
    { name: 'Mountain', icon: Mountain },
  ],
  'Analytics': [
    { name: 'TrendingUp', icon: TrendingUp },
    { name: 'BarChart', icon: BarChart },
    { name: 'PieChart', icon: PieChart },
    { name: 'Activity', icon: Activity },
  ],
  'Technology': [
    { name: 'Code', icon: Code },
    { name: 'Cpu', icon: Cpu },
    { name: 'Bot', icon: Bot },
    { name: 'Globe', icon: Globe },
    { name: 'Layers', icon: Layers },
    { name: 'Grid', icon: Grid },
  ],
  'Actions': [
    { name: 'Zap', icon: Zap },
    { name: 'Target', icon: Target },
    { name: 'Flag', icon: Flag },
    { name: 'Award', icon: Award },
    { name: 'Check', icon: Check },
  ],
  'Business': [
    { name: 'Users', icon: Users },
    { name: 'ShoppingCart', icon: ShoppingCart },
    { name: 'DollarSign', icon: DollarSign },
    { name: 'Gift', icon: Gift },
    { name: 'Heart', icon: Heart },
  ],
  'Utility': [
    { name: 'Settings', icon: Settings },
    { name: 'Wrench', icon: Wrench },
    { name: 'Calendar', icon: Calendar },
    { name: 'Clock', icon: Clock },
    { name: 'Search', icon: Search },
  ],
  'Security': [
    { name: 'Key', icon: Key },
    { name: 'Lock', icon: Lock },
    { name: 'Shield', icon: Shield },
    { name: 'Eye', icon: Eye },
    { name: 'EyeOff', icon: EyeOff },
  ],
  'Feedback': [
    { name: 'AlertCircle', icon: AlertCircle },
    { name: 'Info', icon: Info },
    { name: 'HelpCircle', icon: HelpCircle },
  ],
};

// Flatten for lookup
export const allIcons = Object.values(iconCategories).flat();

export const getIconComponentByName = (iconName: string): React.ElementType => {
  const found = allIcons.find(i => i.name === iconName);
  return found?.icon || Sparkles;
};

// Map icon names to components for Quick Prompts display
const quickPromptIconMap: Record<string, React.ElementType> = {
  Lightbulb,
  FileText,
  Code,
  Sparkles,
  Mountain,
  Palette,
  TrendingUp,
  Users,
  Cpu,
  MessageSquare,
  Wand2,
  Bot,
  Star,
};

export const getQuickPromptIcon = (iconName: string): React.ElementType => {
  return quickPromptIconMap[iconName] || getIconComponentByName(iconName) || Sparkles;
};

export const categoryIcons = {
  system: FileText,
  template: Wand2,
  agent: Bot,
};

export const categoryLabels = {
  system: 'System',
  template: 'Template',
  agent: 'Agent',
};

export const mockPrompts: Prompt[] = [
  {
    id: '1',
    name: 'Helpful Assistant',
    description: 'Default helpful AI assistant persona',
    category: 'system',
    content: 'You are a helpful AI assistant. You provide accurate, helpful responses while being friendly and professional.',
    agentIds: ['nexus', 'osha'],
    isFavorite: true,
    tags: ['general', 'friendly'],
  },
  {
    id: '2',
    name: 'Code Reviewer',
    description: 'Technical code review specialist',
    category: 'system',
    content: 'You are an expert code reviewer. Analyze code for bugs, performance issues, security vulnerabilities, and best practices. Provide constructive feedback.',
    agentIds: ['promptor'],
    isFavorite: false,
    tags: ['technical', 'code'],
  },
  {
    id: '3',
    name: 'Creative Brainstorm',
    description: 'Generate creative ideas and solutions',
    category: 'template',
    content: 'Generate 5 creative ideas for {{topic}}. For each idea, include:\n1. Title\n2. Brief description\n3. Implementation steps\n4. Potential challenges',
    agentIds: ['osha'],
    isFavorite: true,
    tags: ['creative', 'brainstorm'],
  },
  {
    id: '4',
    name: 'Podcast Script',
    description: 'Podcast episode script template',
    category: 'agent',
    content: 'You are a podcast scriptwriter for {{company_name}}. Write an engaging, well-paced episode script with a strong hook, clear segments, and a natural conversational tone ready for audio narration.',
    agentIds: ['whisper'],
    isFavorite: false,
    tags: ['podcast', 'audio', 'script'],
  },
  {
    id: '5',
    name: 'Research Summary',
    description: 'Summarize research findings',
    category: 'template',
    content: 'Research and summarize the following topic: {{topic}}\n\nProvide:\n- Key findings\n- Sources\n- Implications\n- Further reading suggestions',
    agentIds: ['osha'],
    isFavorite: false,
    tags: ['research', 'summary'],
  },
];

export const modeLabels: Record<string, string> = {
  text: 'Text Generation',
  research: 'Deep Research',
  image: 'Image Generation',
};
