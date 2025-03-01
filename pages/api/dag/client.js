import AINetworkDAGClient from 'ai-network-dag-client';

// Closure for singleton instance
let instance = null;
let clientAddress = null;

/**
 * Get or create a singleton instance of AINetworkDAGClient.
 * @param {string} address gRPC server address
 * @returns {Object} Wrapped gRPC client methods as a promise
 */
export function getDAGClient(address) {
  // Create a new instance if the address has changed or there is no instance
  if (!instance || address !== clientAddress) {
    instance = new AINetworkDAGClient(address);
    clientAddress = address;
  }
  
  return instance;
}

/**
 * Create a mock client. Use in development environments or when there is no actual gRPC server.
 * @returns {Object} Mock gRPC client methods
 */
export function getMockDAGClient() {
  // Mock data store
  const mockDB = new Map();
  
  return {
    add: async (content) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const cid = `mock-${Math.random().toString(36).substring(2, 15)}`;
          mockDB.set(cid, {
            cid,
            ...content
          });
          resolve({ cid });
        }, 200);
      });
    },
    get: async (cid) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const node = mockDB.get(cid);
          if (node) {
            resolve(node);
          } else {
            reject(new Error('Node not found'));
          }
        }, 200);
      });
    },
    delete: async (cid) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          mockDB.delete(cid);
          resolve({ success: true });
        }, 200);
      });
    }
  };
}

// Client configuration for API routes
// Use mock client in development environment (modify as needed)
export const getClient = (address) => {
  if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_CLIENT === 'true') {
    return getMockDAGClient();
  }
  return getDAGClient(address);
};

export default getClient;