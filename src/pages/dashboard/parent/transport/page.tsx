import { Bus, MapPin, Navigation, PhoneCall, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TransportPage() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bus className="h-8 w-8 text-primary" />
            Transport & Tracking
          </h1>
          <p className="text-muted-foreground mt-1">Live bus tracking and driver contact information.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2 space-y-6 flex flex-col h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-semibold">Live Status: On Route To Home</span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">ETA: 15 Mins</span>
          </div>
          
          <div className="flex-1 bg-muted/30 border rounded-xl overflow-hidden relative min-h-[300px] flex items-center justify-center">
            {/* Mock Map Background */}
            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle, #0000 20%, #e2e8f0 20%, #e2e8f0 80%, #0000 80%)', backgroundSize: '20px 20px' }}></div>
            
            <div className="relative z-10 flex flex-col items-center p-6 bg-background/80 backdrop-blur rounded-2xl border shadow-sm text-center max-w-sm">
              <MapPin className="w-10 h-10 text-primary mb-3" />
              <h3 className="font-bold text-lg">Bus Route 42</h3>
              <p className="text-sm text-muted-foreground mb-4">Currently passing Central Avenue</p>
              <Button className="w-full"><Navigation className="w-4 h-4 mr-2" /> Open Full Map</Button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">Bus Information</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Vehicle Number</p>
                <p className="font-semibold text-lg">MH 12 AB 1234</p>
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">Driver Contact</p>
                <p className="font-semibold mt-1">Mr. Ramesh Yadav</p>
                <Button variant="outline" size="sm" className="w-full mt-2"><PhoneCall className="w-4 h-4 mr-2" /> Call Driver</Button>
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">Attendant Contact</p>
                <p className="font-semibold mt-1">Mrs. Sunita</p>
                <Button variant="outline" size="sm" className="w-full mt-2"><PhoneCall className="w-4 h-4 mr-2" /> Call Attendant</Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">Stops & Timings</h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              <div className="relative flex items-center gap-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 bg-background z-10" />
                <div>
                  <p className="font-medium text-sm">School Campus</p>
                  <p className="text-xs text-muted-foreground">Dep: 03:00 PM</p>
                </div>
              </div>
              <div className="relative flex items-center gap-4">
                <div className="w-5 h-5 rounded-full border-4 border-primary bg-background z-10"></div>
                <div>
                  <p className="font-medium text-sm text-primary">Current Location</p>
                  <p className="text-xs text-muted-foreground">03:15 PM</p>
                </div>
              </div>
              <div className="relative flex items-center gap-4 opacity-50">
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground bg-background z-10"></div>
                <div>
                  <p className="font-medium text-sm">Target Drop (Home)</p>
                  <p className="text-xs text-muted-foreground">ETA: 03:30 PM</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
