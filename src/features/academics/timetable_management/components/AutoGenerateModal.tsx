import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
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
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { getApiAccessToken, api } from '@/lib/axios';
import { setIsGenerating, applyGeneratedSchedule } from '../store/timetableSlice';

interface AutoGenerateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sectionId: string;
    timeslots: any[];
}

export function AutoGenerateModal({
    open,
    onOpenChange,
    sectionId,
    timeslots,
}: AutoGenerateModalProps) {
    const dispatch = useDispatch();
    const [query, setQuery] = useState('');
    const [isGeneratingLocally, setIsGeneratingLocally] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState({ generation: 0, fitness: -5000, isComplete: false });
    const eventSourceRef = useRef<EventSource | null>(null);

    const cleanup = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    };

    useEffect(() => {
        return cleanup;
    }, []);

    const handleGenerate = () => {
        setError(null);
        setIsGeneratingLocally(true);
        dispatch(setIsGenerating(true));
        setProgress({ generation: 0, fitness: -5000, isComplete: false });

        const token = getApiAccessToken();
        const baseUrl = api.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        
        // Ensure we don't have duplicate slashes and matches the backend path
        const buildUrl = () => {
            const base = baseUrl.replace(/\/+$/, '');
            return `${base}/auth/sections/${sectionId}/auto-generate/stream?token=${token}`;
        };

        const url = buildUrl();
        console.log("Connecting to SSE:", url);

        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.addEventListener('progress', (event: any) => {
            try {
                const data = JSON.parse(event.data);
                setProgress({
                    generation: data.generation,
                    fitness: data.fitness,
                    isComplete: data.isComplete
                });

                // Update the grid real-time!
                dispatch(applyGeneratedSchedule({ 
                    schedules: data.schedule, 
                    timeslots: timeslots 
                }));
            } catch (err) {
                console.error("Error parsing progress data:", err);
            }
        });

        es.addEventListener('error', (event: any) => {
            try {
                const data = JSON.parse(event.data);
                setError(data.message || "An unexpected error occurred during generation.");
            } catch (err) {
                setError("An unexpected algorithm error occurred.");
            }
            setIsGeneratingLocally(false);
            dispatch(setIsGenerating(false));
            cleanup();
        });

        es.addEventListener('complete', () => {
            setIsGeneratingLocally(false);
            dispatch(setIsGenerating(false));
            cleanup();
        });

        es.onerror = (e) => {
            console.error("SSE Error:", e);
            setError("Connection to generation engine lost. Please try again.");
            setIsGeneratingLocally(false);
            dispatch(setIsGenerating(false));
            cleanup();
        };
    };

    const handleClose = () => {
        if (!isGeneratingLocally) {
            setQuery('');
            setError(null);
            setProgress({ generation: 0, fitness: -5000, isComplete: false });
            onOpenChange(false);
        }
    };

    // Calculate a percentage for the fitness progress (assuming -5000 to 0 range for visualization)
    const fitnessPercentage = Math.min(100, Math.max(0, ((progress.fitness + 5000) / 5000) * 100));

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <Sparkles className="w-5 h-5 text-violet-500" />
                        AI Timetable Architect
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Evolving a conflict-free schedule for your classroom in real-time.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {!isGeneratingLocally && !progress.isComplete ? (
                        <div className="space-y-4">
                            <Textarea
                                placeholder="Any specific requirements? (e.g., 'No heavy subjects after lunch', 'Keep Science in the morning')"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="min-h-[120px] resize-none bg-background border-border text-foreground"
                            />
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider bg-muted/30 p-2 rounded border border-border/50">
                                <Zap className="w-3 h-3 text-amber-500" />
                                Optimization: Genetic Algorithm v2.4 (Conflict-Aware)
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 py-2">
                             <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest">
                                        {progress.isComplete ? "Evolution Success" : "Algorithm Running"}
                                    </span>
                                    <h4 className="text-xl font-bold flex items-center gap-2">
                                        Generation {progress.generation} 
                                        {progress.isComplete && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    </h4>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Confidence Score</span>
                                    <div className="text-lg font-black text-violet-600">{Math.round(fitnessPercentage)}%</div>
                                </div>
                             </div>

                             <div className="space-y-2">
                                <Progress value={fitnessPercentage} className="h-2 bg-violet-100" />
                                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                    <span>Solving Clashes...</span>
                                    <span>Optimizing Gaps...</span>
                                </div>
                             </div>

                             <div className="p-3 bg-violet-50 border border-violet-100 rounded-lg flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                                    <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                                </div>
                                <p className="text-xs text-violet-700 font-medium">
                                    Watch your grid! The AI is currently placing {progress.generation > 0 ? "optimized" : "random"} subjects.
                                </p>
                             </div>
                        </div>
                    )}

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
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isGeneratingLocally}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {progress.isComplete ? "Close" : "Cancel"}
                    </Button>
                    {!progress.isComplete && (
                        <Button
                            onClick={handleGenerate}
                            disabled={isGeneratingLocally}
                            className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-lg shadow-violet-200"
                        >
                            {isGeneratingLocally ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Developing...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    Generate Draft
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
