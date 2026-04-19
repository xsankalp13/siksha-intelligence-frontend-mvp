import { useState, useEffect } from "react";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Search, Filter, CheckCircle2, Eye, Reply, XCircle, FileText, User, Home, ShieldAlert } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function AdminAdmissionDashboard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Detail View State
  const [detailApp, setDetailApp] = useState<any>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  // Action states
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [formFee, setFormFee] = useState("500");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, enqRes] = await Promise.all([
        axios.get("/adm/admission/applications"),
        axios.get("/adm/admission/enquiries")
      ]);
      setApplications(appsRes.data || []);
      setEnquiries(enqRes.data || []);
    } catch (error) {
      toast.error("Failed to fetch admission data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAppDetail = async (uuid: string) => {
    setFetchingDetail(true);
    try {
      const res = await axios.get(`/adm/admission/applications/${uuid}`);
      setDetailApp(res.data);
    } catch (error) {
      toast.error("Failed to fetch application details.");
    } finally {
      setFetchingDetail(false);
    }
  };

  const handleReply = async () => {
    if (!replyText || !selectedEnquiry) return;
    setReplying(true);
    try {
      await axios.post(`/adm/admission/enquiries/${selectedEnquiry.uuid}/reply`, { reply: replyText });
      toast.success("Reply sent!");
      setSelectedEnquiry(null);
      setReplyText("");
      fetchData();
    } catch (error) {
      toast.error("Failed to send reply.");
    } finally {
      setReplying(false);
    }
  };

  const handleAppAction = async (action: 'approve' | 'reject') => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      const payload = action === 'approve' 
        ? { remarks: reviewComment, formFee: parseFloat(formFee) } 
        : { remarks: reviewComment };
      
      await axios.post(`/adm/admission/applications/${selectedApp.uuid}/${action}`, payload);
      toast.success(`Application ${action}d successfully!`);
      setSelectedApp(null);
      setDetailApp(null);
      setReviewComment("");
      fetchData();
    } catch (error) {
      toast.error(`Operation failed. Please check your inputs.`);
    } finally {
      setActionLoading(false);
    }
  };

  const DetailSection = ({ title, icon: Icon, children }: any) => (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2 pb-1 border-b">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="font-bold text-sm uppercase tracking-wider">{title}</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        {children}
      </div>
    </div>
  );

  const DataItem = ({ label, value }: { label: string, value: any }) => (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || 'N/A'}</span>
    </div>
  );

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admission Management</h1>
          <p className="text-muted-foreground">Review applications and respond to prospective student enquiries.</p>
        </div>
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="applications" className="relative">
              Applications
              {applications.filter(a => ['SUBMITTED', 'UNDER_REVIEW'].includes(a.status)).length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {applications.filter(a => ['SUBMITTED', 'UNDER_REVIEW'].includes(a.status)).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="enquiries">
              Enquiries
              {enquiries.filter(e => e.status === 'PENDING').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {enquiries.filter(e => e.status === 'PENDING').length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
          </div>
        </div>

        <TabsContent value="applications">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No applications found.</TableCell></TableRow>
                ) : applications.map((app) => (
                  <TableRow key={app.uuid}>
                    <TableCell className="font-medium">{app.applicantName || 'Unnamed'}</TableCell>
                    <TableCell>{app.classApplyingFor || 'N/A'}</TableCell>
                    <TableCell>{app.academicYear}</TableCell>
                    <TableCell>{new Date(app.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={app.status === 'FEE_PAID' ? 'default' : 'outline'} className={
                        app.status === 'FEE_PAID' ? 'bg-green-600' : 
                        app.status === 'APPROVED' ? 'bg-blue-600' : 
                        app.status === 'REJECTED' ? 'bg-red-600' : 
                        app.status === 'SUBMITTED' ? 'bg-yellow-600' : ''
                      }>
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button variant="outline" size="sm" onClick={() => fetchAppDetail(app.uuid)}>
                        {fetchingDetail && detailApp?.uuid === app.uuid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                        View & Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Similar Table for Enquiries... (omitted for brevity, assume its there) */}
        <TabsContent value="enquiries">
           {/* Enquiries logic remains primarily same but with better Badge mapping */}
           <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="w-1/3">Query</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiries.map((enq) => (
                  <TableRow key={enq.uuid}>
                    <TableCell>{new Date(enq.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{enq.applicantName}</TableCell>
                    <TableCell>{enq.applicantMobile}</TableCell>
                    <TableCell className="max-w-xs truncate">{enq.message}</TableCell>
                    <TableCell>
                      <Badge variant={enq.status === 'REPLIED' ? 'default' : 'outline'} className={enq.status === 'REPLIED' ? 'bg-green-600' : ''}>
                        {enq.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {enq.status === 'PENDING' ? (
                        <Dialog>
                          <DialogTrigger asChild><Button size="sm" onClick={() => setSelectedEnquiry(enq)}><Reply className="mr-2 h-4 w-4" /> Reply</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reply to Enquiry</DialogTitle>
                              <DialogDescription>Query from {enq.applicantName}: "{enq.message}"</DialogDescription>
                            </DialogHeader>
                            <Textarea placeholder="Type your reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} className="min-h-[150px]" />
                            <DialogFooter><Button onClick={handleReply} disabled={replying || !replyText}>{replying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send Reply</Button></DialogFooter>
                          </DialogContent>
                        </Dialog>
                      ) : <Badge variant="secondary">Replied</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DETAILED VIEW DIALOG */}
      <Dialog open={!!detailApp} onOpenChange={(open) => !open && setDetailApp(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl">Application Review</DialogTitle>
                <DialogDescription>Full details for {detailApp?.studentBasicDetails?.fullName || 'the applicant'}.</DialogDescription>
              </div>
              <Badge className="bg-primary text-white text-md px-4 py-1">
                {detailApp?.status}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 p-6 overflow-y-auto max-h-[70vh]">
            <div className="space-y-8">
              {/* 1. Basic Details */}
              <DetailSection title="Student Basic Information" icon={User}>
                <DataItem label="Full Name" value={detailApp?.studentBasicDetails?.fullName} />
                <DataItem label="Date of Birth" value={detailApp?.studentBasicDetails?.dateOfBirth} />
                <DataItem label="Gender" value={detailApp?.studentBasicDetails?.gender} />
                <DataItem label="Blood Group" value={detailApp?.studentBasicDetails?.bloodGroup} />
                <DataItem label="Nationality" value={detailApp?.studentBasicDetails?.nationality} />
                <DataItem label="Aadhaar Number" value={detailApp?.studentBasicDetails?.aadhaarNumber} />
                <DataItem label="Category" value={detailApp?.studentBasicDetails?.category} />
              </DetailSection>

              {/* 2. Admission Details */}
              <DetailSection title="Admission Path" icon={FileText}>
                <DataItem label="Applying For Class" value={detailApp?.admissionDetails?.classApplyingFor} />
                <DataItem label="Academic Year" value={detailApp?.admissionDetails?.academicYear} />
                <DataItem label="Stream" value={detailApp?.admissionDetails?.stream} />
                <DataItem label="Transport Required" value={detailApp?.admissionDetails?.transportRequired ? 'Yes' : 'No'} />
                <DataItem label="Hostel Required" value={detailApp?.admissionDetails?.hostelRequired ? 'Yes' : 'No'} />
              </DetailSection>

              {/* 3. Parent Details */}
              <DetailSection title="Parent / Guardian Information" icon={Home}>
                <DataItem label="Father's Name" value={detailApp?.parentGuardianDetails?.fatherName} />
                <DataItem label="Father's Mobile" value={detailApp?.parentGuardianDetails?.fatherMobile} />
                <DataItem label="Mother's Name" value={detailApp?.parentGuardianDetails?.motherName} />
                <DataItem label="Mother's Mobile" value={detailApp?.parentGuardianDetails?.motherMobile} />
                <DataItem label="Guardian Name" value={detailApp?.parentGuardianDetails?.guardianName} />
              </DetailSection>

              {/* 4. Documents */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 pb-1 border-b">
                   <ShieldAlert className="h-4 w-4 text-primary" />
                   <h4 className="font-bold text-sm uppercase tracking-wider">Uploaded Documents</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['studentPhotoUrl', 'aadhaarCardUrl', 'birthCertificateUrl', 'reportCardUrl'].map(key => (
                    detailApp?.documentUploads?.[key] && (
                      <a key={key} href={detailApp?.documentUploads[key]} target="_blank" rel="noreferrer" 
                        className="flex items-center p-2 border rounded hover:bg-muted text-xs font-medium">
                        <FileText className="mr-2 h-4 w-4 text-blue-500" />
                        {key.replace('Url', '').replace(/([A-Z])/g, ' $1')}
                      </a>
                    )
                  ))}
                </div>
              </div>

              {/* ACTION PANEL */}
              {['SUBMITTED', 'UNDER_REVIEW'].includes(detailApp?.status) && (
                <div className="p-6 border rounded-xl bg-muted/30 mt-8 space-y-4">
                   <h3 className="font-bold text-lg">Administrative Action</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Form/Admission Fee (Amount)</label>
                        <Input type="number" value={formFee} onChange={(e) => setFormFee(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Comments / Remarks</label>
                        <Input placeholder="Internal notes or reason for rejection" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                      </div>
                   </div>
                   <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" 
                        onClick={() => { setSelectedApp(detailApp); handleAppAction('reject'); }} 
                        disabled={actionLoading}>
                        Reject Application
                      </Button>
                      <Button className="bg-green-600 hover:bg-green-700 text-white" 
                        onClick={() => { setSelectedApp(detailApp); handleAppAction('approve'); }} 
                        disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Approve & Request Fee
                      </Button>
                   </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
