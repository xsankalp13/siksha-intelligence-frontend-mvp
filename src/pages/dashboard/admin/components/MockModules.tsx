import { Bus, BookHeart, MapPin, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

export function TransportRadialWidget() {
  const fleetInfo = [
    { label: "Active on Route", value: 38, max: 54, color: "bg-emerald-500", text: "text-emerald-500" },
    { label: "Maintenance", value: 4, max: 54, color: "bg-red-500", text: "text-red-500" },
    { label: "Idle / Parked", value: 12, max: 54, color: "bg-amber-500", text: "text-amber-500" },
  ];

  return (
     <div className="flex flex-col h-full p-2">
       <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-3">
           <div className="p-2.5 bg-primary/10 rounded-xl">
             <Bus className="h-6 w-6 text-primary" />
           </div>
           <div>
             <h4 className="text-xl font-extrabold text-foreground">54</h4>
             <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Buses</p>
           </div>
         </div>
         <span className="px-2.5 py-1 rounded-full bg-violet-500/10 text-[10px] font-bold text-violet-600 uppercase tracking-wider">Early Access</span>
       </div>

       <div className="space-y-5 flex-1">
         {fleetInfo.map((item, i) => (
           <div key={item.label} className="space-y-2">
             <div className="flex justify-between items-center text-sm">
               <span className="font-semibold text-foreground/80">{item.label}</span>
               <span className={`font-bold ${item.text}`}>{item.value} / {item.max}</span>
             </div>
             <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${(item.value / item.max) * 100}%` }}
                 transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.1 }}
                 className={`h-full rounded-full ${item.color}`}
               />
             </div>
           </div>
         ))}
       </div>

       <div className="mt-6 p-3 bg-accent/50 rounded-xl border border-border/50 flex items-center justify-between">
         <div className="flex items-center gap-2">
           <MapPin className="h-4 w-4 text-emerald-500" />
           <span className="text-xs font-semibold text-foreground">Live GPS Sync Active</span>
         </div>
         <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
            <span className="relative flex h-1.5 w-1.5 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Just now
         </span>
       </div>
     </div>
  );
}

export function LibraryRadialWidget() {
  const libraryStats = [
    { label: "Available on Shelf", value: 12450, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Issued", value: 3420, icon: Clock, color: "text-indigo-500", bg: "bg-indigo-500/10 border-indigo-500/20" },
    { label: "Overdue", value: 145, icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
  ];

  return (
    <div className="flex flex-col h-full p-2 relative">
       {/* Demo data warning banner */}
       <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
         <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
         <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
           Demo data — Library module not yet connected
         </p>
       </div>

       <div className="flex justify-between items-center mb-4">
         <div className="flex items-center gap-3">
           <div className="p-2.5 bg-primary/10 rounded-xl">
             <BookHeart className="h-6 w-6 text-primary" />
           </div>
           <div>
             <h4 className="text-xl font-extrabold text-foreground">16,015</h4>
             <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Books</p>
           </div>
         </div>
         <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-600 uppercase tracking-wider border border-amber-500/20">Demo</span>
       </div>

       <div className="grid grid-cols-2 gap-3 flex-1 mb-4">
         {libraryStats.map(stat => (
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.4 }}
             key={stat.label} 
             className={`p-3 rounded-xl border ${stat.bg} ${stat.label.includes('Available') ? 'col-span-2' : 'col-span-1'} opacity-70`}
           >
             <div className="flex items-center gap-2 mb-1.5">
               <stat.icon className={`h-4 w-4 ${stat.color}`} />
               <span className="text-xs font-bold text-muted-foreground">{stat.label}</span>
             </div>
             <div className={`text-xl font-extrabold ${stat.color}`}>{stat.value.toLocaleString()}</div>
           </motion.div>
         ))}
       </div>

       <button disabled className="w-full py-2.5 bg-muted border border-border rounded-xl text-xs font-bold text-muted-foreground cursor-not-allowed opacity-60">
         Library module coming soon
       </button>
    </div>
  );
}
