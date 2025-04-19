import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LoadingScreenProps {
  loadingProgress: number;
  loadingState: string;
  isValidatingSession?: boolean;
  setupLoading?: boolean;
  setupError?: string | null;
}

export function LoadingScreen({
  loadingProgress,
  loadingState,
  isValidatingSession = false,
  setupLoading = false,
  setupError = null
}: LoadingScreenProps) {
  // Show setup error if there is one
  if (setupError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Setup Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-500 mb-4">{setupError}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading screen
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-xs px-4 text-center">
        <div className="mb-4">
          <h1 className="text-xl font-semibold mb-1">OpenUptimes</h1>
        </div>
        
        <Progress value={loadingProgress} className="h-1.5 mb-2" />
        <p className="text-sm text-muted-foreground mt-2">{loadingState}</p>
      </div>
    </div>
  );
} 