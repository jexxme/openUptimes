import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Globe, ChevronDown, ChevronUp, Edit3, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/app/components/ui/slider";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/app/components/ui/dialog";
import DOMPurify from "dompurify";

interface GeneralTabProps {
  statusPageTitle: string;
  setStatusPageTitle: (title: string) => void;
  statusPageDescription: string;
  setStatusPageDescription: (description: string) => void;
  historyDays: number;
  setHistoryDays: (days: number) => void;
  statusPageEnabledUI: boolean | null;
  isLoading: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function GeneralTab({
  statusPageTitle,
  setStatusPageTitle,
  statusPageDescription,
  setStatusPageDescription,
  historyDays,
  setHistoryDays,
  statusPageEnabledUI,
  isLoading,
  isSaving,
  onSave
}: GeneralTabProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const linkUrlRef = useRef<HTMLInputElement>(null);
  const linkTextRef = useRef<HTMLInputElement>(null);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Store initial values for change detection
  const [initialValues] = useState({
    title: statusPageTitle,
    description: statusPageDescription,
    historyDays: historyDays
  });
  
  // Detect changes in form fields
  useEffect(() => {
    const hasChanged = 
      initialValues.title !== statusPageTitle ||
      initialValues.description !== statusPageDescription ||
      initialValues.historyDays !== historyDays;
    
    setHasChanges(hasChanged);
  }, [statusPageTitle, statusPageDescription, historyDays, initialValues]);
  
  // Store selection position when user selects text
  const handleSelect = () => {
    if (textareaRef.current) {
      setSelectionStart(textareaRef.current.selectionStart);
      setSelectionEnd(textareaRef.current.selectionEnd);
      
      // Store selected text for potential link text
      const selected = textareaRef.current.value.substring(
        textareaRef.current.selectionStart,
        textareaRef.current.selectionEnd
      );
      setSelectedText(selected);
    }
  };
  
  const insertFormatting = (startTag: string, endTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    
    const newText = beforeText + startTag + selectedText + endTag + afterText;
    setStatusPageDescription(newText);
    
    // Set focus back to textarea after format insertion
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + startTag.length;
      textarea.selectionEnd = start + startTag.length + selectedText.length;
    }, 0);
  };
  
  const insertBold = () => insertFormatting("<strong>", "</strong>");
  const insertItalic = () => insertFormatting("<em>", "</em>");
  const insertUnderline = () => insertFormatting("<u>", "</u>");
  const insertBreak = () => insertFormatting("", "<br>");
  
  const openLinkDialog = () => {
    handleSelect(); // Make sure we have the latest selection
    setLinkDialogOpen(true);
  };
  
  const insertLink = () => {
    const url = linkUrlRef.current?.value;
    const text = linkTextRef.current?.value || selectedText || "link";
    
    if (!url) return;
    
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    
    // Create link HTML with the URL and text
    const linkHtml = `<a href="${url}" target="_blank">${text}</a>`;
    const newText = beforeText + linkHtml + afterText;
    
    setStatusPageDescription(newText);
    setLinkDialogOpen(false);
    
    // Set focus back to textarea after inserting link
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + linkHtml.length;
      textarea.selectionStart = newCursorPos;
      textarea.selectionEnd = newCursorPos;
    }, 0);
  };
  
  // Sanitized preview HTML
  const sanitizedPreview = DOMPurify.sanitize(statusPageDescription, {
    ALLOWED_TAGS: ['a', 'strong', 'em', 'b', 'i', 'br', 'u'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Configure your public status page settings.
      </p>
      
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span>Status Page Information</span>
            </h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Status Page Title</label>
                <Input 
                  type="text" 
                  value={statusPageTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusPageTitle(e.target.value)}
                  placeholder="Service Status" 
                  className="bg-background"
                />
              </div>
              <div className="grid gap-3">
                <label className="text-sm font-medium">Status Page Description</label>
                
                {/* Main wrapper */}
                <div className="space-y-3">
                  {/* Preview Section - Always visible, styled like input */}
                  <div
                    className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm ring-offset-background"
                  >
                    {sanitizedPreview ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizedPreview }} className="prose-sm prose-neutral dark:prose-invert max-w-none" />
                    ) : (
                      <span className="text-muted-foreground">Enter a description for your status page</span>
                    )}
                  </div>
                  
                  {/* Editor Section - Collapsible */}
                  <div className="border rounded-md overflow-hidden border-border">
                    <div 
                      className="flex items-center justify-between p-2.5 bg-muted/50 dark:bg-muted/20 cursor-pointer"
                      onClick={() => setShowEditor(!showEditor)}
                    >
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Edit description</span>
                      </div>
                      {showEditor ? 
                        <ChevronUp className="h-4 w-4 text-muted-foreground" /> : 
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                    
                    {showEditor && (
                      <div className="p-3 space-y-3 bg-background">
                        <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-border">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs"
                                  onClick={insertBold}
                                >
                                  <span className="font-bold">B</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p className="text-xs">Bold text</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs"
                                  onClick={insertItalic}
                                >
                                  <span className="italic">I</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p className="text-xs">Italic text</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs"
                                  onClick={insertUnderline}
                                >
                                  <span className="underline">U</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p className="text-xs">Underline text</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs"
                                  onClick={openLinkDialog}
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p className="text-xs">Insert link</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs"
                                  onClick={insertBreak}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M7 8l10 8" />
                                    <path d="M21 12H3" />
                                  </svg>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p className="text-xs">Insert line break</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        <textarea 
                          ref={textareaRef}
                          value={statusPageDescription}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStatusPageDescription(e.target.value)}
                          onSelect={handleSelect}
                          placeholder="Current status of our services" 
                          className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        
                        <div className="text-xs text-muted-foreground">
                          Supports HTML formatting: &lt;strong&gt;, &lt;em&gt;, &lt;a&gt;, &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;br&gt;
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* History Options */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M12 8v4l3 3"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span>History Options</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Display History Duration</label>
                  <span className="text-sm font-medium text-primary">{historyDays} days</span>
                </div>
                <Slider
                  value={[historyDays]}
                  onValueChange={(value: number[]) => setHistoryDays(value[0])}
                  min={7}
                  max={180}
                  step={1}
                  className="my-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>7 days</span>
                  <span className="text-center">30 days</span>
                  <span className="text-center">90 days</span>
                  <span>180 days</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Adjust how many days of history to display on your status page.
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="ml-1 inline-flex items-center justify-center rounded-full bg-muted/70 dark:bg-muted/30 h-4 w-4 text-xs">?</button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Longer periods will show data at a reduced resolution. Shorter periods show more detailed data.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={onSave} 
            disabled={isSaving || isLoading}
            variant="default"
            className={hasChanges ? "gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50 border border-amber-100 dark:border-amber-900/30" : ""}
          >
            {hasChanges && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />}
            {isSaving ? 
              <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Saving...</> : 
              "Save Changes"}
          </Button>
        </div>
      </div>
      
      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Add a hyperlink to your description text.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="link-url" className="text-sm font-medium">
                URL
              </label>
              <Input
                id="link-url"
                ref={linkUrlRef}
                defaultValue="https://"
                placeholder="https://example.com"
                className="col-span-3 bg-background"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="link-text" className="text-sm font-medium">
                Link Text
              </label>
              <Input
                id="link-text"
                ref={linkTextRef}
                defaultValue={selectedText || ""}
                placeholder="Click here"
                className="col-span-3 bg-background"
              />
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={insertLink}>
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 