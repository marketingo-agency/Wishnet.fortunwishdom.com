import React from 'react';
import { PlannedRelease, PlannedStatus } from './types';
import { Badge } from '@/components/ui/badge';
import { Rocket, Zap, Clock, CheckCircle2 } from 'lucide-react';

interface PlannedReleasesProps {
  releases: PlannedRelease[];
}

const statusConfig: Record<PlannedStatus, { 
  label: string; 
  badgeClass: string; 
  dotClass: string; 
  cardAccent: string;
  icon: React.ElementType;
}> = {
  'in-progress': {
    label: 'In Progress',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 transition-colors',
    dotClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600 ring-emerald-100',
    cardAccent: 'from-white to-emerald-50/50 border-emerald-100',
    icon: Zap,
  },
  'coming-soon': {
    label: 'Coming Soon',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 transition-colors',
    dotClass: 'bg-gradient-to-br from-amber-400 to-amber-600 ring-amber-100',
    cardAccent: 'from-white to-amber-50/50 border-amber-100',
    icon: Clock,
  },
  'planned': {
    label: 'Planned',
    badgeClass: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200 transition-colors',
    dotClass: 'bg-gradient-to-br from-sky-400 to-sky-600 ring-sky-100',
    cardAccent: 'from-white to-sky-50/50 border-sky-100',
    icon: CheckCircle2,
  },
};

// Group releases by quarter
function groupByQuarter(releases: PlannedRelease[]) {
  const groups: Record<string, PlannedRelease[]> = {};
  releases.forEach(release => {
    if (!groups[release.quarter]) {
      groups[release.quarter] = [];
    }
    groups[release.quarter].push(release);
  });
  return groups;
}

export function PlannedReleases({ releases }: PlannedReleasesProps) {
  const groupedReleases = groupByQuarter(releases);
  const quarters = Object.keys(groupedReleases);

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5 sm:p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.08%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
          <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-card/20 backdrop-blur-sm">
            <Rocket className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Product Roadmap</h2>
            <p className="text-sm sm:text-base text-white/80">Discover what's coming next to Fortun Wishnet</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {quarters.map((quarter, quarterIndex) => (
        <div key={quarter} className="space-y-6">
          {/* Quarter Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <span className="text-white font-bold text-lg">{quarter.split(' ')[0]}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{quarter}</h3>
              <p className="text-sm text-muted-foreground">
                {quarterIndex === 0 ? 'Current Quarter' : 'Upcoming'}
              </p>
            </div>
          </div>

          {/* Timeline Items */}
          <div className="relative ml-7 space-y-5">
            {/* Vertical line - positioned absolutely */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-200" />
            
            {groupedReleases[quarter].map((release) => {
              const config = statusConfig[release.status];
              const StatusIcon = config.icon;
              
              return (
                <div key={release.id} className="relative group pl-8">
                  {/* Timeline Dot - centered on the vertical line */}
                  <div className={`absolute left-[-7px] top-5 w-4 h-4 rounded-full ${config.dotClass} ring-4 transition-transform group-hover:scale-125`} />
                  
                  {/* Card */}
                  <div className={`p-5 rounded-xl border bg-gradient-to-br ${config.cardAccent} shadow-sm hover:shadow-md transition-all duration-200`}>
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="outline" className={`${config.badgeClass} font-medium`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{release.targetDate}</span>
                    </div>
                    
                    <h4 className="text-lg font-semibold text-foreground mb-2">{release.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {release.description}
                    </p>
                    
                    {release.features && release.features.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {release.features.map((feature, idx) => (
                          <span 
                            key={idx}
                            className="text-xs px-2.5 py-1 rounded-full bg-background border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
