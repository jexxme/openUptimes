import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

export interface SetupPath {
  id: 'github' | 'cron' | 'custom';
  title: string;
  description: string;
  icon: React.ReactNode;
  requiresEdgeRuntime: boolean;
  difficulty?: 'easy' | 'medium' | 'advanced';
  featurePoints?: string[];
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
  
  // Map difficulty to human-readable text and badge variant
  const difficultyMap = {
    easy: { label: 'Easy Setup', variant: 'success' },
    medium: { label: 'Moderate Setup', variant: 'warning' },
    advanced: { label: 'Advanced Setup', variant: 'default' }
  };
  
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold text-foreground">Welcome to OpenUptimes</h1>
        <p className="text-muted-foreground">
          Choose how you'd like to monitor your services for the perfect uptime solution
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-5">
        {paths.map((path) => {
          const isDisabled = path.requiresEdgeRuntime && !isEdgeRuntime;
          const isSelected = selectedPath === path.id;
          const difficulty = path.difficulty ? difficultyMap[path.difficulty] : null;
          
          return (
            <Card 
              key={path.id}
              className={`
                relative border overflow-hidden transition-all duration-200
                ${isDisabled 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'cursor-pointer hover:border-primary/50 hover:translate-y-[-2px] hover:shadow-md'} 
                ${isSelected 
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/20' 
                  : 'border-border'
                }
              `}
              onClick={() => !isDisabled && onSelect(path.id)}
            >
              <CardContent className="p-5">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        flex-shrink-0 p-2.5 rounded-md 
                        ${isSelected ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted/30'}
                      `}>
                        {path.icon}
                      </div>
                      
                      <div>
                        <h3 className={`text-lg font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {path.title}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {difficulty && (
                            <Badge variant={difficulty.variant as "success" | "warning" | "default"}>
                              {difficulty.label}
                            </Badge>
                          )}
                          
                          {isDisabled && (
                            <Badge variant="outline">
                              Not available
                            </Badge>
                          )}
                          
                          {path.requiresEdgeRuntime && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex items-center">
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      Edge Runtime
                                      <InfoIcon size={12} />
                                    </Badge>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">Requires deployment on a platform that supports Edge Runtime, such as Vercel.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center h-5 ml-2 flex-shrink-0">
                      <input
                        type="radio"
                        name="setup-path"
                        value={path.id}
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={() => onSelect(path.id)}
                        className="h-5 w-5 text-primary rounded-full border-border focus:ring-primary/25 disabled:opacity-50"
                      />
                    </div>
                  </div>
                  
                  <p className={`text-sm ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {path.description}
                  </p>
                  
                  {path.featurePoints && path.featurePoints.length > 0 && (
                    <ul className="text-sm space-y-1 pt-1">
                      {path.featurePoints.map((point, index) => (
                        <li key={index} className="flex items-start">
                          <span className={`mr-2 text-xs ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>•</span>
                          <span className={`${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 