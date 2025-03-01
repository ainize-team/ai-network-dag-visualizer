# AI Network DAG Visualizer

This project is a [Next.js](https://nextjs.org) application bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app). This application uses D3.js to visualize a Merkle DAG (Directed Acyclic Graph).

## Key Features

- **State Management**:
  - `nodes`, `links`: Stores the nodes and links of the DAG.
  - `loading`, `error`: Manages loading state and error messages.
  - `selectedNode`: Stores the selected node.
  - `address`, `fetchingCid`, `dataInput`: Stores the server address, CID of the node to fetch, and data for the node to add.
  - `isConnected`: Stores the connection status with the server.

- **Initialize API Connection** (`initializeClient`):
  - Connects to the gRPC client using the server address.
  - Updates the `isConnected` state upon successful connection.

- **Fetch Node by CID** (`fetchNodeByCid`):
  - Fetches a node using the entered CID.
  - If the node does not already exist, fetches the node and its child nodes recursively via the API.

- **Add New Node** (`addNode`):
  - Adds a new node using the entered data.
  - If a parent node is selected, includes the parent information when adding the node.

- **Initialize D3 Visualization** (`useEffect`):
  - Visualizes the DAG using D3.js with the node and link data.
  - Draws nodes and links as SVG elements and handles drag and click events.

- **Delete Selected Node** (`deleteSelectedNode`):
  - Deletes the selected node and updates the related links and parent node's children information.

- **Parse Prompt JSON** (`parseData`):
  - Parses the entered data into JSON format.

- **UI Components**:
  - Renders UI elements for entering the server address, fetching nodes, adding nodes, and deleting nodes.
  - Displays detailed information of the selected node and DAG statistics.

## Backend gRPC Client

The backend gRPC client is implemented using the `ai-network-dag-client` library. This client is used exclusively on the API server and is imported in Next.js API routes.

### Singleton Instance

A singleton instance of the `AINetworkDAGClient` is managed using a closure to ensure that only one instance of the client is created and reused.

```javascript
import AINetworkDAGClient from 'ai-network-dag-client';

let instance = null;
let clientAddress = null;

/**
 * Gets or creates a singleton instance of AINetworkDAGClient.
 * @param {string} address gRPC server address
 * @returns {Object} Wrapped gRPC client methods as a promise
 */
export function getDAGClient(address) {
  if (!instance || address !== clientAddress) {
    instance = new AINetworkDAGClient(address);
    clientAddress = address;
  }
  
  return instance;
}
```

### Mock Client

A mock client is provided for development environments or when a real gRPC server is not available. This mock client simulates the behavior of the gRPC client using a local in-memory data store.

```javascript
export function getMockDAGClient() {
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
```

### Client Configuration

The client configuration determines whether to use the real gRPC client or the mock client based on the environment variables.

```javascript
export const getClient = (address) => {
  if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_CLIENT === 'true') {
    return getMockDAGClient();
  }
  return getDAGClient(address);
};

export default getClient;
```

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
