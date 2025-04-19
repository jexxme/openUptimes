"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Tag, FileText, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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
    limitations: currentTab === "limitations",
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
            <TabsTrigger value="limitations" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Limitations</span>
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
          
          <TabsContent value="limitations">
            <p className="mb-4 text-sm text-muted-foreground">Understanding OpenUptimes' Limitations</p>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Not Designed for Real-Time Monitoring</h3>
                <p className="text-muted-foreground mb-2">
                  OpenUptimes is primarily designed as a simple status page solution, not a real-time monitoring system. Some important limitations to understand:
                </p>
                
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li><span className="font-medium">Polling-based checks:</span> Services are checked on a scheduled basis, not continuously monitored. This means there may be a delay between an actual outage and when it's detected.</li>
                  <li><span className="font-medium">No alerting system:</span> OpenUptimes doesn't include sophisticated alerting mechanisms like you'd find in dedicated monitoring solutions (e.g., Prometheus, Nagios, DataDog).</li>
                  <li><span className="font-medium">Simple health checks:</span> Only supports basic HTTP/HTTPS connectivity checks, not deep application health monitoring or metrics collection.</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Not Suitable for High-Availability Requirements</h3>
                <p className="text-muted-foreground mb-2">
                  Organizations with strict uptime requirements should consider OpenUptimes as a complementary tool, not a primary monitoring solution:
                </p>
                
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li><span className="font-medium">Single point of failure:</span> The status page itself doesn't have built-in high-availability features.</li>
                  <li><span className="font-medium">Limited redundancy:</span> Checks are typically run from a single location, lacking the geographic distribution needed for robust monitoring.</li>
                  <li><span className="font-medium">Basic metrics:</span> Limited historical data and performance metrics compared to enterprise monitoring solutions.</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Recommended Use Cases</h3>
                <p className="text-muted-foreground mb-2">
                  OpenUptimes is ideal for:
                </p>
                
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Small to medium-sized projects needing a simple status page</li>
                  <li>Startups wanting to provide service transparency without complex infrastructure</li>
                  <li>Complementing existing monitoring solutions with a public-facing status portal</li>
                  <li>Personal projects, developer portfolios, and small business services</li>
                </ul>
                
                <p className="text-muted-foreground mt-3">
                  For mission-critical applications or environments requiring thorough monitoring, we recommend using OpenUptimes alongside dedicated monitoring platforms like Prometheus, Grafana, New Relic, or DataDog.
                </p>
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
              <h3 className="text-lg font-medium">PolyForm Noncommercial License 1.0.0</h3>
              
              <div className="bg-secondary/30 p-4 rounded-md text-sm text-muted-foreground overflow-auto max-h-64">
                <p className="mb-4">Copyright (c) 2025 OpenUptimes (jexxme/openuptimes)</p>
                
                <p className="mb-2">
                  OpenUptimes is licensed under the PolyForm Noncommercial License 1.0.0.
                </p>
                
                <p className="mb-2">
                  You may use this software for any noncommercial purpose, including personal use, research, 
                  educational purposes, or for use within charitable organizations, educational institutions, 
                  public research organizations, public safety or health organizations, environmental protection 
                  organizations, and government institutions.
                </p>
                
                <p className="mb-2">
                  This license does not permit using the software for commercial purposes or building commercial 
                  status page systems based on this software.
                </p>
                
                <p className="mb-2">
                  For the full license text, please visit: <a href="https://polyformproject.org/licenses/noncommercial/1.0.0" target="_blank" rel="noopener noreferrer" className="text-primary underline">https://polyformproject.org/licenses/noncommercial/1.0.0</a>
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