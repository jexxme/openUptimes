# OpenUptimes Setup Architecture

## Implementation Progress

### Completed (Phase 1 - April 2023)
- ✅ Core setup flow architecture design and implementation plan
- ✅ Base setup page with multi-step flow and layout
- ✅ Modern UI framework with Shadcn/Vercel design system integration

### Completed (Phase 2 - Current Implementation)
- ✅ Core setup components:
  - `SetupContainer`: Main wrapper with consistent UI, navigation controls and error handling
  - `SetupProgress`: Step visualization with progress tracking
  - `SetupPathSelector`: Path selection UI for different setup approaches
  - `SetupContext`: State management for multi-step form
- ✅ Supporting utilities:
  - Environment detection API endpoint (`/api/environment`)
  - Setup completion API endpoint (`/api/setup/complete`)
  - Status checking API endpoint (`/api/setup/status`)
  - Developer tools for testing (reset functionality)
- ✅ Password UI with strength validation and requirements display
- ✅ Site Settings UI with name, description, and refresh interval configuration
- ✅ Path-specific setup screens:
  - ✅ GitHub Actions integration UI with multi-step flow
  - ⬜ Cron Jobs configuration UI (placeholder added)
  - ⬜ Custom integration UI (placeholder added)
- ✅ Navigation integration between main flow and path-specific substeps
- ✅ Dynamic component loading with proper React hooks pattern

### TODO (Next Phase)
- ⬜ Fix progress bar not tracking correctly
- ⬜ Complete implementation of Cron Jobs configuration UI
- ⬜ Complete implementation of Custom integration UI
- ⬜ Polish look, feel and UX
- ⬜ Implement:
  - `IntegrationTester`: For validating setup with test pings in custom path
- ⬜ Add proper authentication upon setup completion
- ⬜ Improve accessibility features across all components
- ⬜ Add comprehensive setup step persistence (resume capability)
- ⬜ Add success animations and visual feedback on completion

---

This document outlines the technical architecture for implementing the OpenUptimes setup process with multiple paths.

## Reusable Components from Existing Codebase

### From Cron Debug Page (`app/debug/ping/cron/page.tsx`)
1. **`CronSelector`**: Reuse component for selecting cron expressions
   - Path: `@/app/components/CronSelector`
   - Props: `value`, `onChange`, `showNextRun`
   - Add optional simpler mode for non-technical users

2. **Cron Expression Utilities**:
   - `validateCronExpression(value)` - For real-time validation
   - `describeCronExpression(value)` - For human-readable descriptions
   - `getNextRunTime(value)` - For previewing next execution

3. **Job Management Components**:
   - Job list/card UI for visualizing multiple jobs
   - Status indicators and toggles

### From GitHub Page (`app/debug/ping/github/page.tsx`)
1. **`GitHubActionsForm`**:
   - Props: `initialSettings`, `onSave`, `isSaving`, `addLog`, `siteSettings`
   - Simplify for setup process

2. **`ConfigSummary`**:
   - Shows current GitHub configuration state 
   - Props: `siteSettings`, `onManualPing`

3. **`ManualActions`**:
   - For triggering test pings
   - Props: `triggerPing`, `repository`, `workflow`

## Required New Components

1. **`SetupContainer`** - Main wrapper component
   ```tsx
   interface SetupContainerProps {
     currentStep: number;
     totalSteps: number;
     children: React.ReactNode;
     onNext: () => void;
     onBack: () => void;
     isSubmitting: boolean;
   }
   ```

2. **`SetupProgress`** - Visual progress indicator
   ```tsx
   interface SetupProgressProps {
     currentStep: number;
     totalSteps: number;
     steps: {
       key: string;
       label: string;
       completed: boolean;
     }[];
   }
   ```

3. **`SetupPathSelector`** - Path selection component
   ```tsx
   interface SetupPath {
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
   ```

4. **`ApiKeyManager`** - Generate and display API keys
   ```tsx
   interface ApiKeyManagerProps {
     apiKey: string | null;
     onGenerate: () => Promise<string>;
     onReset: () => Promise<string>;
   }
   ```

5. **`WorkflowFileGenerator`** - Generate GitHub workflow file content
   ```tsx
   interface WorkflowFileGeneratorProps {
     repository: string;
     schedule: string;
     secretName: string;
     baseUrl: string;
   }
   ```

6. **`IntegrationTester`** - Test integration with ping endpoint
   ```tsx
   interface IntegrationTesterProps {
     apiKey: string;
     baseUrl: string;
     onTest: () => Promise<boolean>;
   }
   ```

7. **`EnvironmentChecker`** - Check runtime environment
   ```tsx
   interface EnvironmentCheckerProps {
     onCheck: (isEdgeRuntime: boolean) => void;
   }
   ```

## Setup State Management

Use React context to manage setup state across steps:

```tsx
interface SetupContextType {
  path: 'github' | 'cron' | 'custom' | null;
  step: number;
  isEdgeRuntime: boolean;
  password: string;
  confirmPassword: string;
  siteName: string;
  siteDescription: string;
  refreshInterval: number;
  githubSettings: {
    repository: string;
    schedule: string;
    workflow: string;
    secretName: string;
    apiKey: string | null;
  };
  cronSettings: {
    jobs: Array<{
      name: string;
      description: string;
      cronExpression: string;
      enabled: boolean;
    }>
  };
  customSettings: {
    apiKey: string | null;
  };
  stepCompletion: Record<string, boolean>;
  setPath: (path: SetupContextType['path']) => void;
  setStep: (step: number) => void;
  updatePassword: (password: string) => void;
  updateConfirmPassword: (password: string) => void;
  updateSiteSettings: (settings: Partial<Pick<SetupContextType, 'siteName' | 'siteDescription' | 'refreshInterval'>>) => void;
  updateGithubSettings: (settings: Partial<SetupContextType['githubSettings']>) => void;
  updateCronSettings: (settings: Partial<SetupContextType['cronSettings']>) => void;
  updateCustomSettings: (settings: Partial<SetupContextType['customSettings']>) => void;
  markStepComplete: (step: string) => void;
  checkEnvironment: () => Promise<void>;
  completeSetup: () => Promise<boolean>;
}
```

## API Integration Points

1. **Environment Check API**
   - Endpoint: `/api/environment`
   - Method: GET
   - Response: `{ isEdgeRuntime: boolean, isVercel: boolean, runtimeInfo: object }`

2. **Setup Completion API**
   - Endpoint: `/api/setup/complete`
   - Method: POST
   - Body: 
     ```json
     {
       "password": "user-password",
       "siteSettings": {
         "siteName": "Site Name",
         "siteDescription": "Site Description",
         "refreshInterval": 60000,
         "setupPath": "github|cron|custom",
         "pathSettings": {
           // Depends on chosen path
         }
       }
     }
     ```

3. **GitHub Settings API**
   - Endpoint: `/api/settings`
   - Method: PUT
   - Body: GitHub configuration object

4. **Cron Jobs API**
   - Endpoint: `/api/ping/cron/jobs`
   - Method: POST
   - Body: Cron job configuration object

5. **API Key Generation**
   - Endpoint: `/api/auth/api-key`
   - Method: POST
   - Body: `{ description: "API Key purpose" }`
   - Response: `{ key: "generated-api-key" }`

## Component Relationships and Flow

```
SetupContainer
├── SetupProgress
├── EnvironmentChecker (initial load)
├── [Step 1: Welcome]
│   └── SetupPathSelector
├── [Step 2: Password]
│   └── PasswordForm
├── [Step 3: Site Settings]
│   └── SiteSettingsForm
├── [Step 4: Path-specific]
│   ├── [GitHub Path]
│   │   ├── GitHubActionsForm (simplified)
│   │   ├── ApiKeyManager
│   │   ├── WorkflowFileGenerator
│   │   └── IntegrationTester
│   ├── [Cron Path]
│   │   ├── CronSelector (from existing components)
│   │   ├── CronJobForm
│   │   └── IntegrationTester
│   └── [Custom Path]
│       ├── ApiKeyManager
│       ├── CustomIntegrationDocs
│       └── IntegrationTester
└── [Step 5: Completion]
    └── CompletionSummary
```

## Step and Component Mapping

| Step | GitHub Path | Cron Path | Custom Path |
|------|-------------|-----------|------------|
| 1: Welcome | SetupPathSelector | SetupPathSelector | SetupPathSelector |
| 2: Password | PasswordForm | PasswordForm | PasswordForm |
| 3: Site Settings | SiteSettingsForm | SiteSettingsForm | SiteSettingsForm |
| 4: Path Setup | GitHubActionsForm | CronJobsManager | ApiIntegrationManager |
| 5: Completion | CompletionSummary | CompletionSummary | CompletionSummary |

## Critical Implementation Details

1. **Runtime Detection**
   ```typescript
   async function checkEnvironment() {
     const response = await fetch('/api/environment');
     const { isEdgeRuntime } = await response.json();
     return isEdgeRuntime;
   }
   ```

2. **Step Persistence in Redis**
   ```typescript
   async function saveSetupProgress(sessionId: string, data: any) {
     await fetch('/api/setup/progress', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         sessionId,
         progress: data
       })
     });
   }
   ```

3. **API Key Generation**
   ```typescript
   async function generateApiKey() {
     const response = await fetch('/api/auth/api-key', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ description: 'Setup-generated key' })
     });
     const { key } = await response.json();
     return key;
   }
   ```

4. **Workflow File Generation**
   ```typescript
   function generateWorkflowYaml(schedule: string, secretName: string, baseUrl: string) {
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
   ```

5. **Redux/Context Setup**
   ```typescript
   // setup-slice.ts
   import { createSlice, PayloadAction } from '@reduxjs/toolkit';
   
   const setupSlice = createSlice({
     name: 'setup',
     initialState: {
       currentStep: 1,
       path: null,
       isEdgeRuntime: false,
       // other state fields
     },
     reducers: {
       setStep: (state, action: PayloadAction<number>) => {
         state.currentStep = action.payload;
       },
       setPath: (state, action: PayloadAction<string>) => {
         state.path = action.payload;
       },
       // other reducers
     }
   });
   ```

## Core UX Principles

- **Simple by Default**: Every path should be easy to understand and complete
- **Progressive Disclosure**: Show only necessary options at each step
- **Visual Progress Indicators**: Clear visibility of setup progress
- **Guided Experience**: Step-by-step flow with helpful information
- **Error Prevention**: Validate inputs before proceeding to next steps
- **Accessibility**: All setup screens must be fully accessible

## Common Setup Requirements (All Paths)

1. **Admin Password** - Required for authentication to manage services and settings, tell user i
2. **Status Page Configuration**
   - Site Name (defaults to "OpenUptimes" if not provided)
   - Site Description (defaults to "Service Status Monitor" if not provided)
   - Refresh Interval in milliseconds (defaults to 60000ms/60s)

## Path 1: GitHub Actions (Simple Path)

The GitHub Actions path is designed to be accessible to non-technical users while providing enough power for technical users.

### Required Configuration:
1. **GitHub Repository** - Where workflow file will be stored
2. **API Key** - For authorization when GitHub Actions calls the ping endpoint
3. **Schedule** - Cron expression for when to run checks (default: `*/5 * * * *` - every 5 minutes)
4. **Workflow File Name** - Default: `ping.yml`
5. **Secret Name** - Repository secret name (default: `PING_API_KEY`)

### API Routes and Parameters:
- **Setup Route**: `/api/setup/complete` (POST)
  - Parameters: `password`, `siteSettings`
- **GitHub Settings**: `/api/settings` (PUT)
  - Parameters: GitHub configuration object with `enabled`, `repository`, `schedule`, `workflow`, `secretName`
- **Ping Endpoint**: `/api/ping` (GET)
  - Headers: `x-api-key` or `Authorization: Bearer {token}`
  - Query Parameters: `runId` (from GitHub), `source=github-action`

### Setup Flow and UX:
1. **Welcome Screen**: Introduction to setup process with path selection
2. **Admin Password Creation**: Simple password form with strength meter
3. **Basic Site Configuration**: Site name, description, refresh interval with sensible defaults
4. **GitHub Setup**: 
   - **Visual Guide**: Step-by-step GitHub repository integration
   - **Copy Buttons**: One-click copy for workflow files and tokens
   - **Visual Validation**: Check marks for completed steps
   - **Schedule Selector**: User-friendly cron expression builder
5. **Setup Completion**: Confirmation screen with next steps

### UX Considerations for Non-Technical Users:
- **Plain Language**: Avoid technical jargon in UI
- **Visual Aids**: Use icons and illustrations to explain concepts
- **Help Text**: Contextual help for each field
- **Tooltips**: Explain technical terms when hovering
- **Simplified GitHub Integration**:
  - Auto-generation of all technical files (yaml file already provided in repo as ping.yml)
  - Clear edit instructions if user wants to change the schedule or other settings

## Path 2: Cron Jobs (Pro User Path - Non-Edge Runtime)

### Required Configuration:
1. **Cron Expression** - Schedule for when to run service checks
2. **Job Configuration**
   - Name
   - Description (optional)
   - Enabled status

### API Routes and Parameters:
- **Setup Route**: `/api/setup/complete` (POST)
  - Parameters: `password`, `siteSettings`
- **Cron Job Creation**: `/api/ping/cron/jobs` (POST)
  - Parameters: `name`, `description`, `cronExpression`, `enabled`
- **Cron Job Management**: 
  - List: `/api/ping/cron/jobs` (GET)
  - Details: `/api/ping/cron/jobs/{id}` (GET)
  - Update: `/api/ping/cron/jobs/{id}` (PUT)
  - Delete: `/api/ping/cron/jobs/{id}` (DELETE)
  - Start/Stop: `/api/ping/cron/jobs/{id}/start|stop` (POST)
- **Job History**: `/api/ping/cron/jobs/{id}/history` (GET)

### Setup Flow and UX:
1. **Advanced Path Selection**: Clear indication this is for technical users
2. **Environment Check**: Visual indication if current environment supports this path
3. **Visual Cron Builder**: Interactive UI for creating cron schedules
4. **Job Management Dashboard**: Clean interface for managing multiple jobs
5. **Validation**: Real-time validation of cron expressions
6. **Testing Tools**: Built-in tools to test job execution

## Path 3: Custom Integration Path

### Required Configuration:
1. **API Key** - For authentication when making external ping requests
2. **External System** - Custom system that will call the ping endpoint

### API Routes and Parameters:
- **Setup Route**: `/api/setup/complete` (POST)
  - Parameters: `password`, `siteSettings`
- **API Key Generation**: Part of the settings configuration
- **Ping Endpoint**: `/api/ping` (GET)
  - Headers: `x-api-key` or `Authorization: Bearer {token}`
  - Query Parameters: `source=custom`

### Setup Flow and UX:
1. **Integration Overview**: Clear explanation of this approach
2. **API Key Management**: Generate, view, and reset API keys
3. **Documentation View**: In-app documentation for integration
4. **Testing Console**: Built-in API testing tool
5. **Example Generators**: Generate examples for various systems (curl, wget, Python, Node.js)
6. **Verification Tool**: Verify the integration is working correctly

## Progress Tracking and Completion Indicators

A critical UX element across all setup paths is clear progress indication:

1. **Progress Bar**: Visual indicator showing overall setup progress
2. **Step Indicators**: Numbered steps with current position highlighted
3. **Completion Checkmarks**: Visual confirmation when a step is completed
4. **Save & Continue**: Allow users to save progress and continue later
5. **Prerequisites**: Clear indication of requirements for each step
6. **Validation Status**: Real-time validation of entered information

## Technical Details for Implementation

### Authentication Flows:
- Admin pages require password authentication
- GitHub Actions requires API key in header
- Custom integrations require API key in header

### Data Storage:
- Redis is used for storing all configuration and monitoring data
- The `config:site` key stores the main site configuration
- Service statuses are stored in their own keys
- Ping history is stored in a Redis list

### Environment-specific Functionality:
- Edge Runtime has limitations and cannot run certain features
- `/api/environment` endpoint detects the runtime environment
- Cron jobs (Path 2) require non-Edge runtime

### Setup Progress Persistence:
- Store setup progress in Redis under `setup:progress:{sessionId}`
- Track completion status of each step
- Allow resuming setup from last completed step
- Clear temporary data on setup completion

## Recommended UI Components

For consistent UX across the setup process:

1. **Card-based Interface**: Each step contained in a clean card layout
2. **Consistent Button Styles**: Primary actions highlighted
3. **Micro-animations**: Subtle feedback for user actions
4. **Mobile-friendly Design**: Fully responsive across all devices
5. **Dark/Light Mode Support**: Honor user preferences
6. **Visual Hierarchy**: Clear distinction between required and optional fields 