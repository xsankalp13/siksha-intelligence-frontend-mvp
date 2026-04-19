import { motion } from "framer-motion";
import { BookOpen, GraduationCap, TrendingUp, AlertTriangle } from "lucide-react";
import { useChildAcademics } from "@/features/parent/queries/useParentQueries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useChildStore } from "@/features/parent/stores/useChildStore";

export default function AcademicsPage() {
  const { selectedChildId } = useChildStore();
  const { data: performance, isLoading, isError } = useChildAcademics();

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
        <Button>Download Report Card</Button>
      </div>

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
  );
}
