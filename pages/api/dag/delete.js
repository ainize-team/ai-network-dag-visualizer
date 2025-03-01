import { getClient } from './client';

// 서버 세션 정보 저장 (실제 프로덕션에서는 데이터베이스나 Redis 등을 사용)
let serverAddress = 'localhost:50051'; // 기본값 설정

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
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
      // 먼저 노드를 가져와서 자식 노드가 있는지 확인
      const node = await client.get(cid);
      
      // 삭제 전 노드의 부모 노드에서 자식 관계 제거 (이 기능은 실제 환경에 맞게 구현 필요)
      // 여기서는 모의 구현으로 pass
      
      // 노드 삭제
      await client.delete(cid);
      
      // 성공적으로 삭제됨
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