import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  CheckCheck, 
  BellRing,
  AlertTriangle,
  Info,
  Clock
} from "lucide-react";
import type { SystemEvent } from "@/services/dashboard";
import { formatDistanceToNow } from 'date-fns';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: SystemEvent[];
  unreadCount: number;
  markAllAsRead: () => void;
  markEventAsRead: (id: string) => void;
}

export function NotificationDrawer({ 
  isOpen, 
  onClose, 
  events, 
  unreadCount, 
  markAllAsRead, 
  markEventAsRead 
}: NotificationDrawerProps) {
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <BellRing className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground leading-none">Notifications</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {unreadCount} unread messages
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={() => markAllAsRead()}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground opacity-60">
                  <BellRing className="w-12 h-12 mb-4 stroke-[1]" />
                  <p>You're all caught up!</p>
                </div>
              ) : (
                events.map(event => (
                  <div 
                    key={event.id} 
                    className={`relative p-4 rounded-xl border transition-all ${
                      !event.isRead 
                        ? 'bg-primary/5 border-primary/20 shadow-sm' 
                        : 'bg-card border-border/50 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {!event.isRead && (
                      <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                      </span>
                    )}

                    <div className="flex items-start gap-4">
                       <div className="shrink-0 mt-0.5">
                        {event.severity === 'critical' ? <AlertTriangle className="h-5 w-5 text-red-500" /> :
                         event.severity === 'warning' ? <AlertTriangle className="h-5 w-5 text-amber-500" /> :
                         <Info className="h-5 w-5 text-blue-500" />}
                       </div>
                       
                       <div className="flex-1 pr-4">
                         <h4 className={`text-sm font-semibold ${!event.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                           {event.title}
                         </h4>
                         <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                           {event.message}
                         </p>
                         
                         <div className="flex items-center gap-4 mt-3">
                           <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                             <Clock className="w-3 h-3" />
                             {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                           </div>
                           
                           {event.actionUrl && (
                             <a 
                               href={event.actionUrl} 
                               className="text-xs font-semibold text-primary hover:underline"
                             >
                               View Details
                             </a>
                           )}
                           
                           {!event.isRead && (
                             <button 
                               onClick={() => markEventAsRead(event.id)}
                               className="text-[10px] font-semibold text-muted-foreground hover:text-foreground ml-auto"
                             >
                               Mark Read
                             </button>
                           )}
                         </div>
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
