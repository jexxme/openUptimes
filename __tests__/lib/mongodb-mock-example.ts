/**
 * Example MongoDB mock implementation
 * 
 * This is a demonstration of how to create a compatible mock for MongoDB
 * that maintains the same interface as the Redis mock, allowing tests
 * to be run against either database implementation.
 */

import { ServiceStatus } from '../../lib/redis'; // Reuse types for compatibility
import { ServiceConfig } from '../../lib/config';

// In-memory storage for tests, simulating MongoDB collections
const mockCollections: Record<string, any[]> = {
  'services': [], // Collection for services
  'status': [],   // Collection for service status
  'history': [],  // Collection for service history
  'settings': []  // Collection for app settings
};

// Helper to reset the mock data between tests
export function resetMockMongoDB() {
  Object.keys(mockCollections).forEach(collection => {
    mockCollections[collection] = [];
  });
  
  // Add default settings
  mockCollections.settings.push({
    _id: 'setup',
    complete: true
  });
}

// Mock MongoDB client with methods that match our usage patterns
const mockMongoClient = {
  db: () => ({
    collection: (name: string) => ({
      // Find operations
      findOne: async (query = {}) => {
        const collection = mockCollections[name] || [];
        return collection.find(doc => matchesQuery(doc, query)) || null;
      },
      
      find: (query = {}) => ({
        toArray: async () => {
          const collection = mockCollections[name] || [];
          return collection.filter(doc => matchesQuery(doc, query));
        },
        limit: (n: number) => ({
          toArray: async () => {
            const collection = mockCollections[name] || [];
            return collection.filter(doc => matchesQuery(doc, query)).slice(0, n);
          }
        })
      }),
      
      // Write operations
      insertOne: async (doc: any) => {
        if (!mockCollections[name]) {
          mockCollections[name] = [];
        }
        
        const newDoc = { ...doc, _id: doc._id || generateId() };
        mockCollections[name].push(newDoc);
        
        return { 
          acknowledged: true,
          insertedId: newDoc._id
        };
      },
      
      updateOne: async (query: any, update: any) => {
        if (!mockCollections[name]) {
          mockCollections[name] = [];
          return { matchedCount: 0, modifiedCount: 0 };
        }
        
        const index = mockCollections[name].findIndex(doc => matchesQuery(doc, query));
        if (index === -1) {
          return { matchedCount: 0, modifiedCount: 0 };
        }
        
        // Handle $set operator
        if (update.$set) {
          mockCollections[name][index] = { 
            ...mockCollections[name][index], 
            ...update.$set 
          };
        }
        
        return { matchedCount: 1, modifiedCount: 1 };
      },
      
      deleteOne: async (query: any) => {
        if (!mockCollections[name]) {
          return { deletedCount: 0 };
        }
        
        const initialLength = mockCollections[name].length;
        mockCollections[name] = mockCollections[name].filter(doc => !matchesQuery(doc, query));
        
        return { 
          deletedCount: initialLength - mockCollections[name].length 
        };
      }
    })
  }),
  
  // Connection management
  connect: async () => mockMongoClient,
  close: async () => {}
};

// Helper to check if a document matches a query
function matchesQuery(doc: any, query: any): boolean {
  for (const key in query) {
    // Handle _id special case (convert to string for comparison)
    if (key === '_id') {
      if (doc._id.toString() !== query._id.toString()) {
        return false;
      }
      continue;
    }
    
    // Handle simple equality
    if (typeof query[key] !== 'object') {
      if (doc[key] !== query[key]) {
        return false;
      }
      continue;
    }
    
    // Handle MongoDB operators
    for (const op in query[key]) {
      switch (op) {
        case '$eq':
          if (doc[key] !== query[key].$eq) return false;
          break;
        case '$gt':
          if (doc[key] <= query[key].$gt) return false;
          break;
        case '$lt':
          if (doc[key] >= query[key].$lt) return false;
          break;
        case '$in':
          if (!query[key].$in.includes(doc[key])) return false;
          break;
        // Add other operators as needed
      }
    }
  }
  
  return true;
}

// Generate a simple ID for new documents
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// Mock implementation of client getter
export const getMongoDBClient = jest.fn().mockResolvedValue(mockMongoClient);

// Mock implementations that match the Redis interface

// Service functions
export const getServicesFromMongoDB = jest.fn().mockImplementation(async () => {
  const client = await getMongoDBClient();
  const collection = client.db().collection('services');
  const services = await collection.find({ isDeleted: { $ne: true } }).toArray();
  return services;
});

export const setServiceStatus = jest.fn().mockImplementation(async (name: string, data: ServiceStatus) => {
  const client = await getMongoDBClient();
  const collection = client.db().collection('status');
  
  await collection.updateOne(
    { name },
    { $set: { ...data, name } },
    { upsert: true }
  );
  
  return true;
});

export const getServiceStatus = jest.fn().mockImplementation(async (name: string) => {
  const client = await getMongoDBClient();
  const collection = client.db().collection('status');
  const status = await collection.findOne({ name });
  return status ? status : null;
});

export const appendServiceHistory = jest.fn().mockImplementation(async (name: string, data: ServiceStatus) => {
  const client = await getMongoDBClient();
  const collection = client.db().collection('history');
  
  await collection.insertOne({
    serviceName: name,
    ...data,
    timestamp: data.timestamp || Date.now()
  });
  
  return true;
});

export const getServiceHistory = jest.fn().mockImplementation(async (name: string, limit = 1440) => {
  const client = await getMongoDBClient();
  const collection = client.db().collection('history');
  
  const history = await collection
    .find({ serviceName: name })
    .limit(limit)
    .toArray();
  
  return history;
});

// Helper to pre-populate services for tests
export function setMockServices(services: ServiceConfig[]) {
  mockCollections.services = services.map(service => ({
    ...service,
    _id: generateId()
  }));
}

// Helper to set service status for tests
export function setMockServiceStatus(name: string, status: ServiceStatus) {
  const existingIndex = mockCollections.status.findIndex(s => s.name === name);
  
  if (existingIndex >= 0) {
    mockCollections.status[existingIndex] = { name, ...status };
  } else {
    mockCollections.status.push({ name, ...status });
  }
}

// Connection management similar to Redis
export const closeMongoDBConnection = jest.fn().mockResolvedValue(undefined); 