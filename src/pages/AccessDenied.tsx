import { useNavigate } from "react-router-dom";
import { ShieldX, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md text-center"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">403</h1>
        <h2 className="mt-2 text-lg font-semibold text-foreground">Access Denied</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          You don't have the required permissions to access this page. Please contact your
          administrator if you believe this is an error.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mt-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
      </motion.div>
    </div>
  );
}
