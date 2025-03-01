import { getClient } from './client';

// Store server session information (use a database or Redis in production)
let serverAddress = 'localhost:50051'; // Set default value

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cid } = req.query;
    
    if (!cid) {
      return res.status(400).json({ error: 'CID is required' });
    }

    // Get client
    const client = getClient(serverAddress);
    
    try {
      // Fetch the node first to check for child nodes
      const node = await client.get(cid);
      
      // Remove child relationship from parent node before deletion (implement according to actual environment)
      // Mock implementation here, so pass
      
      // Delete node
      await client.delete(cid);
      
      // Successfully deleted
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete node error:', error);
      return res.status(404).json({ error: `Failed to delete node with CID ${cid}: ${error.message}` });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}