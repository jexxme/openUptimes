import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface SetupPath {
  id: 'github' | 'cron' | 'custom';
  title: string;
  description: string;
  icon: React.ReactNode;
  requiresEdgeRuntime: boolean;
}

interface SetupPathSelectorProps {
  paths: SetupPath[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  isEdgeRuntime: boolean;
}

export function SetupPathSelector({ 
  paths, 
  selectedPath, 
  onSelect, 
  isEdgeRuntime 
}: SetupPathSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-medium text-foreground">Choose a setup path</h2>
        <p className="text-sm text-muted-foreground">
          Select how you want to set up your status page monitoring
        </p>
      </div>
      
      <div className="space-y-3">
        {paths.map((path) => {
          const isDisabled = path.requiresEdgeRuntime && !isEdgeRuntime;
          const isSelected = selectedPath === path.id;
          
          return (
            <Card 
              key={path.id}
              className={`
                relative border overflow-hidden transition-colors duration-200
                ${isDisabled 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'cursor-pointer hover-lift hover:border-primary/50'} 
                ${isSelected 
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20' 
                  : 'border-border'
                }
              `}
              onClick={() => !isDisabled && onSelect(path.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`
                    flex-shrink-0 p-1.5 rounded-md mt-0.5
                    ${isSelected ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted/30'}
                  `}>
                    {path.icon}
                  </div>
                  
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-base font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {path.title}
                      </h3>
                      
                      {isDisabled && (
                        <Badge variant="outline" className="text-xs bg-yellow-100/20 text-yellow-800 border-yellow-800/20">
                          Not available
                        </Badge>
                      )}
                    </div>
                    
                    <p className={`text-sm ${isSelected ? 'text-foreground' : 'text-muted-foreground'} line-clamp-2 sm:line-clamp-none`}>
                      {path.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center h-5 ml-2 flex-shrink-0">
                    <input
                      type="radio"
                      name="setup-path"
                      value={path.id}
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => onSelect(path.id)}
                      className="h-4 w-4 text-primary rounded-full border-border focus:ring-primary/25 disabled:opacity-50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 