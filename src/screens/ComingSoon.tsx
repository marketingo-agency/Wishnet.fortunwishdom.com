import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
}

export default function ComingSoon({ title, description, icon: Icon, iconColor }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <Card className="bg-card/50 border-border/50 shadow-lg max-w-md w-full">
        <CardContent className="pt-12 pb-10 px-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-6`}>
            <Icon className={`h-10 w-10 ${iconColor}`} />
          </div>
          <h1 className="text-3xl font-bold mb-3">{title}</h1>
          <p className="text-muted-foreground mb-6">{description}</p>
          <Badge variant="secondary" className="text-sm px-4 py-1">
            Coming Soon
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
