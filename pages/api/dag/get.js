import { getClient } from './client';

// Store server session information (use a database or Redis in production)
let serverAddress = 'localhost:50051'; // Set default value

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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
      // Fetch node by CID
      console.log(cid)
      const result = await client.get(cid);
      
      console.log("Result", result);
      // Transform data: convert Buffer to string
      const responseData = {
        cid: result.cid,
        message: result.message || '',
        children: result.children || [],
        // If Buffer, convert to string, otherwise use as is
        data: result.data ? 
          (Buffer.isBuffer(result.data) ? 
            Buffer.from(result.data).toString('utf8') : 
            result.data) : 
          null
      };
      
      return res.status(200).json(responseData);
    } catch (error) {
      console.error('Get node error:', error);
      return res.status(404).json({ error: `Failed to get node with CID ${cid}: ${error.message}` });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}