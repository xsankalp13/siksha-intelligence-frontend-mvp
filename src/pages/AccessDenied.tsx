import { useNavigate } from "react-router-dom";
import { ShieldX, ArrowLeft, Timer, Lock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function AccessDenied() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  // Countdown timer with auto-redirect
  useEffect(() => {
    if (countdown <= 0) {
      // Use navigate(-1) to go back to previous page in history
      // This avoids redirect loops that happen when redirecting to the same path that caused 403
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/", { replace: true });
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-lg"
      >
        {/* Decorative background elements */}
        <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-destructive/10 blur-3xl" />

        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
          {/* Header strip */}
          <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />

          <div className="p-8 text-center">
            {/* Icon with animated ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="relative mx-auto mb-6"
            >
              <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20 opacity-20" />
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5 ring-2 ring-destructive/20">
                <ShieldX className="h-12 w-12 text-destructive" />
              </div>
            </motion.div>

            {/* Error code */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-2"
            >
              <span className="bg-gradient-to-r from-destructive to-destructive/70 bg-clip-text text-6xl font-black text-transparent">
                403
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-3 text-2xl font-bold tracking-tight text-foreground"
            >
              Access Denied
            </motion.h1>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mx-auto max-w-sm text-muted-foreground"
            >
              You are not authorised to perform this action. Please contact your
              administrator if you believe this is an error.
            </motion.p>

            {/* Countdown indicator */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 flex items-center justify-center gap-3"
            >
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Timer className="h-4 w-4 animate-pulse" />
                <span>Redirecting in {countdown}s</span>
              </div>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mx-auto mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-muted"
            >
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 3, ease: "linear" }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
              />
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <Button
                onClick={handleGoBack}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back Now
              </Button>
              <Button
                variant="outline"
                onClick={handleGoHome}
                className="gap-2"
              >
                <Lock className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </motion.div>

            {/* Security notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"
            >
              <AlertTriangle className="h-3 w-3" />
              <span>Unauthorized access attempts are logged</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
