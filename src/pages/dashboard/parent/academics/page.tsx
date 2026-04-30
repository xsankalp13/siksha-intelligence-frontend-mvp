import { motion } from "framer-motion";
import { BookOpen, GraduationCap, TrendingUp, AlertTriangle } from "lucide-react";
import { useChildAcademics } from "@/features/parent/queries/useParentQueries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useChildStore } from "@/features/parent/stores/useChildStore";
import { useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function AcademicsPage() {
  const { selectedChildId } = useChildStore();
  const { data: performance, isLoading, isError } = useChildAcademics();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // If height is larger than page size, we can either scale it down or add pages
      // For simplicity, we just put it on one long page or scale to fit height if needed.
      // A standard A4 is 297mm high. If it's taller, let's just add it and it might cut off, 
      // or we can adjust PDF size to be continuous. Let's make it continuous if height > 297.
      const actualHeight = pdfHeight > 297 ? pdfHeight : 297;
      const continuousPdf = new jsPDF("p", "mm", [pdfWidth, actualHeight]);
      
      continuousPdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      continuousPdf.save(`Academic_Report_Card.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!selectedChildId) {
    return <div className="p-6 text-center text-muted-foreground">Please select a child to view academic records.</div>;
  }

  if (isLoading) {
    return <div className="p-6 animate-pulse space-y-6">
      <div className="h-40 bg-muted rounded-2xl w-full" />
      <div className="h-64 bg-muted rounded-2xl w-full" />
    </div>;
  }

  if (isError || !performance) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl bg-rose-500/5 border-rose-500/20">
        <AlertTriangle className="h-10 w-10 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold">Failed to load academic records</h3>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            Academic Performance
          </h1>
          <p className="text-muted-foreground mt-1">Detailed breakdown of grades, marks, and historical trends.</p>
        </div>
        <Button onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? "Generating..." : "Download Report Card"}
        </Button>
      </div>

      {/* Hidden printable template (Bank Advice Pattern) */}
      <div className="absolute left-[-9999px] top-0 w-[1000px] bg-white text-black p-8" ref={reportRef}>
        <div className="border-b-2 border-blue-700 pb-4 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-700 m-0">ACADEMIC PERFORMANCE REPORT</h1>
            <p className="text-sm font-semibold mt-1">Institution Name</p>
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded mt-2">STUDENT ADVICE</span>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p className="m-0"><strong className="text-gray-900">Student ID:</strong> {selectedChildId}</p>
            <p className="m-0 mt-1"><strong className="text-gray-900">Generated:</strong> {new Date().toLocaleString()}</p>
            <p className="m-0 mt-1"><strong className="text-gray-900">Total Subjects:</strong> {performance.subjects.length}</p>
          </div>
        </div>

        <table className="w-full mb-6 border-collapse">
          <tbody>
            <tr>
              <td className="w-1/3 p-2">
                <div className="border border-gray-200 rounded p-3 bg-gray-50">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Current GPA</div>
                  <div className="text-lg font-bold text-green-700 mt-1">{performance.currentGpa.toFixed(1)} / {performance.maxGpa}</div>
                </div>
              </td>
              <td className="w-1/3 p-2">
                <div className="border border-gray-200 rounded p-3 bg-gray-50">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Class Average</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">{performance.classAverage.toFixed(1)}</div>
                </div>
              </td>
              <td className="w-1/3 p-2">
                <div className="border border-gray-200 rounded p-3 bg-gray-50">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Class Rank</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">{performance.rank} / {performance.totalStudents}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <p className="text-sm font-bold text-blue-700 border-b border-blue-200 pb-1 mb-3 mt-4">SECTION A — Subject-Wise Grades &amp; Details</p>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="bg-blue-700 text-white text-center p-2 border border-gray-300 w-12">#</th>
              <th className="bg-blue-700 text-white text-left p-2 border border-gray-300">Subject</th>
              <th className="bg-blue-700 text-white text-right p-2 border border-gray-300 w-24">Marks</th>
              <th className="bg-blue-700 text-white text-right p-2 border border-gray-300 w-24">Max Marks</th>
              <th className="bg-blue-700 text-white text-center p-2 border border-gray-300 w-24">Grade</th>
              <th className="bg-blue-700 text-white text-left p-2 border border-gray-300">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {performance.subjects.map((sub, idx) => (
              <tr key={sub.subject} className={idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"}>
                <td className="p-2 border border-gray-300 text-center">{idx + 1}</td>
                <td className="p-2 border border-gray-300 font-medium">{sub.subject}</td>
                <td className="p-2 border border-gray-300 text-right">{sub.marks}</td>
                <td className="p-2 border border-gray-300 text-right">{sub.maxMarks}</td>
                <td className="p-2 border border-gray-300 text-center font-bold">{sub.grade}</td>
                <td className="p-2 border border-gray-300 italic text-gray-700">{sub.teacherRemarks}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-100 font-bold border-t-2 border-blue-700">
              <td colSpan={2} className="p-2 border border-gray-300 text-right">TOTAL</td>
              <td className="p-2 border border-gray-300 text-right">{performance.subjects.reduce((sum, s) => sum + s.marks, 0)}</td>
              <td className="p-2 border border-gray-300 text-right">{performance.subjects.reduce((sum, s) => sum + s.maxMarks, 0)}</td>
              <td className="p-2 border border-gray-300 text-center text-green-700">{performance.currentGpa.toFixed(1)} GPA</td>
              <td className="p-2 border border-gray-300"></td>
            </tr>
          </tfoot>
        </table>

        <table className="w-full mt-12 mb-4">
          <tbody>
            <tr>
              <td className="w-1/3 text-center align-bottom px-4">
                <div className="border-t border-gray-800 pt-1 mt-8 text-xs">Prepared By</div>
              </td>
              <td className="w-1/3 text-center align-bottom px-4">
                <div className="border-t border-gray-800 pt-1 mt-8 text-xs">Class Teacher</div>
              </td>
              <td className="w-1/3 text-center align-bottom px-4">
                <div className="border-t border-gray-800 pt-1 mt-8 text-xs">Principal / Authorised Signatory</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8 pt-2 border-t border-gray-300 text-[10px] text-center text-gray-500">
          This is a system-generated document. Confidential — for academic purposes only.
          Any unauthorised disclosure is prohibited. | Generated: {new Date().toLocaleString()}
        </div>
      </div>

      <div className="space-y-6 bg-background rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex flex-col justify-center items-center text-center bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Current GPA</p>
          <h2 className="text-5xl font-black text-primary">{performance.currentGpa.toFixed(1)} <span className="text-xl text-muted-foreground font-medium">/ {performance.maxGpa}</span></h2>
        </Card>
        
        <Card className="p-6 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Class Average</p>
          <h2 className="text-4xl font-bold text-foreground">{performance.classAverage.toFixed(1)}</h2>
        </Card>

        <Card className="p-6 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Class Rank</p>
          <h2 className="text-4xl font-bold text-foreground">
            {performance.rank} <span className="text-xl text-muted-foreground font-medium">/ {performance.totalStudents}</span>
          </h2>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Performance Trend
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performance.trend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="exam" />
              <YAxis domain={[0, performance.maxGpa]} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Line type="monotone" dataKey="gpa" name="Student GPA" stroke="var(--primary)" strokeWidth={3} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="classAvg" name="Class Average" stroke="#8884d8" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/30">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Subject Breakdown
          </h3>
        </div>
        <div className="divide-y">
          {performance.subjects.map((sub, idx) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: idx * 0.1 }}
              key={sub.subject} 
              className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <h4 className="font-semibold text-lg">{sub.subject}</h4>
                <p className="text-sm text-muted-foreground">Remark: {sub.teacherRemarks}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-2xl font-bold">{sub.marks}</span>
                  <span className="text-muted-foreground"> / {sub.maxMarks}</span>
                </div>
                <div className="h-10 w-10 rounded-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                  {sub.grade}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
      </div>
    </div>
  );
}
