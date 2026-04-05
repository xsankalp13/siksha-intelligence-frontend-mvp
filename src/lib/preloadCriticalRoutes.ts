function preloadCriticalRoutes() {
  // Only warm login + home chunks; keep dashboard chunks deferred until navigation.
  void import("@/features/auth/LoginPage");
  void import("@/pages/HomePage");
}

export function scheduleCriticalRoutePreload() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return;

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => preloadCriticalRoutes(), { timeout: 2000 });
    return;
  }

  setTimeout(() => preloadCriticalRoutes(), 1200);
}
