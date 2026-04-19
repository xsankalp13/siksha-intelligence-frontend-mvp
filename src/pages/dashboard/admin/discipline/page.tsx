import { useState, useEffect, useCallback } from "react";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Loader2, MessageSquare, Sparkles, ThumbsUp, ThumbsDown,
  Minus, AlertTriangle, Filter, ChevronLeft, ChevronRight,
  ArrowUpDown, RotateCcw, TrendingUp, Search
} from "lucide-react";

const TAG_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  EXCELLENT: { label: "Excellent", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Sparkles },
  GOOD: { label: "Good", color: "bg-blue-100 text-blue-700 border-blue-200", icon: ThumbsUp },
  OKAY: { label: "Okay", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Minus },
  BAD: { label: "Bad", color: "bg-red-100 text-red-700 border-red-200", icon: ThumbsDown },
  NEEDS_IMPROVEMENT: { label: "Needs Improvement", color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle },
};

interface AdminRemark {
  uuid: string;
  message: string;
  tag: string;
  remarkDate: string;
  createdAt: string;
  teacherName: string;
  teacherUuid: string;
  studentName: string;
  studentUuid: string;
  enrollmentNumber: string;
  className: string;
  sectionName: string;
}

interface PageData {
  content: AdminRemark[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface ClassOption { uuid: string; name: string; }
interface SectionOption { uuid: string; sectionName: string; }

export default function AdminDisciplinePage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [classUuid, setClassUuid] = useState("");
  const [sectionUuid, setSectionUuid] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");

  // Sorting & Pagination
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("remarkDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Dropdowns
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (classUuid) fetchSections(classUuid);
    else setSections([]);
  }, [classUuid]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        size: 15,
        sort: `${sortField},${sortDir}`,
      };
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (classUuid) params.classUuid = classUuid;
      if (sectionUuid) params.sectionUuid = sectionUuid;
      if (tagFilter) params.tag = tagFilter;
      if (search) params.search = search;

      const res = await axios.get("/auth/discipline/remarks", { params });
      setData(res.data);
    } catch {
      toast.error("Failed to load discipline data.");
    } finally {
      setLoading(false);
    }
  }, [page, sortField, sortDir, fromDate, toDate, classUuid, sectionUuid, tagFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchClasses = async () => {
    try {
      const res = await axios.get("/auth/classes");
      setClasses(res.data || []);
    } catch { /* non-critical */ }
  };

  const fetchSections = async (clsUuid: string) => {
    try {
      const res = await axios.get(`/auth/classes/${clsUuid}/sections`);
      setSections(res.data || []);
    } catch { /* non-critical */ }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setClassUuid("");
    setSectionUuid("");
    setTagFilter("");
    setSearch("");
    setPage(0);
  };

  const remarks = data?.content || [];
  const totalElements = data?.totalElements || 0;
  const totalPages = data?.totalPages || 0;

  // Summary counts from current page (simplified — in production, you'd have a separate summary endpoint)
  const positiveTags = remarks.filter((r) => ["EXCELLENT", "GOOD"].includes(r.tag)).length;
  const negativeTags = remarks.filter((r) => ["BAD", "NEEDS_IMPROVEMENT"].includes(r.tag)).length;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Discipline Management</h1>
        <p className="text-muted-foreground mt-1">
          Review all student discipline remarks across the institution.
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-100">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalElements}</p>
                <p className="text-xs text-muted-foreground">Total Remarks</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100">
                <ThumbsUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{positiveTags}</p>
                <p className="text-xs text-muted-foreground">Positive (this page)</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-100">
                <ThumbsDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{negativeTags}</p>
                <p className="text-xs text-muted-foreground">Negative (this page)</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPages}</p>
                <p className="text-xs text-muted-foreground">Pages</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Filters</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="mr-1 h-3 w-3" /> Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-1.5 lg:col-span-1">
              <Label className="text-xs">Search Student/Teacher</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Name, enrollment..." 
                  value={search} 
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }} 
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Class</Label>
              <Select value={classUuid} onValueChange={(v) => { setClassUuid(v === "ALL" ? "" : v); setSectionUuid(""); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.uuid} value={c.uuid}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Section</Label>
              <Select value={sectionUuid} onValueChange={(v) => { setSectionUuid(v === "ALL" ? "" : v); setPage(0); }} disabled={!classUuid}>
                <SelectTrigger><SelectValue placeholder={classUuid ? "All Sections" : "Select class first"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sections</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.uuid} value={s.uuid}>{s.sectionName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tag</Label>
              <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v === "ALL" ? "" : v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="All Tags" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Tags</SelectItem>
                  {Object.entries(TAG_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Discipline Remarks</CardTitle>
          <CardDescription>
            Showing {remarks.length} of {totalElements} remarks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : remarks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="mx-auto h-14 w-14 mb-4 opacity-30" />
              <p className="font-medium text-lg">No Remarks Found</p>
              <p className="text-sm mt-1">Try adjusting your filters to see results.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button onClick={() => handleSort("remarkDate")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          Date <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Enrollment #</TableHead>
                      <TableHead>
                        <button onClick={() => handleSort("student.section.academicClass.name")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          Class <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>
                        <button onClick={() => handleSort("tag")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          Tag <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[250px]">Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {remarks.map((r) => {
                      const cfg = TAG_CONFIG[r.tag] || TAG_CONFIG.OKAY;
                      const Icon = cfg.icon;
                      return (
                        <TableRow key={r.uuid}>
                          <TableCell className="font-mono text-sm whitespace-nowrap">
                            {new Date(r.remarkDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </TableCell>
                          <TableCell className="font-medium">{r.studentName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">{r.enrollmentNumber}</TableCell>
                          <TableCell>{r.className}</TableCell>
                          <TableCell>{r.sectionName}</TableCell>
                          <TableCell>{r.teacherName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${cfg.color} gap-1 whitespace-nowrap`}>
                              <Icon className="h-3 w-3" /> {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="line-clamp-2 text-sm max-w-xs">{r.message}</p>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {(data?.number || 0) + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
