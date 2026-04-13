import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/axios";
import { History, QrCode, LogOut } from "lucide-react";
import { useStudentOverview } from "@/features/student/dashboard/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StudentPickupPage() {
  const { data: overview, isLoading: overviewLoading } = useStudentOverview();
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/adm/pickups/history");
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const generateQR = async () => {
    if (!overview?.profile) return;
    setLoading(true);
    try {
      const res = await api.post("/adm/pickups/generate", {
        studentId: overview.profile.studentId
      });
      if (res.data.qrToken) {
        const qrData = JSON.stringify({ token: res.data.qrToken });
        const url = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
        setQrImage(url);
        fetchHistory();
      }
    } catch (err) {
      console.error("Failed to generate QR", err);
    } finally {
      setLoading(false);
    }
  };

  const reopenQR = async (item: any) => {
    if (item.status !== "GENERATED" || !item.qrToken) return;
    try {
      const qrData = JSON.stringify({ token: item.qrToken });
      const url = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
      setQrImage(url);
    } catch (err) {
      console.error("Failed to regenerate QR", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Pickup QR Generator</h1>
        <p className="text-muted-foreground mt-2">
          Generate an expiring QR code for secure pickup via security guard scanning.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Pickup</CardTitle>
          <CardDescription>
            {overviewLoading ? "Loading student data..." : `Authorized pickup for: ${overview?.profile?.fullName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={generateQR} 
            disabled={loading || overviewLoading}
            className="w-full sm:w-auto"
            size="lg"
          >
            <QrCode className="mr-2 h-5 w-5" /> 
            {loading ? 'Generating...' : 'Generate Pickup QR'}
          </Button>

          {/* QR Modal Simulator */}
          {qrImage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-background rounded-xl p-8 max-w-sm w-full text-center shadow-2xl relative border">
                <Button 
                   variant="ghost" 
                   size="icon" 
                   className="absolute top-2 right-2 rounded-full" 
                   onClick={() => setQrImage(null)}
                >
                  <LogOut className="h-5 w-5 -rotate-180" />
                </Button>
                <h3 className="text-2xl font-bold mb-4">Pickup QR Code</h3>
                <div className="bg-white p-2 rounded-lg inline-block mx-auto mb-6">
                   <img src={qrImage} alt="Pickup QR" className="mx-auto w-64 h-64" />
                </div>
                <p className="text-rose-500 font-semibold mb-2">Valid for 3 hours</p>
                <p className="text-sm text-muted-foreground mb-6">Present this code to the security guard at the gate for immediate verification.</p>
                <Button onClick={() => setQrImage(null)} variant="outline" className="w-full">Done</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Pickups</CardTitle>
            <CardDescription>Track the timeline of pickups and their statuses.</CardDescription>
          </div>
          <Button variant="ghost" onClick={() => setShowHistory(!showHistory)}>
            <History className="mr-2 h-4 w-4" /> {showHistory ? 'Collapse' : 'Expand All'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {history.slice(0, showHistory ? undefined : 3).map((item) => (
              <div key={item.uuid} className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-lg">{item.studentName}</h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="bg-muted px-2 py-0.5 rounded-md font-mono">{new Date(item.generatedAt).toLocaleString()}</span>
                    <span>
                      Status: 
                      <strong className={`ml-1 px-2 py-0.5 rounded-full ${
                        item.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-500' :
                        item.status === 'EXPIRED' ? 'bg-rose-500/10 text-rose-500' : 
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {item.status}
                      </strong>
                    </span>
                  </div>
                </div>
                {item.status === 'GENERATED' && item.qrToken && (
                  <Button variant="outline" onClick={() => reopenQR(item)}>
                    <QrCode className="mr-2 h-4 w-4" /> View QR
                  </Button>
                )}
              </div>
            ))}
            {history.length === 0 && <p className="text-muted-foreground italic text-center py-4">No pickup history found.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
