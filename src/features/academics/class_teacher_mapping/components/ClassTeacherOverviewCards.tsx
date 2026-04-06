import { Card, CardContent } from '@/components/ui/card';
import { BadgeCheck, School, UserX, Percent } from 'lucide-react';
import type { ClassTeacherOverviewStats } from '../types';

interface ClassTeacherOverviewCardsProps {
  stats: ClassTeacherOverviewStats;
}

export function ClassTeacherOverviewCards({ stats }: ClassTeacherOverviewCardsProps) {
  const cards = [
    {
      title: 'Total Sections',
      value: stats.totalSections,
      icon: School,
    },
    {
      title: 'Assigned',
      value: stats.assignedSections,
      icon: BadgeCheck,
    },
    {
      title: 'Unassigned',
      value: stats.unassignedSections,
      icon: UserX,
    },
    {
      title: 'Assignment Rate',
      value: `${stats.assignmentRate.toFixed(0)}%`,
      icon: Percent,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-semibold mt-1">{card.value}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
