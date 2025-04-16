/**
 * Format GitHub Action cron schedule for display
 */
export const formatCronSchedule = (cronExpression: string): string => {
  if (!cronExpression) return 'Invalid schedule';
  
  // Simple human-readable conversion for common patterns
  if (cronExpression === '* * * * *') return 'Every minute';
  
  // Every N minutes pattern: */N * * * *
  if (cronExpression.match(/^\*\/(\d+) \* \* \* \*$/)) {
    const match = cronExpression.match(/^\*\/(\d+) \* \* \* \*$/);
    const mins = match ? match[1] : '';
    return `Every ${mins} minute${parseInt(mins) > 1 ? 's' : ''}`;
  }
  
  // Every hour pattern: 0 */1 * * *
  if (cronExpression.match(/^0 \*\/1 \* \* \*$/)) {
    return 'Every hour';
  }
  
  // Every N hours pattern: 0 */N * * *
  if (cronExpression.match(/^0 \*\/(\d+) \* \* \*$/)) {
    const match = cronExpression.match(/^0 \*\/(\d+) \* \* \*$/);
    const hours = match ? match[1] : '';
    return `Every ${hours} hour${parseInt(hours) > 1 ? 's' : ''}`;
  }
  
  // Daily pattern: 0 0 * * *
  if (cronExpression === '0 0 * * *') {
    return 'Once a day (midnight)';
  }
  
  // At specific minute of every hour: M * * * *
  if (cronExpression.match(/^(\d+) \* \* \* \*$/)) {
    const match = cronExpression.match(/^(\d+) \* \* \* \*$/);
    const minute = match ? match[1] : '';
    return `Every hour at ${minute} minute${parseInt(minute) > 1 ? 's' : ''}`;
  }
  
  // Return the original expression if no patterns match
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