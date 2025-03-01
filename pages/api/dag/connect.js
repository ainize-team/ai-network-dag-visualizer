import { getClient } from './client';

// 서버 세션 정보 저장 (실제 프로덕션에서는 데이터베이스나 Redis 등을 사용)
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

    // 주소 저장
    serverAddress = address;

    // 클라이언트 초기화 시도
    try {
        console.log("here 1")
      const client = getClient(address);
      console.log("here 2")
      // 테스트 연결 (간단한 더미 요청으로 연결 확인)
    //   const result = await client.add({ 
    //     message: 'Connection test', 
    //     // data: 'Test data', 
    //     children: [] 
    //   });
      
    //   console.log("result: " + result)
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