"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Info, Tag, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";
import Link from "next/link";

interface AboutContentProps {
  activeSection?: string;
}

export function AboutContent({ activeSection = "about" }: AboutContentProps) {
  // Current selected tab - use active section value
  const [currentTab, setCurrentTab] = useState(activeSection);
  const [versionInfo, setVersionInfo] = useState({
    version: "0.1.0",
    buildDate: "2025-04-18",
    environment: process.env.NODE_ENV
  });
  
  // Track if each tab has been visited
  const [tabsVisited, setTabsVisited] = useState<Record<string, boolean>>({
    about: currentTab === "about",
    version: currentTab === "version",
    license: currentTab === "license",
  });
  
  // Update current tab when activeSection changes
  useEffect(() => {
    setCurrentTab(activeSection);
    // Mark this tab as visited
    setTabsVisited(prev => ({
      ...prev,
      [activeSection]: true
    }));
  }, [activeSection]);
  
  // Handle tab change with tab visit tracking
  const handleTabChange = (newTab: string) => {
    setCurrentTab(newTab);
    // Mark this tab as visited
    setTabsVisited(prev => ({
      ...prev,
      [newTab]: true
    }));
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>About OpenUptimes</CardTitle>
      </CardHeader>
      <CardContent className="max-w-2xl mx-auto">
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>About</span>
            </TabsTrigger>
            <TabsTrigger value="version" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span>Version</span>
            </TabsTrigger>
            <TabsTrigger value="license" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>License</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="about">
            <p className="mb-4 text-sm text-muted-foreground">About OpenUptimes</p>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Introduction</h3>
                <p className="text-muted-foreground">
                  OpenUptimes is a lightweight status page that helps you monitor and display service uptime. With a clean interface and GitHub Actions integration, tracking your infrastructure's health is easy.
                </p>
                <p className="text-muted-foreground mt-2">
                  Simplicity is key: deployment takes minutes, configuration is minimal, and monitoring is automatic without complex setups. You only need a GitHub repository, a Redis instance, and a hosting provider like Vercel.
                </p>
              </div>
              
              <Separator />
              
              <div className="pt-2">
                <Link href="https://github.com/jexxme/openuptimes" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="mr-2">
                    GitHub Repository
                  </Button>
                </Link>
                <Link href="https://github.com/jexxme/openuptimes" target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary">
                    Documentation
                  </Button>
                </Link>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="version">
            <p className="mb-4 text-sm text-muted-foreground">Version information</p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Version</div>
                <div className="font-medium">{versionInfo.version}</div>
                
                <div className="text-muted-foreground">Build Date</div>
                <div className="font-medium">{versionInfo.buildDate}</div>
                
                <div className="text-muted-foreground">Environment</div>
                <div className="font-medium capitalize">{versionInfo.environment}</div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Tech Stack</h3>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li><span className="font-medium">Framework:</span> Next.js 14+ (App Router)</li>
                  <li><span className="font-medium">UI:</span> Tailwind CSS + shadcn/ui</li>
                  <li><span className="font-medium">Storage:</span> Redis (via node-redis)</li>
                  <li><span className="font-medium">Monitoring:</span> GitHub Actions + Client-side Polling</li>
                  <li><span className="font-medium">Deployment:</span> Vercel</li>
                </ul>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="license">
            <p className="mb-4 text-sm text-muted-foreground">License information</p>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">MIT License</h3>
              
              <div className="bg-secondary/30 p-4 rounded-md text-sm text-muted-foreground overflow-auto max-h-64">
                <p className="mb-4">Copyright (c) 2025 OpenUptimes</p>
                
                <p className="mb-4">
                  Permission is hereby granted, free of charge, to any person obtaining a copy
                  of this software and associated documentation files (the "Software"), to deal
                  in the Software without restriction, including without limitation the rights
                  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                  copies of the Software, and to permit persons to whom the Software is
                  furnished to do so, subject to the following conditions:
                </p>
                
                <p className="mb-4">
                  The above copyright notice and this permission notice shall be included in all
                  copies or substantial portions of the Software.
                </p>
                
                <p>
                  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                  SOFTWARE.
                </p>
              </div>
              
              <div className="mt-4 pt-2 text-center">
                <p className="text-sm text-muted-foreground italic">Made on a healthy dose of ☕️</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 