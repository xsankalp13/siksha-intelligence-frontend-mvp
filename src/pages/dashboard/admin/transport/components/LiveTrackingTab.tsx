import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bus, Users, Clock, MapPin, Wifi, WifiOff,
  Navigation, AlertTriangle, ArrowRight,
} from "lucide-react";
import type { Vehicle, Route, Driver } from "@/services/transportMock";

// ── Mock bus positions (lat/lng around Delhi NCR) ─────────────────────────────
// Each route has a set of waypoints the bus travels through in a loop
const ROUTE_WAYPOINTS: Record<number, [number, number][]> = {
  1: [
    [28.5605, 77.2090], // Green Park
    [28.5355, 77.2177], // Malviya Nagar
    [28.5244, 77.2066], // Saket
    [28.5535, 77.2390], // Lajpat Nagar
    [28.5645, 77.2167], // School (~AIIMS)
  ],
  2: [
    [28.5706, 77.3261], // Sector 18, Noida
    [28.5588, 77.3404], // Botanical Garden
    [28.4947, 77.0892], // DLF Phase 2
    [28.4949, 77.0886], // Cyber Hub
    [28.5272, 77.1801], // School (~RK Puram)
  ],
  3: [
    [28.6468, 77.3020], // Preet Vihar
    [28.6525, 77.2875], // Pandav Nagar
    [28.6097, 77.3006], // Mayur Vihar
    [28.5882, 77.2691], // School (~ITO)
  ],
  4: [
    [28.5921, 77.0460], // Dwarka Sector 10
    [28.6274, 77.0598], // Uttam Nagar
    [28.6444, 77.1223], // Rajouri Garden
    [28.6667, 77.1383], // Punjabi Bagh
    [28.6757, 77.1827], // School (~Karol Bagh)
  ],
};

interface BusState {
  vehicleId: number;
  routeId: number;
  lat: number;
  lng: number;
  waypointIndex: number;
  progress: number; // 0..1 between current and next waypoint
  speed: number; // km/h (simulated)
  delay: number; // minutes behind schedule (0 = on time)
  studentsOnBoard: number;
  lastUpdate: Date;
}

function interpolate(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function initBusStates(vehicles: Vehicle[], routes: Route[]): BusState[] {
  return vehicles
    .filter((v) => v.status === "Active" && v.routeId !== null)
    .map((v, i) => {
      const routeId = v.routeId!;
      const waypoints = ROUTE_WAYPOINTS[routeId] ?? [];
      const waypointIndex = i % Math.max(1, waypoints.length - 1);
      const startPos = waypoints[waypointIndex] ?? [28.6139, 77.2090];
      const route = routes.find((r) => r.id === routeId);
      return {
        vehicleId: v.id,
        routeId,
        lat: startPos[0],
        lng: startPos[1],
        waypointIndex,
        progress: 0,
        speed: 25 + Math.random() * 20,
        delay: Math.random() > 0.7 ? Math.ceil(Math.random() * 8) : 0,
        studentsOnBoard: route ? Math.floor(route.studentsCount * 0.8) : 0,
        lastUpdate: new Date(),
      };
    });
}

interface LiveTrackingTabProps {
  vehicles: Vehicle[];
  routes: Route[];
  drivers: Driver[];
}

export function LiveTrackingTab({ vehicles, routes, drivers }: LiveTrackingTabProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Record<number, import("leaflet").Marker>>({});
  const [busStates, setBusStates] = useState<BusState[]>(() => initBusStates(vehicles, routes));
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(true);

  // ── Init Leaflet map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    let L: typeof import("leaflet");

    import("leaflet").then((mod) => {
      L = mod.default;

      // Fix default icon paths (Leaflet + Vite issue)
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [28.58, 77.18],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // OpenStreetMap tiles — free, no API key
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Draw route polylines
      (Object.entries(ROUTE_WAYPOINTS) as [string, [number, number][]][]).forEach(([routeId, waypoints]) => {
        const route = routes.find((r) => r.id === +routeId);
        if (!route) return;
        const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];
        const color = colors[(+routeId - 1) % colors.length];
        L.polyline(waypoints, { color, weight: 3, opacity: 0.5, dashArray: "8,6" }).addTo(map);

        // Add stop markers
        route.stops.forEach((stop, idx) => {
          const wp = waypoints[idx] ?? waypoints[waypoints.length - 1];
          const stopIcon = L.divIcon({
            className: "",
            html: `<div style="
              background:white;border:2.5px solid ${color};border-radius:50%;
              width:10px;height:10px;box-shadow:0 1px 4px rgba(0,0,0,0.3)
            "></div>`,
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          });
          L.marker(wp, { icon: stopIcon })
            .bindTooltip(`<b>${stop.name}</b><br>${stop.time} · ${stop.studentsCount} students`, { direction: "top", offset: [0, -8] })
            .addTo(map);
        });
      });

      // School marker
      const schoolIcon = L.divIcon({
        className: "",
        html: `<div style="
          background:#6366f1;color:white;border-radius:8px;
          padding:4px 8px;font-size:11px;font-weight:700;
          box-shadow:0 2px 8px rgba(99,102,241,0.5);white-space:nowrap;
        ">🏫 School</div>`,
        iconAnchor: [36, 16],
      });
      L.marker([28.5645, 77.2167], { icon: schoolIcon }).addTo(map);

      leafletMapRef.current = map;
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markersRef.current = {};
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draw / update bus markers ───────────────────────────────────────────────
  useEffect(() => {
    if (!leafletMapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default;

      busStates.forEach((bus) => {
        const vehicle = vehicles.find((v) => v.id === bus.vehicleId);
        const isSelected = selectedBusId === bus.vehicleId;
        const statusColor = bus.delay > 0 ? "#f59e0b" : "#10b981";
        const size = isSelected ? 36 : 28;

        const html = `
          <div style="
            width:${size}px;height:${size}px;
            background:${statusColor};
            border-radius:50%;
            border:3px solid white;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 10px rgba(0,0,0,0.35)${isSelected ? ",0 0 0 4px rgba(99,102,241,0.4)" : ""};
            transition:all 0.3s;
            cursor:pointer;
          ">
            <svg width="${size * 0.55}" height="${size * 0.55}" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 20H7V21C7 21.5523 6.55228 22 6 22H5C4.44772 22 4 21.5523 4 21V20H3C2.44772 20 2 19.5523 2 19V7C2 4.238 6.477 2 12 2C17.523 2 22 4.238 22 7V19C22 19.5523 21.5523 20 21 20H20V21C20 21.5523 19.5523 22 19 22H18C17.4477 22 17 21.5523 17 21V20ZM4 13V19H20V13H4ZM4 11H20V7C20 5.343 16.418 4 12 4C7.582 4 4 5.343 4 7V11ZM6.5 16C7.32843 16 8 16.6716 8 17.5C8 18.3284 7.32843 19 6.5 19C5.67157 19 5 18.3284 5 17.5C5 16.6716 5.67157 16 6.5 16ZM17.5 16C18.3284 16 19 16.6716 19 17.5C19 18.3284 18.3284 19 17.5 19C16.6716 19 16 18.3284 16 17.5C16 16.6716 16.6716 16 17.5 16Z"/>
            </svg>
          </div>
        `;

        const icon = L.divIcon({ className: "", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

        if (markersRef.current[bus.vehicleId]) {
          markersRef.current[bus.vehicleId].setLatLng([bus.lat, bus.lng]);
          markersRef.current[bus.vehicleId].setIcon(icon);
        } else {
          const marker = L.marker([bus.lat, bus.lng], { icon })
            .addTo(leafletMapRef.current!)
            .on("click", () => setSelectedBusId((prev) => prev === bus.vehicleId ? null : bus.vehicleId));
          markersRef.current[bus.vehicleId] = marker;
        }

        // Tooltip
        markersRef.current[bus.vehicleId]
          .bindTooltip(
            `<b>${vehicle?.vehicleNumber ?? "Bus"}</b><br>
             ${bus.delay > 0 ? `⚠️ ${bus.delay} min delay` : "✅ On time"}<br>
             👥 ${bus.studentsOnBoard} students`,
            { direction: "top", offset: [0, -(size / 2) - 4], permanent: false }
          );
      });
    });
  }, [busStates, selectedBusId, vehicles]);

  // ── Animate bus positions ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setBusStates((prev) =>
        prev.map((bus) => {
          const waypoints = ROUTE_WAYPOINTS[bus.routeId];
          if (!waypoints || waypoints.length < 2) return bus;

          const nextProgress = bus.progress + 0.012 + Math.random() * 0.008;
          if (nextProgress >= 1) {
            const nextIdx = (bus.waypointIndex + 1) % (waypoints.length - 1);
            const pos = waypoints[nextIdx];
            return {
              ...bus,
              waypointIndex: nextIdx,
              progress: 0,
              lat: pos[0],
              lng: pos[1],
              lastUpdate: new Date(),
              studentsOnBoard: bus.studentsOnBoard + (Math.random() > 0.7 ? Math.floor(Math.random() * 3 - 1) : 0),
            };
          }

          const from = waypoints[bus.waypointIndex];
          const to = waypoints[(bus.waypointIndex + 1) % waypoints.length];
          const [lat, lng] = interpolate(from, to, nextProgress);
          return { ...bus, lat, lng, progress: nextProgress, lastUpdate: new Date() };
        })
      );
    }, 1500);

    return () => clearInterval(interval);
  }, [isLive]);

  const selectedBus = busStates.find((b) => b.vehicleId === selectedBusId) ?? null;
  const selectedVehicle = vehicles.find((v) => v.id === selectedBusId) ?? null;
  const selectedDriver = drivers.find((d) => d.id === selectedVehicle?.driverId) ?? null;
  const selectedRoute = routes.find((r) => r.id === selectedBus?.routeId) ?? null;

  const onTimeBuses = busStates.filter((b) => b.delay === 0).length;
  const delayedBuses = busStates.filter((b) => b.delay > 0).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-full px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">{onTimeBuses} On Time</span>
          </div>
          {delayedBuses > 0 && (
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-3 w-3 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">{delayedBuses} Delayed</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">{busStates.length} buses tracked</span>
        </div>
        <button
          onClick={() => setIsLive((v) => !v)}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
            isLive
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted border-border text-muted-foreground"
          }`}
        >
          {isLive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isLive ? "Live" : "Paused"}
        </button>
      </div>

      {/* Main layout: map + sidebar */}
      <div className="flex gap-4" style={{ height: "calc(100vh - 280px)", minHeight: "520px" }}>

        {/* Map */}
        <div className="relative flex-1 rounded-2xl overflow-hidden border border-border shadow-lg">
          {/* Leaflet CSS injected via link tag */}
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          />
          <div ref={mapRef} className="w-full h-full" />

          {/* Floating legend */}
          <div className="absolute bottom-4 left-4 z-[1000] rounded-xl border border-border bg-card/95 backdrop-blur-sm p-3 shadow-lg space-y-1.5">
            <p className="text-xs font-semibold text-foreground mb-2">Routes</p>
            {routes.map((route, i) => {
              const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];
              return (
                <div key={route.id} className="flex items-center gap-2">
                  <div className="h-2.5 w-8 rounded-full" style={{ background: colors[i % colors.length], opacity: 0.7 }} />
                  <span className="text-xs text-muted-foreground">{route.name.split("–")[0].trim()}</span>
                </div>
              );
            })}
            <div className="border-t border-border pt-1.5 mt-1.5">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground">On Time</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-xs text-muted-foreground">Delayed</span>
              </div>
            </div>
          </div>

          {/* Floating hint */}
          {!selectedBusId && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] rounded-full border border-border bg-card/90 backdrop-blur-sm px-4 py-2 shadow-md">
              <p className="text-xs text-muted-foreground">Click a bus marker to see details</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 flex flex-col gap-3 overflow-y-auto shrink-0">
          {/* Bus list */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Fleet Status</h3>
            </div>
            <div className="divide-y divide-border">
              {busStates.map((bus) => {
                const v = vehicles.find((x) => x.id === bus.vehicleId);
                const isSelected = selectedBusId === bus.vehicleId;
                return (
                  <button
                    key={bus.vehicleId}
                    onClick={() => {
                      setSelectedBusId((prev) => prev === bus.vehicleId ? null : bus.vehicleId);
                      if (leafletMapRef.current) {
                        leafletMapRef.current.setView([bus.lat, bus.lng], 14, { animate: true });
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSelected ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-accent/50"
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      bus.delay > 0 ? "bg-amber-500/15" : "bg-emerald-500/15"
                    }`}>
                      <Bus className={`h-4 w-4 ${bus.delay > 0 ? "text-amber-600" : "text-emerald-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate font-mono">{v?.vehicleNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {bus.delay > 0 ? `⚠ ${bus.delay} min late` : "✓ On time"} · {bus.studentsOnBoard} students
                      </p>
                    </div>
                    <ArrowRight className={`h-3.5 w-3.5 shrink-0 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/40"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected bus detail */}
          {selectedBus && selectedVehicle && (
            <motion.div
              key={selectedBus.vehicleId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card shadow-sm p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Bus Detail</h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  selectedBus.delay > 0
                    ? "bg-amber-500/10 text-amber-700"
                    : "bg-emerald-500/10 text-emerald-700"
                }`}>
                  {selectedBus.delay > 0 ? `${selectedBus.delay} min delay` : "On Time"}
                </span>
              </div>

              <div className="space-y-2.5">
                <DetailRow icon={<Bus className="h-3.5 w-3.5 text-muted-foreground" />} label="Vehicle" value={selectedVehicle.vehicleNumber} mono />
                <DetailRow icon={<Navigation className="h-3.5 w-3.5 text-muted-foreground" />} label="Route" value={selectedRoute?.name ?? "—"} />
                <DetailRow icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />} label="On Board" value={`${selectedBus.studentsOnBoard} / ${selectedVehicle.capacity}`} />
                <DetailRow icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />} label="Speed" value={`${Math.round(selectedBus.speed)} km/h`} />
                <DetailRow
                  icon={<MapPin className="h-3.5 w-3.5 text-muted-foreground" />}
                  label="Coordinates"
                  value={`${selectedBus.lat.toFixed(4)}, ${selectedBus.lng.toFixed(4)}`}
                  mono
                />
              </div>

              {selectedDriver && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Driver</p>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {selectedDriver.photoInitials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedDriver.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedDriver.phone}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedRoute && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Next Stops</p>
                  <div className="space-y-1.5">
                    {selectedRoute.stops.slice(0, 3).map((stop, i) => (
                      <div key={stop.id} className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${i === 0 ? "bg-primary" : "bg-muted-foreground/40"}`} />
                        <span className="text-xs text-muted-foreground truncate flex-1">{stop.name}</span>
                        <span className="text-xs font-medium text-foreground shrink-0">{stop.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  Last update: {selectedBus.lastUpdate.toLocaleTimeString()}
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DetailRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0">{icon}</span>
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <span className={`text-xs font-medium text-foreground truncate ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
