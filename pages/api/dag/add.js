import { getClient } from './client';

// Store server session information (use a database or Redis in production)
let serverAddress = 'localhost:50051'; // Set default value

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, data, children = [], parentCid } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get client
    const client = getClient(serverAddress);
    
    try {
      // If there is a parent node, fetch it first
      if (parentCid) {
        try {
          const parentNode = await client.get(parentCid);
          
          // Prepare to add to children array if not already present (actual addition after new node creation)
          if (!parentNode.children) {
            parentNode.children = [];
          }
        } catch (parentError) {
          console.error('Parent node fetch error:', parentError);
          return res.status(404).json({ error: `Parent node with CID ${parentCid} not found` });
        }
      }
      
      // Prepare node content
      const content = {
        message,
        // Convert to Buffer if provided as a string
        data: typeof data === 'string' ? Buffer.from(data) : data,
        children
      };
      
      // Add node
      const result = await client.add(content);
      
      // If there is a parent node, link as a child
      if (parentCid) {
        try {
          const parentNode = await client.get(parentCid);
          parentNode.children = [...(parentNode.children || []), result.cid];
          
          // Update parent node (implement according to actual environment)
          // Mock implementation here, so pass
        } catch (updateError) {
          console.warn('Failed to update parent node:', updateError);
          // Log the error but do not return it (node creation succeeded)
        }
      }
      
      return res.status(201).json({ cid: result.cid });
    } catch (error) {
      console.error('Add node error:', error);
      return res.status(500).json({ error: `Failed to add node: ${error.message}` });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}