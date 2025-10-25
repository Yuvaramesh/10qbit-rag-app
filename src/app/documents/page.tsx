"use client";

import { useState, useEffect } from "react";
import { TopNav } from "../../components/layout/top-nav";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Search,
  Upload,
  MoreVertical,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";

interface Document {
  _id: string;
  fileName: string;
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [version, setVersion] = useState("v1.0");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([""]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/upload");
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [".pdf", ".docx", ".txt"];
    const fileExtension = file.name.substring(file.name.lastIndexOf("."));

    if (!validTypes.includes(fileExtension.toLowerCase())) {
      alert("Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    setSelectedFile(file);
  };

  const handleAddTag = () => {
    if (tags.length < 5) {
      setTags([...tags, ""]);
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setVersion("v1.0");
    setCategory("");
    setTags([""]);
  };

  const handleSaveUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file to upload.");
      return;
    }

    if (!category.trim()) {
      alert("Please enter a category.");
      return;
    }

    const filteredTags = tags.filter((tag) => tag.trim() !== "");

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("version", version);
      formData.append("category", category);
      formData.append("tags", JSON.stringify(filteredTags));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();

      const newDoc: Document = {
        _id: data.documentId || Date.now().toString(),
        fileName: selectedFile.name,
        type: selectedFile.name.split(".").pop()?.toUpperCase() || "Unknown",
        version: version,
        uploaded: new Date().toISOString().split("T")[0],
        status: "Active",
        category: category,
        tags: filteredTags,
        filePath: `/uploads/${selectedFile.name}`,
      };

      setDocuments((prev) => [newDoc, ...prev]);
      alert(
        `File uploaded successfully! Created ${data.chunks} chunks in vector database.`
      );

      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error(error);
      alert(`Error uploading document: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

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
      prev.map((doc) => (doc._id === id ? { ...doc, fileName: newName } : doc))
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
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to download file.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to archive this document?")) {
      return;
    }

    // Update status to Archived instead of deleting
    setDocuments((prev) =>
      prev.map((doc) =>
        doc._id === id ? { ...doc, status: "Archived" as const } : doc
      )
    );
  };

  const getStatusColor = (status: string) => {
    return status === "Active"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  const filteredDocs = documents.filter((doc) =>
    doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
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

          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => setIsDialogOpen(true)}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
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
                      key={doc._id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {doc.fileName}
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
                          {doc.tags.map((tag, idx) => (
                            <Badge
                              key={idx}
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
                              onClick={() => handleEdit(doc._id)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDownload(doc)}
                            >
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(doc._id)}
                              className="text-destructive"
                            >
                              Archive
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

      {/* Upload Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">Document File *</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Version *</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., v1.0, v2.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Safety Procedures, Quality Control"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tags (Max 5)</Label>
                {tags.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTag}
                  >
                    Add Tag
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {tags.map((tag, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={tag}
                      onChange={(e) => handleTagChange(index, e.target.value)}
                      placeholder={`Tag ${index + 1}`}
                    />
                    {tags.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTag(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveUpload}
              disabled={isUploading || !selectedFile}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Save & Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
