#!/bin/bash

# Test script to simulate GitHub Actions ping using different authentication methods
# Usage: ./test-github-action.sh [your-api-key] [host-url]

# Set defaults
API_KEY=${1:-"v33dK21Tx3Rdw3fppyNpsfMWIyl0WMkT"}
HOST=${2:-"http://localhost:3000"}
RUN_ID="test-$(date +%s)"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}GitHub Actions Ping Test${NC}"
echo "Host: $HOST"
echo "Run ID: $RUN_ID"
echo "API Key: ${API_KEY:0:5}**********"
echo "--------------------------------------------------------"

# Test 1: Using X-API-Key header
echo -e "${YELLOW}Test 1: Using X-API-Key header${NC}"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/response.txt \
  -H "X-API-Key: $API_KEY" \
  "$HOST/api/ping?runId=$RUN_ID")

if [ "$RESPONSE" == "200" ]; then
  echo -e "${GREEN}SUCCESS: API responded with 200 OK${NC}"
  cat /tmp/response.txt | grep -o '"status":"[^"]*"' | head -1
else
  echo -e "${RED}FAILED: API responded with $RESPONSE${NC}"
  cat /tmp/response.txt
fi
echo "--------------------------------------------------------"

# Test 2: Using Authorization Bearer header
echo -e "${YELLOW}Test 2: Using Authorization Bearer header${NC}"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/response.txt \
  -H "Authorization: Bearer $API_KEY" \
  "$HOST/api/ping?runId=$RUN_ID")

if [ "$RESPONSE" == "200" ]; then
  echo -e "${GREEN}SUCCESS: API responded with 200 OK${NC}"
  cat /tmp/response.txt | grep -o '"status":"[^"]*"' | head -1
else
  echo -e "${RED}FAILED: API responded with $RESPONSE${NC}"
  cat /tmp/response.txt
fi
echo "--------------------------------------------------------"

# Test 3: No authentication (should fail)
echo -e "${YELLOW}Test 3: No authentication (should fail)${NC}"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/response.txt \
  "$HOST/api/ping?runId=$RUN_ID")

if [ "$RESPONSE" == "401" ]; then
  echo -e "${GREEN}SUCCESS: API correctly rejected unauthenticated request with 401${NC}"
  cat /tmp/response.txt
else
  echo -e "${RED}FAILED: API should have rejected with 401, but got $RESPONSE${NC}"
  cat /tmp/response.txt
fi
echo "--------------------------------------------------------"

# Test 4: Invalid API Key (should fail)
echo -e "${YELLOW}Test 4: Invalid API Key (should fail)${NC}"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/response.txt \
  -H "X-API-Key: invalid_key_12345" \
  "$HOST/api/ping?runId=$RUN_ID")

if [ "$RESPONSE" == "401" ]; then
  echo -e "${GREEN}SUCCESS: API correctly rejected invalid key with 401${NC}"
  cat /tmp/response.txt
else
  echo -e "${RED}FAILED: API should have rejected with 401, but got $RESPONSE${NC}"
  cat /tmp/response.txt
fi
echo "--------------------------------------------------------"

# Test 5: Regular ping without RunID (should work without auth)
echo -e "${YELLOW}Test 5: Regular ping without RunID (no auth needed)${NC}"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/response.txt \
  "$HOST/api/ping")

if [ "$RESPONSE" == "200" ]; then
  echo -e "${GREEN}SUCCESS: API allowed regular ping without authentication${NC}"
  cat /tmp/response.txt | grep -o '"status":"[^"]*"' | head -1
else
  echo -e "${RED}FAILED: API should allow regular pings, but got $RESPONSE${NC}"
  cat /tmp/response.txt
fi
echo "--------------------------------------------------------"

echo -e "${BLUE}Test summary:${NC}"
echo "1. X-API-Key authentication: Expected 200"
echo "2. Bearer token authentication: Expected 200"
echo "3. No authentication: Expected 401"
echo "4. Invalid API key: Expected 401"
echo "5. Regular ping without runId: Expected 200"
echo "--------------------------------------------------------"
echo -e "${GREEN}Testing complete!${NC}" 