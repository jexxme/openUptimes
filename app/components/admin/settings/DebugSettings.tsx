"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLink, Bug, Github, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function DebugSettings() {
  return (
    <div className="space-y-6">
      <div className="border rounded-lg shadow-sm dark:border-gray-800 dark:bg-card">
        <div className="p-6">
          <div className="flex flex-col space-y-1.5 mb-4">
            <div className="flex items-center">
              <Bug className="h-5 w-5 mr-2 text-primary" />
              <h3 className="text-lg font-medium">Ping System Monitor</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Advanced diagnostics for the service ping system. Monitor real-time ping performance, intervals, and execution metrics.
            </p>
          </div>
          
          <div className="flex justify-end">
            <Link href="/debug/ping" target="_blank" passHref>
              <Button variant="outline" className="flex items-center gap-2">
                Debug Console
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="border rounded-lg shadow-sm dark:border-gray-800 dark:bg-card">
        <div className="p-6">
          <div className="flex flex-col space-y-1.5 mb-4">
            <div className="flex items-center">
              <Github className="h-5 w-5 mr-2 text-primary" />
              <h3 className="text-lg font-medium">GitHub Actions Configuration</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Set up automatic monitoring using GitHub's workflow automation. Configure repository settings, API keys, and workflow schedules.
            </p>
          </div>
          
          <div className="flex justify-end">
            <Link href="/debug/ping/github" target="_blank" passHref>
              <Button variant="outline" className="flex items-center gap-2">
                Configure
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="border rounded-lg shadow-sm dark:border-gray-800 dark:bg-card">
        <div className="p-6">
          <div className="flex flex-col space-y-1.5 mb-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              <h3 className="text-lg font-medium">Cron Jobs Management</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Create and manage scheduled jobs for monitoring and automation. Configure timing, view execution history, and monitor performance.
            </p>
          </div>
          
          <div className="flex justify-end">
            <Link href="/debug/ping/cron" target="_blank" passHref>
              <Button variant="outline" className="flex items-center gap-2">
                Manage Jobs
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 