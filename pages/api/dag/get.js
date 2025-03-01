import { getClient } from './client';

// 서버 세션 정보 저장 (실제 프로덕션에서는 데이터베이스나 Redis 등을 사용)
let serverAddress = 'localhost:50051'; // 기본값 설정

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cid } = req.query;
    
    if (!cid) {
      return res.status(400).json({ error: 'CID is required' });
    }

    // 클라이언트 가져오기
    const client = getClient(serverAddress);
    
    try {
      // CID로 노드 가져오기
      console.log(cid)
      const result = await client.get(cid);
      
      console.log("Result", result);
      // 데이터 변환: Buffer를 문자열로 변환
      const responseData = {
        cid: result.cid,
        message: result.message || '',
        children: result.children || [],
        // Buffer인 경우 문자열로 변환, 아니면 그대로 사용
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