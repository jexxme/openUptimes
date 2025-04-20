Implementation Plan: Enhanced Ping System
1. Backend Changes
A. Custom Cron Job Management
Create a new database schema to store custom cron configurations
Implement server-side cron job scheduler using node-cron or similar
Add API endpoints:
/api/ping/cron/create - Create new cron job
/api/ping/cron/update - Modify existing cron job
/api/ping/cron/delete - Remove cron job
/api/ping/cron/list - List all cron jobs
/api/ping/cron/status - Get job status
B. External Ping Integration
Create a secure ping endpoint with auth token validation
Implement endpoint for external services to trigger pings
Add rate limiting and IP filtering for security
C. Server-Side Cron Management
Add process management for spawning/killing cron processes
Implement persistent storage for active jobs
Create logging system for cron job execution
2. Frontend Changes
A. New Debug Page: Custom Cron Setup
Create new route: /debug/ping/cron
Add navigation between existing ping debug pages
B. Cron Configuration UI (Simple Debug Interface)
Form for cron expression input with validation
Enable/disable toggle for each job
Job status display (running/stopped)
Process ID and resource usage stats
Execution history with timestamps
C. External Ping Integration UI
API key generation and management
Documentation display for integration
Webhook URL display
Test endpoint feature
3. Integration Updates
A. Admin Panel Integration
Add cron job section to GitHubActions.tsx
Update settings store to include custom cron configuration
Create toggle mechanism between GitHub Actions and custom cron
B. Documentation
Update github-actions-setup.md to include custom cron options
Add new documentation for external ping integration
Include example code for common integration patterns
4. Implementation Phases
Phase 1: Backend Foundation
Implement database schema for cron jobs
Create basic API endpoints
Implement server-side cron runner
Phase 2: Debug UI
Create minimal debug page for cron management
Implement job creation/deletion UI
Add status monitoring
Phase 3: External Integration
Implement webhook endpoint
Add API key management
Create documentation
Phase 4: GitHub Actions Integration
Update GitHub Actions configuration to work alongside custom jobs
Implement priority system between job types
Add migration path for existing users
5. Security Considerations
Validate all cron expressions
Implement rate limiting for API endpoints
Add authentication for all management actions
Sanitize and validate all user inputs
This approach allows for a gradual implementation while maintaining compatibility with the existing GitHub Actions-based system.