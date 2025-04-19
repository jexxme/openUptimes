// Simple test script to manually call our API endpoints
import fetch from 'node-fetch';

async function testPingEndpoint() {

  try {
    const response = await fetch('http://localhost:3000/api/ping');
    const data = await response.json();

  } catch (error) {

  }
}

async function testStatusEndpoint() {

  try {
    const response = await fetch('http://localhost:3000/api/status?history=true&limit=5');
    const data = await response.json();

  } catch (error) {

  }
}

async function testRedisEndpoint() {

  try {
    const response = await fetch('http://localhost:3000/api/test-redis');
    const data = await response.json();

  } catch (error) {

  }
}

async function runTests() {
  await testPingEndpoint();
  await testStatusEndpoint();
  await testRedisEndpoint();
}

runTests(); 