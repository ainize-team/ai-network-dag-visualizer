import { getClient } from './client';

// Store server session information (use a database or Redis in production)
let serverAddress = null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Server address is required' });
    }

    // Save address
    serverAddress = address;

    // Attempt to initialize client
    try {
      const client = getClient(address);
      return res.status(200).json({ success: true, address });
    } catch (error) {
      console.error('Connection error:', error);
      return res.status(500).json({ error: `Failed to connect to ${address}: ${error.message}` });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}