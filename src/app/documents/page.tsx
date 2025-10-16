"use client";

import { useState } from "react";
import { TopNav } from "../../components/layout/top-nav";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Search, Upload, MoreVertical, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

interface Document {
  id: string;
  name: string;
  type: string;
  version: string;
  uploaded: string;
  status: "Active" | "Archived";
  category: string;
  tags: string[];
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const documents: Document[] = [
    {
      id: "1",
      name: "Finance_SOP_v2.pdf",
      type: "PDF",
      version: "v2.0",
      uploaded: "2025-10-08",
      status: "Active",
      category: "Invoices & Financial Docs",
      tags: ["Finance", "Procedures"],
    },
    {
      id: "2",
      name: "HR_Policies_v3.pdf",
      type: "PDF",
      version: "v3.0",
      uploaded: "2025-10-07",
      status: "Active",
      category: "Contracts & Agreements",
      tags: ["HR", "Policies"],
    },
    {
      id: "3",
      name: "IT_Security_SOP_v2.docx",
      type: "Word",
      version: "v2.0",
      uploaded: "2025-10-06",
      status: "Active",
      category: "Internal Notes / Meeting Summaries",
      tags: ["IT", "Security"],
    },
    {
      id: "4",
      name: "Operations_Manual_v1.pdf",
      type: "PDF",
      version: "v1.0",
      uploaded: "2025-10-05",
      status: "Active",
      category: "Treatment / Work Plans",
      tags: ["Operations"],
    },
    {
      id: "5",
      name: "Customer_Support_Guide.pdf",
      type: "PDF",
      version: "v1.5",
      uploaded: "2025-10-04",
      status: "Archived",
      category: "Assessments & Reports",
      tags: ["Support", "Customer"],
    },
    {
      id: "6",
      name: "Sales_Procedures_Scanned.pdf",
      type: "PDF (Scanned)",
      version: "v1.0",
      uploaded: "2025-10-03",
      status: "Active",
      category: "Uploads (User-Provided Documents)",
      tags: ["Sales"],
    },
    {
      id: "7",
      name: "Compliance_Checklist_v4.pdf",
      type: "PDF",
      version: "v4.0",
      uploaded: "2025-10-02",
      status: "Active",
      category: "Assessments & Reports",
      tags: ["Compliance", "Legal"],
    },
    {
      id: "8",
      name: "Onboarding_Guide.docx",
      type: "Word",
      version: "v2.1",
      uploaded: "2025-10-01",
      status: "Archived",
      category: "Internal Notes / Meeting Summaries",
      tags: ["HR", "Onboarding"],
    },
  ];

  const getStatusColor = (status: string) => {
    return status === "Active"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage your SOP documents
            </p>
          </div>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents by name or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Documents Section */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-semibold">All Documents</h2>
            <p className="text-sm text-muted-foreground">
              Manage and track your uploaded SOPs
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Document Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{doc.type}</td>
                    <td className="px-6 py-4 text-sm">{doc.version}</td>
                    <td className="px-6 py-4 text-sm">{doc.uploaded}</td>
                    <td className="px-6 py-4">
                      <Badge
                        className={`${getStatusColor(doc.status)} border-0`}
                      >
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {doc.category}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {doc.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
