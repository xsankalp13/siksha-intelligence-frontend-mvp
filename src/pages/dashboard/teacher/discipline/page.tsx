import { useState, useEffect, useMemo } from "react";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { motion, type Variants } from "framer-motion";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Plus, MessageSquare, Loader2, Search, Sparkles,
  ThumbsUp, ThumbsDown, Minus, Star, AlertTriangle
} from "lucide-react";

const TAG_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  EXCELLENT: { label: "Excellent", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Sparkles },
  GOOD: { label: "Good", color: "bg-blue-100 text-blue-700 border-blue-200", icon: ThumbsUp },
  OKAY: { label: "Okay", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Minus },
  BAD: { label: "Bad", color: "bg-red-100 text-red-700 border-red-200", icon: ThumbsDown },
  NEEDS_IMPROVEMENT: { label: "Needs Improvement", color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface Remark {
  uuid: string;
  message: string;
  tag: string;
  remarkDate: string;
  teacherName: string;
}

interface StudentOption {
  uuid: string;
  name: string;
  enrollmentNumber: string;
  className: string;
  sectionName: string;
}

export default function TeacherDisciplinePage() {
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Form state
  const [selectedStudent, setSelectedStudent] = useState("");
  const [message, setMessage] = useState("");
  const [tag, setTag] = useState("");
  const [remarkDate, setRemarkDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchRemarks();
    fetchStudents();
  }, []);

  const fetchRemarks = async () => {
    try {
      const res = await axios.get("/teacher/discipline/remarks");
      setRemarks(res.data);
    } catch {
      toast.error("Failed to load discipline remarks.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      // Use the teacher students endpoint with a large page size
      const res = await axios.get("/teacher/my-students", {
        params: { page: 0, size: 500 }
      });
      const content = res.data?.content || res.data || [];
      setStudents(
        content.map((s: any) => ({
          uuid: s.uuid,
          name: s.name || `${s.firstName || ""} ${s.lastName || ""}`.trim(),
          enrollmentNumber: s.enrollmentNumber || "-",
          className: s.className || "-",
          sectionName: s.sectionName || "-",
        }))
      );
    } catch {
      // Non-critical — teacher can still type UUID manually
    }
  };

  const handleSubmit = async () => {
    if (!selectedStudent || !message.trim() || !tag) {
      toast.error("Please fill all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post("/teacher/discipline/remarks", {
        studentUuid: selectedStudent,
        message: message.trim(),
        tag,
        remarkDate: remarkDate || undefined,
      });
      setRemarks((prev) => [res.data, ...prev]);
      toast.success("Remark added successfully!");
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create remark.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedStudent("");
    setMessage("");
    setTag("");
    setRemarkDate(new Date().toISOString().split("T")[0]);
    setSearch("");
  };

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.enrollmentNumber.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
    );
  }, [students, search]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    remarks.forEach((r) => {
      counts[r.tag] = (counts[r.tag] || 0) + 1;
    });
    return counts;
  }, [remarks]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discipline Remarks</h1>
          <p className="text-muted-foreground mt-1">
            Write remarks about student behavior and track history.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg">
              <Plus className="mr-2 h-4 w-4" /> New Remark
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Add Discipline Remark</DialogTitle>
              <DialogDescription>
                Select a student and write a remark about their behavior.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Student Selector */}
              <div className="space-y-2">
                <Label>Student *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or enrollment..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {(search || !selectedStudent) && (
                  <div className="max-h-40 overflow-y-auto rounded-md border bg-background">
                    {filteredStudents.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground text-center">No students found</p>
                    ) : (
                      filteredStudents.slice(0, 20).map((s) => (
                        <button
                          key={s.uuid}
                          type="button"
                          onClick={() => { setSelectedStudent(s.uuid); setSearch(s.name); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between items-center ${
                            selectedStudent === s.uuid ? "bg-accent font-medium" : ""
                          }`}
                        >
                          <span>{s.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {s.className} • {s.sectionName}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Tag */}
              <div className="space-y-2">
                <Label>Tag *</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TAG_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTag(key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                          tag === key
                            ? `${cfg.color} ring-2 ring-offset-1 ring-current scale-105`
                            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label>Remark Message *</Label>
                <Textarea
                  placeholder="Describe the student's behavior, performance, or actions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={remarkDate}
                  onChange={(e) => setRemarkDate(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setOpen(false); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><MessageSquare className="mr-2 h-4 w-4" /> Submit Remark</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(TAG_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <motion.div key={key} variants={itemVariants} initial="hidden" animate="show">
              <Card className="border-l-4" style={{ borderLeftColor: cfg.color.includes("emerald") ? "#10b981" : cfg.color.includes("blue") ? "#3b82f6" : cfg.color.includes("amber") ? "#f59e0b" : cfg.color.includes("red") ? "#ef4444" : "#f97316" }}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{tagCounts[key] || 0}</p>
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Remark History */}
      <Card>
        <CardHeader>
          <CardTitle>Remark History</CardTitle>
          <CardDescription>All remarks you've written, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : remarks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 mb-3 opacity-40" />
              <p className="font-medium">No remarks yet</p>
              <p className="text-sm">Click "New Remark" to write your first one.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[140px]">Tag</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remarks.map((r) => {
                    const cfg = TAG_CONFIG[r.tag] || TAG_CONFIG.OKAY;
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={r.uuid}>
                        <TableCell className="font-mono text-sm">
                          {new Date(r.remarkDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${cfg.color} gap-1`}>
                            <Icon className="h-3 w-3" /> {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="line-clamp-2 text-sm">{r.message}</p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
