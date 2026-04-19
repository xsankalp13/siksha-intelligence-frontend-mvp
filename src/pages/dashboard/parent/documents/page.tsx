import { Folder, FileText, Download, FilePlus, Search, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function DocumentsPage() {
  const documents = [
    { id: 1, name: "Term 1 Report Card.pdf", type: "Academics", date: "Oct 15, 2025", size: "2.4 MB" },
    { id: 2, name: "Fee Receipt Q1.pdf", type: "Finance", date: "Apr 10, 2026", size: "1.1 MB" },
    { id: 3, name: "Annual Sports Day Consent.docx", type: "Forms", date: "Mar 05, 2026", size: "0.5 MB" },
    { id: 4, name: "Medical Certificate_Aarav.jpeg", type: "Health", date: "Jan 12, 2026", size: "4.2 MB" },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Folder className="h-8 w-8 text-primary" />
            Document Vault
          </h1>
          <p className="text-muted-foreground mt-1">Securely store and retrieve student records.</p>
        </div>
        <Button><FilePlus className="w-4 h-4 mr-2" /> Upload Document</Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search documents..." />
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20">All Files</Badge>
          <Badge variant="outline" className="cursor-pointer">Academics</Badge>
          <Badge variant="outline" className="cursor-pointer">Finance</Badge>
          <Badge variant="outline" className="cursor-pointer">Forms</Badge>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b bg-muted/30 text-sm font-semibold text-muted-foreground">
          <div className="col-span-6 md:col-span-5">File Name</div>
          <div className="col-span-3 hidden md:block">Category</div>
          <div className="col-span-3 hidden sm:block">Date Modified</div>
          <div className="col-span-3 sm:col-span-2 text-right">Size</div>
          <div className="col-span-3 sm:col-span-1 text-right md:text-center">Action</div>
        </div>
        
        <div className="divide-y">
          {documents.map((doc) => (
            <div key={doc.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/10 transition-colors">
              <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="font-semibold">{doc.name}</span>
              </div>
              <div className="col-span-3 hidden md:block">
                <Badge variant="outline" className="font-normal">{doc.type}</Badge>
              </div>
              <div className="col-span-3 hidden sm:block text-sm text-muted-foreground">
                {doc.date}
              </div>
              <div className="col-span-3 sm:col-span-2 text-sm text-muted-foreground text-right border-l pl-4 sm:border-l-0 sm:pl-0">
                {doc.size}
              </div>
              <div className="col-span-3 sm:col-span-1 flex justify-end md:justify-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Download">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="More">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-6">
        <Card className="p-6 border-dashed border-2 flex flex-col items-center justify-center text-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:border-primary/50">
          <FilePlus className="w-8 h-8 opacity-50" />
          <div>
            <p className="font-medium">Upload new file</p>
            <p className="text-xs">Max size: 10MB</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
