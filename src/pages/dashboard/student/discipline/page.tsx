import { useState, useEffect } from "react";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { motion, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, MessageSquare, Sparkles, ThumbsUp,
  ThumbsDown, Minus, AlertTriangle, CalendarDays, Search
} from "lucide-react";
import { Input } from "@/components/ui/input";

const TAG_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  EXCELLENT: { label: "Excellent", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: Sparkles },
  GOOD: { label: "Good", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: ThumbsUp },
  OKAY: { label: "Okay", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Minus },
  BAD: { label: "Bad", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: ThumbsDown },
  NEEDS_IMPROVEMENT: { label: "Needs Improvement", color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: AlertTriangle },
};

const ACCENT_BARS: Record<string, string> = {
  EXCELLENT: "from-emerald-400 to-emerald-600",
  GOOD: "from-blue-400 to-blue-600",
  OKAY: "from-amber-400 to-amber-500",
  BAD: "from-red-400 to-red-600",
  NEEDS_IMPROVEMENT: "from-orange-400 to-orange-600",
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface Remark {
  uuid: string;
  message: string;
  tag: string;
  remarkDate: string;
  teacherName: string;
}

export default function StudentDisciplinePage() {
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const filteredRemarks = remarks.filter(r => 
    r.message.toLowerCase().includes(search.toLowerCase()) ||
    r.teacherName.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    fetchRemarks();
  }, []);

  const fetchRemarks = async () => {
    try {
      const res = await axios.get("/student/discipline/remarks");
      setRemarks(res.data);
    } catch {
      toast.error("Failed to load discipline remarks.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Discipline Record</h1>
        <p className="text-muted-foreground mt-1">
          Remarks from your teachers about your behavior and performance.
        </p>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TAG_CONFIG).map(([key, cfg]) => {
          const count = remarks.filter((r) => r.tag === key).length;
          if (count === 0) return null;
          const Icon = cfg.icon;
          return (
            <Badge key={key} variant="outline" className={`${cfg.bg} ${cfg.color} gap-1.5 px-3 py-1.5 text-sm`}>
              <Icon className="h-3.5 w-3.5" /> {count} {cfg.label}
            </Badge>
          );
        })}
        {remarks.length === 0 && (
          <Badge variant="outline" className="bg-slate-50 text-slate-600 px-3 py-1.5">
            No remarks yet
          </Badge>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by message or teacher name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Timeline */}
      {filteredRemarks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <MessageSquare className="mx-auto h-14 w-14 mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-1">No Remarks Found</h3>
            <p className="text-sm text-muted-foreground">
              {search ? "No remarks match your search criteria." : "You don't have any discipline remarks from your teachers. Keep it up!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {filteredRemarks.map((r) => {
            const cfg = TAG_CONFIG[r.tag] || TAG_CONFIG.OKAY;
            const accentBar = ACCENT_BARS[r.tag] || ACCENT_BARS.OKAY;
            const Icon = cfg.icon;

            return (
              <motion.div key={r.uuid} variants={cardVariants}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex">
                    {/* Accent bar */}
                    <div className={`w-1.5 shrink-0 bg-gradient-to-b ${accentBar}`} />

                    <CardContent className="flex-1 p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          {/* Tag + Date */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="outline" className={`${cfg.bg} ${cfg.color} gap-1`}>
                              <Icon className="h-3 w-3" /> {cfg.label}
                            </Badge>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarDays className="h-3 w-3" />
                              {new Date(r.remarkDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          </div>

                          {/* Message */}
                          <p className="text-sm leading-relaxed">{r.message}</p>

                          {/* Teacher */}
                          <p className="text-xs text-muted-foreground">
                            — {r.teacherName}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
