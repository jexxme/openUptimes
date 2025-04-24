# API Endpoints

OpenUptimes provides several API endpoints for monitoring and configuring services. This page documents all available endpoints and their usage.

## Authentication

Some API endpoints require authentication. You can authenticate using a token in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

To generate an API key, go to the admin dashboard and visit the **API Keys** section.

## Core Monitoring Endpoints

### Ping Services

Actively checks the status of all configured services and stores results in Redis.

```
GET /api/ping
```

#### Headers

- `Authorization: Bearer YOUR_API_KEY` (required)

#### Response

```json
{
  "success": true,
  "timestamp": 1627987654321,
  "duration": 1234,
  "services": [
    {
      "name": "Example Service",
      "url": "https://example.com",
      "status": "up",
      "responseTime": 123,
      "timestamp": 1627987654321
    }
  ]
}
```

### Get Service Status

Retrieves the current status of all services.

```
GET /api/status
```

#### Response

```json
{
  "overall": "up",
  "updated": 1627987654321,
  "services": [
    {
      "name": "Example Service",
      "description": "An example service",
      "status": "up",
      "lastChecked": 1627987654321,
      "responseTime": 123
    }
  ]
}
```

### Get Service History

Retrieves historical data for a specific service.

```
GET /api/history/{serviceName}
```

#### Parameters

- `serviceName`: The name of the service to get history for

#### Response

```json
{
  "name": "Example Service",
  "history": [
    {
      "timestamp": 1627987654321,
      "status": "up",
      "responseTime": 123
    }
  ]
}
```

## Service Management Endpoints

### List Services

Lists all configured services.

```
GET /api/services
```

#### Headers

- `Authorization: Bearer YOUR_API_KEY` (required)

#### Response

```json
{
  "services": [
    {
      "name": "Example Service",
      "url": "https://example.com",
      "description": "An example service",
      "expectedStatus": 200,
      "method": "GET",
      "timeout": 10000
    }
  ]
}
```

### Add Service

Adds a new service to monitor.

```
POST /api/services
```

#### Headers

- `Content-Type: application/json`
- `Authorization: Bearer YOUR_API_KEY` (required)

#### Request Body

```json
{
  "name": "New Service",
  "url": "https://example.com",
  "description": "A new service to monitor",
  "expectedStatus": 200,
  "method": "GET",
  "timeout": 10000
}
```

#### Response

```json
{
  "success": true,
  "service": {
    "name": "New Service",
    "url": "https://example.com",
    "description": "A new service to monitor",
    "expectedStatus": 200,
    "method": "GET",
    "timeout": 10000
  }
}
```

### Update Service

Updates an existing service.

```
PUT /api/services?name={serviceName}
```

#### Headers

- `Content-Type: application/json`
- `Authorization: Bearer YOUR_API_KEY` (required)

#### Parameters

- `serviceName`: The name of the service to update

#### Request Body

```json
{
  "name": "Updated Service",
  "url": "https://example.com",
  "description": "An updated service",
  "expectedStatus": 200,
  "method": "GET",
  "timeout": 10000
}
```

#### Response

```json
{
  "success": true,
  "service": {
    "name": "Updated Service",
    "url": "https://example.com",
    "description": "An updated service",
    "expectedStatus": 200,
    "method": "GET",
    "timeout": 10000
  }
}
```

### Delete Service

Deletes a service.

```
DELETE /api/services?name={serviceName}
```

#### Headers

- `Authorization: Bearer YOUR_API_KEY` (required)

#### Parameters

- `serviceName`: The name of the service to delete

#### Response

```json
{
  "success": true,
  "message": "Service deleted"
}
```

## History Management Endpoints

### Get TTL Setting

Retrieves the current TTL (Time To Live) setting for history data.

```
GET /api/ping-history/ttl
```

#### Headers

- `Authorization: Bearer YOUR_API_KEY` (required)

#### Response

```json
{
  "ttl": 86400,
  "unlimited": false
}
```

### Update TTL Setting

Updates the TTL setting for history data.

```
PATCH /api/ping-history/ttl
```

#### Headers

- `Content-Type: application/json`
- `Authorization: Bearer YOUR_API_KEY` (required)

#### Request Body

```json
{
  "ttl": 604800
}
```

#### Response

```json
{
  "success": true,
  "ttl": 604800,
  "unlimited": false,
  "message": "History TTL set to 604800 seconds"
}
```

### Clear History

Clears all ping history entries.

```
DELETE /api/ping-history
```

#### Headers

- `Authorization: Bearer YOUR_API_KEY` (required)

#### Response

```json
{
  "success": true,
  "message": "Ping history cleared"
}
```

## Setup and Configuration Endpoints

### Check Setup Status

Checks if the initial setup has been completed.

```
GET /api/setup/status
```

#### Response

```json
{
  "completed": true
}
```

### Complete Setup

Marks the setup as completed.

```
POST /api/setup/complete
```

#### Headers

- `Content-Type: application/json`
- `Authorization: Bearer YOUR_API_KEY` (required)

#### Response

```json
{
  "success": true,
  "message": "Setup completed"
}
```

### Test Redis Connection

Tests if the Redis connection is working properly.

```
GET /api/test-redis
```

#### Response

```json
{
  "connected": true,
  "ping": "PONG"
}
```

## Error Responses

All API endpoints return appropriate HTTP status codes along with error messages when applicable.

Example error response:

```json
{
  "error": true,
  "message": "Service not found",
  "status": 404
}
```

Common error codes:

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error 