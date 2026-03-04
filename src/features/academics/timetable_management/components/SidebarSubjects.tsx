import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DraggableSubject } from './DraggableSubject';
import { initialSubjects } from '../data/mockData';
import { BookOpen } from 'lucide-react';

export function SidebarSubjects() {
    return (
        <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Subjects
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                    Drag subjects to empty cells
                </p>
            </CardHeader>
            <CardContent className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
                {initialSubjects.map((subject, index) => (
                    <motion.div
                        key={subject._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <DraggableSubject subject={subject} />
                    </motion.div>
                ))}
            </CardContent>
        </Card>
    );
}
