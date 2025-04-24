# External Monitoring Options

While OpenUptimes provides built-in monitoring through the [Internal Cron System](cron-system.md) and [GitHub Actions](github-actions.md), you can also use external monitoring tools for additional flexibility or precision.

## Overview

OpenUptimes' ping endpoint is designed to be lightweight and accessible, making it easy to integrate with external monitoring services. This allows you to:

1. Set custom monitoring intervals (down to seconds if needed)
2. Monitor from multiple geographical locations
3. Integrate with existing monitoring infrastructure
4. Add redundancy to your monitoring setup

## Implementation Options

### Option 1: Custom Cron Server

If you have an existing server, you can set up a cron job to call your OpenUptimes ping endpoint at any interval:

```bash
# Example crontab entry for checking every minute
* * * * * curl -X GET "https://your-domain.com/api/ping" -H "Authorization: Bearer YOUR_API_KEY"

# Example for every 30 seconds (using two cron entries)
* * * * * curl -X GET "https://your-domain.com/api/ping" -H "Authorization: Bearer YOUR_API_KEY"
* * * * * sleep 30 && curl -X GET "https://your-domain.com/api/ping" -H "Authorization: Bearer YOUR_API_KEY"
```

### Option 2: Cloud-based Cron Services

Several cloud services provide cron-like functionality with more precision than GitHub Actions:

- [EasyCron](https://www.easycron.com/) - Offers intervals as short as every minute
- [Cron-job.org](https://cron-job.org/) - Free service with 1-minute precision
- [Cronhub](https://cronhub.io/) - Monitoring and alerting for scheduled jobs

### Option 3: Serverless Functions

You can deploy serverless functions on various platforms to call your ping endpoint:

#### AWS Lambda with CloudWatch Events

```javascript
// Lambda function example
exports.handler = async (event) => {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'your-domain.com',
      path: '/api/ping',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data
        });
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    req.end();
  });
};
```

Set up a CloudWatch Event Rule to trigger this function at your desired interval.

#### Google Cloud Functions with Cloud Scheduler

```javascript
exports.pingOpenUptimes = (req, res) => {
  const https = require('https');
  
  const options = {
    hostname: 'your-domain.com',
    path: '/api/ping',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  };
  
  const req = https.request(options, (response) => {
    let data = '';
    
    response.on('data', (chunk) => {
      data += chunk;
    });
    
    response.on('end', () => {
      res.status(200).send(`Ping completed: ${data}`);
    });
  });
  
  req.on('error', (e) => {
    res.status(500).send(`Error: ${e.message}`);
  });
  
  req.end();
};
```

Create a Cloud Scheduler job to call this function at your desired interval.

### Option 4: Integration with Existing Monitoring Systems

Many monitoring platforms allow you to add HTTP endpoints to check:

- **Uptime Robot** - Free tier supports 5-minute checks
- **Pingdom** - Commercial service with advanced features
- **StatusCake** - Offers various check types and frequencies
- **Better Uptime** - Provides status pages and on-call scheduling

## Authentication

When calling the ping endpoint from external services, you'll need to authenticate using the same API key system used for GitHub Actions:

```
Authorization: Bearer YOUR_API_KEY
```

Generate and manage API keys in your OpenUptimes admin dashboard.

## Best Practices

### Regional Distribution

For global services, consider running ping checks from multiple regions to detect regional outages:

1. Set up monitoring in North America, Europe, and Asia
2. Use different cloud providers for redundancy
3. Compare response times across regions

### Monitoring Frequency

Choose an appropriate monitoring frequency:

- **30 seconds**: For critical systems requiring immediate detection
- **1 minute**: For important services with time-sensitive operations
- **5 minutes**: For general website monitoring (standard GitHub Actions interval)
- **15+ minutes**: For non-critical internal services

### Staggered Checks

When implementing multiple monitoring systems, stagger the check times to get more frequent coverage:

- System A: Check at :00, :05, :10, :15, etc.
- System B: Check at :02, :07, :12, :17, etc.
- System C: Check at :04, :09, :14, :19, etc.

This provides more data points without overloading your ping endpoint.

## Ping Endpoint Details

When making requests to the ping endpoint:

**Endpoint**: `GET /api/ping`

**Required Headers**:
- `Authorization: Bearer YOUR_API_KEY`

**Optional Parameters**:
- `source`: String identifier for your monitoring system
- `runId`: Unique identifier for this specific check

**Response**: JSON containing service status results and execution details

```json
{
  "status": "success",
  "timestamp": 1647456789012,
  "nextPing": 1647456849012,
  "refreshInterval": 60000,
  "executionTime": 1234,
  "results": [
    {
      "name": "Website",
      "status": "up",
      "responseTime": 345
    },
    {
      "name": "API",
      "status": "up",
      "responseTime": 567
    }
  ]
}
``` 