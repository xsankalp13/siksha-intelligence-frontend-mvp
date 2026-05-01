/**
 * WidgetErrorBoundary
 * --------------------
 * React class error boundary that catches rendering errors inside a
 * single dashboard widget and shows an inline error card instead of
 * crashing the whole dashboard.
 *
 * Usage:
 *   <WidgetErrorBoundary title="Finance & Payroll Analytics">
 *     <RevenuePayrollChart ... />
 *   </WidgetErrorBoundary>
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Widget title shown in the fallback card */
  title?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you'd send this to Sentry / your error tracker
    console.error(`[WidgetErrorBoundary] "${this.props.title}" crashed:`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold text-destructive">
              {this.props.title ?? "Widget"} failed to load
            </p>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {this.state.message}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
            aria-label="Retry loading this widget"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
