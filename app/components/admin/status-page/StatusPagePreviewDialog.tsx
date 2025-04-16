import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

interface StatusPagePreviewDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  statusPageEnabled: boolean | null;
}

export function StatusPagePreviewDialog({
  open,
  setOpen,
  statusPageEnabled
}: StatusPagePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[800px] sm:max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Status Page Preview</DialogTitle>
        </DialogHeader>
        
        <div className="border rounded-md overflow-hidden h-[500px]">
          <iframe
            src="/?preview=true&forceShow=true"
            className="w-full h-full"
            title="Status Page Preview"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          {statusPageEnabled ? (
            <Button onClick={() => window.open('/', '_blank')}>
              Open in New Tab
            </Button>
          ) : (
            <Button variant="outline" onClick={() => window.open('/?preview=true&forceShow=true', '_blank')}>
              Open Preview in New Tab
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 