import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface AutoGenerateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (query: string) => void;
    isGenerating: boolean;
    error: string | null;
}

export function AutoGenerateModal({
    open,
    onOpenChange,
    onGenerate,
    isGenerating,
    error,
}: AutoGenerateModalProps) {
    const [query, setQuery] = useState('');

    const handleSubmit = () => {
        if (query.trim()) {
            onGenerate(query.trim());
        }
    };

    const handleClose = () => {
        if (!isGenerating) {
            setQuery('');
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <Sparkles className="w-5 h-5 text-violet-500" />
                        Auto Generate Timetable
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Enter your constraints and preferences for the AI to generate an optimized timetable.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <Textarea
                        placeholder="Example: No Math on Friday. Science should be in the morning. Mr. Sharma should not have more than 2 classes per day. Avoid scheduling same subject consecutively..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={isGenerating}
                        className="min-h-[150px] resize-none bg-background border-border text-foreground placeholder:text-muted-foreground"
                    />

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30"
                            >
                                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                <p className="text-sm text-destructive">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isGenerating}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!query.trim() || isGenerating}
                        className="ai-glow-button gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Generate
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
