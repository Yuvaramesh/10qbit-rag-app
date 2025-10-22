"use client";

import { useState } from "react";
import { TopNav } from "../../components/layout/top-nav";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Users,
  LinkIcon,
  SettingsIcon,
  Palette,
  Upload,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Shield } from "lucide-react";
import { Mail } from "lucide-react";
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("team");

  const teamMembers = [
    {
      id: "1",
      name: "John Doe",
      email: "john@company.com",
      role: "Admin",
      status: "Active",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@company.com",
      role: "User",
      status: "Active",
    },
    {
      id: "3",
      name: "Mike Johnson",
      email: "mike@company.com",
      role: "User",
      status: "Active",
    },
    {
      id: "4",
      name: "Sarah Williams",
      email: "sarah@company.com",
      role: "Editor",
      status: "Active",
    },
    {
      id: "5",
      name: "Tom Brown",
      email: "tom@company.com",
      role: "User",
      status: "Inactive",
    },
  ];

  const integrations = [
    {
      name: "Google Drive",
      description: "Sync documents from Google Drive",
      color: "bg-blue-100",
      iconColor: "text-blue-600",
      iconPath: "M7 6 L13 6 L18 13 L13 13 L7 6 Z M6 15 L18 15 L16 18 L8 18 Z",
    },
    {
      name: "Microsoft SharePoint",
      description: "Import from SharePoint libraries",
      color: "bg-purple-100",
      iconColor: "text-purple-600",
      iconPath:
        "M6 7 C8 5 10 5 12 7 C14 9 16 9 18 7 L18 17 C16 19 14 19 12 17 C10 15 8 15 6 17 Z", // SharePoint flag/wave
    },
    {
      name: "Dropbox",
      description: "Connect to Dropbox folders",
      color: "bg-orange-100",
      iconColor: "text-orange-600",
      iconPath:
        "M8 5 L12 8 L16 5 L20 8 L16 11 L12 8 L8 11 L4 8 Z M8 13 L12 16 L16 13 L20 16 L16 19 L12 16 L8 19 L4 16 Z",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your workspace and AI configuration
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8 gap-2">
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger
              value="ai-settings"
              className="flex items-center gap-2"
            >
              <SettingsIcon className="w-4 h-4" />
              AI Settings
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Branding
            </TabsTrigger>
          </TabsList>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Team Members</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage user access and permissions
                  </p>
                </div>
                <Button className="flex items-center gap-2 bg-[#0B0B14] hover:bg-[#1a1a27] text-white font-medium px-4 py-2 rounded-lg shadow-sm">
                  <Mail className="w-4 h-4" strokeWidth={1.8} />
                  Invite User
                </Button>
              </div>

              {/* Team Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-border hover:bg-muted/50"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <span className="font-medium text-sm">
                              {member.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">{member.email}</td>
                        <td className="px-4 py-4">
                          <Badge variant="secondary">{member.role}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            className={
                              member.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {member.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Remove
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

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-8">Role Permissions</h2>
              <p className="text-sm text-muted-foreground mb-8">
                Define what each role can do
              </p>
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <h3 className="font-semibold mb-4">Admin</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-sm">
                      <Shield
                        className="w-5 h-5 text-green-500 mt-0.5"
                        strokeWidth={2}
                        fill="none"
                      />
                      <span>Full access to all features</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <Shield
                        className="w-5 h-5 text-green-500 mt-0.5"
                        strokeWidth={2}
                        fill="none"
                      />{" "}
                      <span>Manage users and settings</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <Shield
                        className="w-5 h-5 text-green-500 mt-0.5"
                        strokeWidth={2}
                        fill="none"
                      />{" "}
                      <span>Upload and delete documents</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Editor</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-sm">
                      <Shield
                        className="w-5 h-5 text-blue-500 mt-0.5"
                        strokeWidth={2}
                        fill="none"
                      />{" "}
                      <span>Upload documents</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <Shield
                        className="w-5 h-5 text-blue-500 mt-0.5"
                        strokeWidth={2}
                        fill="none"
                      />{" "}
                      <span>Use AI assistant</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <Shield
                        className="w-5 h-5 text-blue-500 mt-0.5"
                        strokeWidth={2}
                        fill="none"
                      />{" "}
                      <span>View analytics</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">User</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-sm">
                      <Shield
                        className="w-5 h-5 text-gray-500 mt-0.5"
                        strokeWidth={2}
                        fill="none"
                      />{" "}
                      <span>Use AI assistant</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <Shield
                        className="w-5 h-5 text-gray-500 mt-0.5"
                        strokeWidth={2}
                        fill="none"
                      />{" "}
                      <span>View documents</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <Shield
                        className="w-5 h-5 text-gray-500 mt-0.5"
                        strokeWidth={2}
                        fill="none"
                      />{" "}
                      <span>Limited analytics access</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">Document Sources</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Connect external storage platforms
              </p>

              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 ${integration.color} rounded-xl flex items-center justify-center`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`w-6 h-6 ${integration.iconColor}`}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d={integration.iconPath} />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold">{integration.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ai-settings" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">AI Configuration</h2>
              <p className="text-sm text-muted-foreground mb-8">
                Customize AI behavior and accuracy
              </p>

              <div className="space-y-8">
                <div>
                  <label className="text-sm font-semibold block mb-3">
                    Confidence Threshold
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="75"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Minimum confidence level required for AI responses. Higher
                    values increase accuracy but may reduce response rate.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h3 className="font-semibold text-sm">
                      Enable Responsive Summarization
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      AI will provide concise summaries before detailed
                      explanations
                    </p>
                  </div>
                  <input type="checkbox" className="w-5 h-5" />
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h3 className="font-semibold text-sm">
                      Auto-Index New Documents
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Automatically process and index documents upon upload
                    </p>
                  </div>
                  <input type="checkbox" className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Search Preferences
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Configure search behavior
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold block mb-2">
                        Default Search Mode
                      </label>
                      <select className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm">
                        <option>Semantic Search (AI-Powered)</option>
                        <option>Keyword Search</option>
                        <option>Hybrid Search</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-3">
                    Maximum Sources per Response
                  </label>
                  <div className="flex items-center gap-2">
                    <select className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm">
                      <option>3 Source</option>
                      <option>1 Source</option>
                      <option>3 Sources</option>
                      <option>5 Sources</option>

                      <option>10 Sources</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">Company Branding</h2>
              <p className="text-sm text-muted-foreground mb-8">
                Customize the appearance of your workspace
              </p>

              <div className="space-y-8">
                <div>
                  <label className="text-sm font-semibold block mb-3">
                    Company Name
                  </label>
                  <Input defaultValue="AI SOP Assistant" />
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-3">
                    Company Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                      A
                    </div>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 bg-transparent"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Logo
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended size: 512×512px, PNG or SVG format
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-3">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg border-2 border-blue-600" />
                    <Input defaultValue="#3b82f6" className="w-32" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-3">
                    Theme
                  </label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg">
                    <option>Light</option>
                    <option>Dark</option>
                    <option>Auto</option>
                  </select>
                </div>

                <Button className="w-full bg-black hover:bg-gray-900 text-white">
                  Save Branding Settings
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
