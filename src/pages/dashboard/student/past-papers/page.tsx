import { useState, useMemo } from "react";
import { Search, Loader2, AlertCircle, FileText, Download, BookOpen } from "lucide-react";
import { useGetAllPastPapers } from "@/features/examination/hooks/useExaminationQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StudentPastPapersPage() {
  const [search, setSearch] = useState("");
  const { data: pastPapers = [], isLoading, isError, refetch } = useGetAllPastPapers();

  const filtered = useMemo(() => {
    if (!search.trim()) return pastPapers;
    const q = search.toLowerCase();
    return pastPapers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.subjectName.toLowerCase().includes(q) ||
        p.examType.toLowerCase().includes(q)
    );
  }, [pastPapers, search]);

  const handleDownload = (url: string) => {
    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading past papers...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="font-medium text-lg">Failed to load past papers</p>
        <p className="text-muted-foreground text-sm">There was a problem fetching examination papers.</p>
        <Button variant="outline" onClick={() => refetch()} className="mt-2">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Past Papers</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Browse and download past examination papers for practice
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search papers, subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-card border border-border/50 rounded-2xl gap-4 text-center p-8 shadow-sm">
          <div className="p-4 bg-muted/50 rounded-full">
            <FileText className="w-12 h-12 text-muted-foreground/40" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">No Past Papers Available</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              {search 
                ? "No past papers match your search criteria." 
                : "No past papers have been uploaded yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((paper) => (
            <div
              key={paper.uuid}
              className="group flex flex-col justify-between bg-card hover:bg-muted/30 border border-border/60 hover:border-border transition-all rounded-xl p-5 shadow-sm overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/20 group-hover:bg-indigo-500/50 transition-colors" />
              
              <div className="space-y-3 relative z-10 w-full mb-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <h3 className="font-semibold text-base line-clamp-1 flex-1 pr-4" title={paper.title}>
                      {paper.title}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <span className="font-medium">{paper.subjectName}</span>
                      <span>·</span>
                      <span>{paper.examYear}</span>
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0 border border-indigo-100">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] font-semibold bg-primary/5 text-primary px-2 py-0.5 rounded-md border border-primary/10 uppercase tracking-wide">
                    {paper.examType.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-md text-foreground/70 uppercase tracking-wide">
                    {paper.className}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40 w-full">
                <span className="text-xs text-muted-foreground font-medium">
                  PDF • {(paper.fileSizeKb / 1024).toFixed(1)} MB
                </span>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="h-8 gap-1.5 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"
                  onClick={() => handleDownload(paper.fileUrl)}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
