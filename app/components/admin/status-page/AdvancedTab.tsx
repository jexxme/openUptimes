import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Example {
  id: string;
  name: string;
  description: string;
  content: string;
}

// Pre-made examples - these will be replaced with actual content from the user
const CSS_EXAMPLES: Example[] = [
  {
    id: "custom-fonts",
    name: "Custom Fonts",
    description: "Apply custom fonts to your status page",
    content: "/* Example: Custom Font Import */\n@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');\n\n/* Apply the font */\nbody {\n  font-family: 'Poppins', sans-serif;\n}\n"
  },
  {
    id: "dark-theme",
    name: "Dark Theme",
    description: "Apply a dark theme to your status page",
    content: "/* Dark Theme Example */\nbody {\n  background-color: #121212;\n  color: #e0e0e0;\n}\n\n.card {\n  background-color: #1e1e1e;\n  border-color: #333;\n}\n"
  },
  {
    id: "announcement-styling",
    name: "Announcement Banner Style",
    description: "Enhanced styling with animated elements and announcement banner",
    content: "/* Styling for the status page with announcement banner */\n:root {\n  --brand-blue: #1e40af;\n  --brand-light-blue: #3b82f6;\n}\n\n/* Make status dots more prominent */\n.relative.flex.items-center.justify-center.w-3.h-3 {\n  margin-right: 0.5rem;\n}\n\n.w-3.h-3.rounded-full.bg-emerald-500 {\n  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);\n}\n\n.w-3.h-3.rounded-full.bg-red-500 {\n  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);\n}\n\n/* Service item styling */\n.ServiceItem {\n  transition: transform 0.2s ease;\n}\n\n.ServiceItem:hover {\n  transform: translateY(-2px);\n}\n\n/* Timeline graphs */\nsvg.w-full.h-4 rect {\n  transition: all 0.3s ease;\n}\n\nsvg.w-full.h-4:hover rect {\n  opacity: 0.8;\n}\n\n/* Custom button style for all buttons */\nbutton {\n  transition: all 0.2s ease;\n}\n\nbutton:hover {\n  transform: translateY(-1px);\n  box-shadow: 0 2px 4px rgba(0,0,0,0.1);\n}\n"
  }
];

const HTML_EXAMPLES: Example[] = [
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "Add Google Analytics tracking",
    content: "<!-- Google Analytics Example -->\n<script async src=\"https://www.googletagmanager.com/gtag/js?id=YOUR-ID\"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'YOUR-ID');\n</script>"
  },
  {
    id: "meta-tags",
    name: "SEO Meta Tags",
    description: "Enhance SEO with custom meta tags",
    content: "<!-- SEO Meta Tags Example -->\n<meta name=\"description\" content=\"Service Status Page\">\n<meta property=\"og:title\" content=\"System Status\">\n<meta property=\"og:description\" content=\"Check our system status and uptime\">\n<meta property=\"og:image\" content=\"https://example.com/og-image.jpg\">"
  },
  {
    id: "announcement-banner",
    name: "Announcement Banner",
    description: "Add a dismissible announcement banner for maintenance notices",
    content: "<div id=\"announcement-banner\" style=\"width: 100%; background-color: #1e40af; color: white; padding: 0.75rem 0;\">\n  <div style=\"max-width: 1200px; margin: 0 auto; padding: 0 1rem; text-align: center;\">\n    <p style=\"margin: 0; font-size: 0.875rem;\">\n      🚀 We're upgrading our database servers on <strong>March 15th, 2024</strong> between 2-4 AM UTC. \n      <a href=\"https://your-company.com/blog/maintenance\" style=\"color: white; text-decoration: underline; font-weight: 500;\">Learn more</a>\n      <button id=\"close-banner\" style=\"background: transparent; border: none; color: white; cursor: pointer; margin-left: 1rem;\" aria-label=\"Close banner\">\n        ✕\n      </button>\n    </p>\n  </div>\n</div>\n\n<script>\n  // Simple script to make the banner dismissible\n  document.getElementById('close-banner')?.addEventListener('click', function() {\n    document.getElementById('announcement-banner')?.style.display = 'none';\n    // Optionally save this preference to localStorage\n    localStorage.setItem('banner-closed', 'true');\n  });\n  \n  // Check if the user has already closed the banner\n  if (localStorage.getItem('banner-closed') === 'true') {\n    document.getElementById('announcement-banner')?.style.display = 'none';\n  }\n</script>"
  }
];

interface AdvancedTabProps {
  customCss: string;
  setCustomCss: (css: string) => void;
  customHeader: string;
  setCustomHeader: (header: string) => void;
  isLoading: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function AdvancedTab({
  customCss,
  setCustomCss,
  customHeader,
  setCustomHeader,
  isLoading,
  isSaving,
  onSave
}: AdvancedTabProps) {
  const [activeExampleTab, setActiveExampleTab] = useState<"css" | "html">("css");
  const [selectedExample, setSelectedExample] = useState<Example | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const applyExample = (example: Example) => {
    if (activeExampleTab === "css") {
      setCustomCss(example.content);
    } else {
      setCustomHeader(example.content);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 rounded-md mb-6 text-sm text-blue-700 dark:text-blue-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
        <p>
          Use the <strong>Preview</strong> button at the top of the page to see how your changes will look before making them live.
        </p>
      </div>
      
      <p className="mb-4 text-sm text-muted-foreground">
        Advanced customization options for your status page
      </p>
      
      <div className="space-y-6">
        {/* Custom CSS Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="m18 16 4-4-4-4"/>
              <path d="m6 8-4 4 4 4"/>
              <path d="m14.5 4-5 16"/>
            </svg>
            <span>Custom CSS</span>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Enhance the appearance of your status page with custom CSS styles</p>
          
          {/* Example CSS */}
          <div className="mb-4 p-3 bg-muted/50 rounded-md border border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Example: Change Header Color</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs"
                onClick={() => copyToClipboard("header {\n  background-color: #4a6cf7;\n  color: white;\n}")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                Copy
              </Button>
            </div>
            <pre className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
              {`header {
  background-color: #4a6cf7;
  color: white;
}`}
            </pre>
          </div>
          
          <div className="grid gap-2 w-full">
            <div className="relative">
              <textarea
                value={customCss}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomCss(e.target.value)}
                placeholder="/* Add your custom CSS here */"
                className="min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </div>
        
        {/* Custom Header Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Custom HTML Header</span>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Add custom HTML to the head section of your status page for analytics, meta tags, or font imports</p>
          
          {/* Example HTML */}
          <div className="mb-4 p-3 bg-muted/50 rounded-md border border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Example: Custom Font Import</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs"
                onClick={() => copyToClipboard('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                Copy
              </Button>
            </div>
            <pre className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
              {`<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`}
            </pre>
          </div>
          
          <div className="grid gap-2 w-full">
            <div className="relative">
              <textarea
                value={customHeader}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomHeader(e.target.value)}
                placeholder="<!-- Add your custom HTML here -->"
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </div>
        
        {/* Pre-made Examples Section */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-medium mb-3">Pre-made Examples</h3>
          <p className="text-sm text-muted-foreground mb-4">Ready-to-use templates you can easily add to your status page</p>
          
          <Tabs value={activeExampleTab} onValueChange={(value: string) => setActiveExampleTab(value as "css" | "html")}>
            <TabsList className="mb-4">
              <TabsTrigger value="css">CSS Examples</TabsTrigger>
              <TabsTrigger value="html">HTML Examples</TabsTrigger>
            </TabsList>
            
            <TabsContent value="css" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {CSS_EXAMPLES.map((example) => (
                  <div 
                    key={example.id} 
                    className="border border-border rounded-md p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedExample(example)}
                  >
                    <h4 className="font-medium">{example.name}</h4>
                    <p className="text-sm text-muted-foreground">{example.description}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="html" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {HTML_EXAMPLES.map((example) => (
                  <div 
                    key={example.id} 
                    className="border border-border rounded-md p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedExample(example)}
                  >
                    <h4 className="font-medium">{example.name}</h4>
                    <p className="text-sm text-muted-foreground">{example.description}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          
          {selectedExample && (
            <div className="mt-6 border border-border rounded-md p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">{selectedExample.name}</h4>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(selectedExample.content)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    Copy
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => applyExample(selectedExample)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
              <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto w-full max-w-full whitespace-pre-wrap break-all">
                {selectedExample.content}
              </pre>
            </div>
          )}
        </div>
        
        <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 rounded-md p-3 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          <div>
            <p>Custom code is applied directly to your status page. Use the preview feature to test your changes before making them live.</p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 
              <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Saving...</> : 
              "Save Changes"}
          </Button>
        </div>
      </div>
    </>
  );
} 