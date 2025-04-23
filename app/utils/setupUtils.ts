// Validate password strength
export function validatePassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  // Check for at least one special character
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

// Validate that passwords match
export function validatePasswordsMatch(password: string, confirmPassword: string): {
  valid: boolean;
  message?: string;
} {
  if (password !== confirmPassword) {
    return { valid: false, message: 'Passwords do not match' };
  }

  return { valid: true };
}

// Generate GitHub workflow file content
export function generateWorkflowYaml(schedule: string, secretName: string, baseUrl: string): string {
  return `
name: Status Page Ping

on:
  schedule:
    - cron: '${schedule}'
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Send ping request
        run: |
          curl -X GET "${baseUrl}/api/ping?runId=\${{ github.run_id }}" \\
            -H "X-API-Key: \${{ secrets.${secretName} }}"
`;
}

// Setup steps definition
export interface SetupStep {
  key: string;
  label: string;
  requiresPath?: boolean;
}

export const SETUP_STEPS: SetupStep[] = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'password', label: 'Password' },
  { key: 'site-settings', label: 'Site Settings' },
  { key: 'path-setup', label: 'Setup Method', requiresPath: true },
  { key: 'complete', label: 'Complete' },
];

// Get current step number (1-indexed)
export function getCurrentStepNumber(currentKey: string): number {
  const index = SETUP_STEPS.findIndex(step => step.key === currentKey);
  return index >= 0 ? index + 1 : 1;
}

// Get total number of steps
export function getTotalSteps(): number {
  return SETUP_STEPS.length;
} 