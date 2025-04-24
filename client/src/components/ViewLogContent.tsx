import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExtractedContent } from "@shared/schema";
import { ExtractedContentNew } from "@/components/ExtractedContentNew";
import { X } from "lucide-react";

interface ViewLogContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: {
    id: number;
    fileName: string;
    extractedContent: ExtractedContent;
    processingTime?: number;
  } | null;
}

export const ViewLogContent: React.FC<ViewLogContentProps> = ({
  open,
  onOpenChange,
  log
}) => {
  if (!log) return null;

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleProcessAnother = () => {
    // Just close the dialog
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Viewing Document: {log.fileName}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Document processed on {new Date(log.extractedContent.metadata.extractionTime).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        
        {/* Reuse the same ExtractedContent component from dashboard */}
        <ExtractedContentNew
          content={log.extractedContent}
          fileName={log.fileName}
          onProcessAnother={handleProcessAnother}
          processingTime={log.processingTime || 0}
        />
      </DialogContent>
    </Dialog>
  );
};