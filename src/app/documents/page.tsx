"use client";

import { useState, useEffect } from "react";
import { TopNav } from "../../components/layout/top-nav";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Search, Upload, MoreVertical, FileText, Loader2 } from "lucide-react";
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
  filePath?: string;
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 🔹 Load existing documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/upload-to-qdrant");
      if (!response.ok) {
        console.error("Failed to fetch documents");
        setDocuments([]);
        return;
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Handle file upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [".pdf", ".docx", ".txt"];
    const fileExtension = file.name.substring(file.name.lastIndexOf("."));

    if (!validTypes.includes(fileExtension.toLowerCase())) {
      alert("Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-to-qdrant", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();

      const newDoc: Document = {
        id: data.id || Date.now().toString(),
        name: file.name,
        type: file.name.split(".").pop()?.toUpperCase() || "Unknown",
        version: "v1.0",
        uploaded: new Date().toISOString().split("T")[0],
        status: "Active",
        category: "Uploads (User-Provided Documents)",
        tags: ["Uploaded"],
        filePath: `/uploads/${file.name}`,
      };

      setDocuments((prev) => [newDoc, ...prev]);
      alert(
        `File uploaded successfully! Created ${data.chunks} chunks in vector database.`
      );
    } catch (error: any) {
      console.error(error);
      alert(`Error uploading document: ${error.message}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  // 🔹 Actions
  const handleView = (doc: Document) => {
    if (doc.filePath) {
      window.open(doc.filePath, "_blank");
    } else {
      alert("File not available.");
    }
  };

  const handleEdit = (id: string) => {
    const newName = prompt("Enter new document name:");
    if (!newName) return;
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, name: newName } : doc))
    );
  };

  const handleDownload = async (doc: Document) => {
    try {
      if (!doc.filePath) {
        alert("File not found on server.");
        return;
      }
      const link = document.createElement("a");
      link.href = doc.filePath;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to download file.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    // TODO: Add API endpoint to delete from Qdrant
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const getStatusColor = (status: string) => {
    return status === "Active"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

          <input
            type="file"
            id="fileUpload"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />

          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => document.getElementById("fileUpload")?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </div>

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

        <Card className="overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-semibold">All Documents</h2>
            <p className="text-sm text-muted-foreground">
              Manage and track your uploaded SOPs
            </p>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No documents found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Upload your first document to get started"}
                </p>
              </div>
            ) : (
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
                  {filteredDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {doc.name}
                          </span>
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
                            <DropdownMenuItem onClick={() => handleView(doc)}>
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(doc.id)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDownload(doc)}
                            >
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(doc.id)}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
