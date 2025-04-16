/**
 * Format GitHub Action cron schedule for display
 */
export const formatCronSchedule = (cronExpression: string): string => {
  if (!cronExpression) return 'Invalid schedule';
  
  // Simple human-readable conversion for common patterns
  if (cronExpression === '* * * * *') return 'Every minute';
  if (cronExpression.match(/^\*\/(\d+) \* \* \* \*$/)) {
    const match = cronExpression.match(/^\*\/(\d+) \* \* \* \*$/);
    const mins = match ? match[1] : '';
    return `Every ${mins} minute${parseInt(mins) > 1 ? 's' : ''}`;
  }
  
  return cronExpression;
};

/**
 * Format timestamp with consistent format for hydration
 */
export const formatTimeConsistent = (timestamp: number | null): string => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  
  // Use simple string formatting instead of locale-dependent functions
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Format timestamp (with date included)
 */
export const formatTime = (timestamp: number | null): string => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  
  // Use simple string formatting for consistent server/client rendering
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}; 