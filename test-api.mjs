// Simple test script to manually call our API endpoints
import fetch from 'node-fetch';

async function testPingEndpoint() {
  console.log('Testing ping endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/ping');
    const data = await response.json();
    console.log('Ping response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error calling ping endpoint:', error);
  }
}

async function testStatusEndpoint() {
  console.log('Testing status endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/status?history=true&limit=5');
    const data = await response.json();
    console.log('Status response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error calling status endpoint:', error);
  }
}

async function testRedisEndpoint() {
  console.log('Testing Redis connection endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/test-redis');
    const data = await response.json();
    console.log('Redis test response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error calling Redis test endpoint:', error);
  }
}

async function runTests() {
  await testPingEndpoint();
  await testStatusEndpoint();
  await testRedisEndpoint();
}

runTests(); 