import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    easy: { label: 'Easy', variant: 'success' },
    medium: { label: 'Moderate', variant: 'warning' },
    advanced: { label: 'Advanced', variant: 'default' }
  };
  
  return (
    <div className="space-y-6">
      <motion.div 
        className="text-center space-y-2 max-w-lg mx-auto"
        initial={{ opacity: 0.8, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl font-medium text-foreground">Choose your monitoring method</h1>
        <p className="text-sm text-muted-foreground">
          Select the approach that best fits your needs
        </p>
      </motion.div>
      
      <div className="grid grid-cols-1 gap-3">
        {paths.map((path, index) => {
          const isDisabled = path.requiresEdgeRuntime && !isEdgeRuntime;
          const isSelected = selectedPath === path.id;
          const difficulty = path.difficulty ? difficultyMap[path.difficulty] : null;
          
          return (
            <motion.div
              key={path.id}
              initial={{ opacity: 0.9, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.25, 
                delay: index * 0.05
              }}
            >
              <Card 
                className={`
                  relative border overflow-hidden transition-all duration-200
                  ${isDisabled 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:border-primary/50'} 
                  ${isSelected 
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/20' 
                    : 'border-border'
                  }
                `}
                onClick={() => !isDisabled && onSelect(path.id)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <motion.div 
                          className={`
                            flex-shrink-0 p-2 rounded-md
                            ${isSelected ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted/30'}
                          `}
                          animate={{ 
                            scale: isSelected ? 1.05 : 1,
                            backgroundColor: isSelected ? 'rgba(var(--primary), 0.1)' : 'rgba(var(--muted), 0.3)',
                            color: isSelected ? 'var(--primary)' : 'var(--muted-foreground)'
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          {path.icon}
                        </motion.div>
                        
                        <div>
                          <motion.h3 
                            className="text-base font-medium"
                            animate={{ 
                              color: isSelected ? 'var(--primary)' : 'var(--foreground)'
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            {path.title}
                          </motion.h3>
                          
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {difficulty && (
                              <Badge variant={difficulty.variant as "success" | "warning" | "default"} className="text-xs px-2 py-0">
                                {difficulty.label}
                              </Badge>
                            )}
                            
                            {isDisabled && (
                              <Badge variant="outline" className="text-xs px-2 py-0">
                                Not available
                              </Badge>
                            )}
                            
                            {path.requiresEdgeRuntime && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="inline-flex items-center">
                                      <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2 py-0 bg-opacity-80 dark:bg-opacity-30">
                                        Edge Runtime
                                        <InfoIcon size={10} />
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">Not compatible with Edge Runtime deployments.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center h-5 ml-2 flex-shrink-0">
                        <motion.div
                          animate={{ 
                            scale: isSelected ? 1.1 : 1, 
                            opacity: isSelected ? 1 : 0.7 
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <input
                            type="radio"
                            name="setup-path"
                            value={path.id}
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => onSelect(path.id)}
                            className="h-4 w-4 text-primary rounded-full border-border focus:ring-primary/25 disabled:opacity-50"
                          />
                        </motion.div>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <AnimatePresence mode="wait">
                        {!isSelected ? (
                          <motion.p 
                            key={`${path.id}-collapsed`}
                            initial={{ height: "auto" }}
                            exit={{ height: 0, opacity: 0 }}
                            className="text-xs text-muted-foreground line-clamp-1"
                          >
                            {path.description}
                          </motion.p>
                        ) : (
                          <motion.div
                            key={`${path.id}-expanded`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="min-h-[40px]"
                          >
                            <motion.p 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, delay: 0.05 }}
                              className="text-sm text-foreground"
                            >
                              {path.description}
                            </motion.p>
                            
                            {path.featurePoints && path.featurePoints.length > 0 && (
                              <motion.ul
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="text-xs space-y-1 pt-2"
                              >
                                {path.featurePoints.map((point, i) => (
                                  <motion.li 
                                    key={i} 
                                    className="flex items-start"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.15, delay: 0.1 + (i * 0.03) }}
                                  >
                                    <span className="mr-2 text-xs text-primary">•</span>
                                    <span className="text-foreground">{point}</span>
                                  </motion.li>
                                ))}
                              </motion.ul>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
} 