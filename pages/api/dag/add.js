import { getClient } from './client';

// 서버 세션 정보 저장 (실제 프로덕션에서는 데이터베이스나 Redis 등을 사용)
let serverAddress = 'localhost:50051'; // 기본값 설정

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, data, children = [], parentCid } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 클라이언트 가져오기
    const client = getClient(serverAddress);
    
    try {
      // 부모 노드가 있으면 먼저 가져오기
      if (parentCid) {
        try {
          const parentNode = await client.get(parentCid);
          
          // 자식 배열에 없으면 추가할 준비 (실제 추가는 새 노드 생성 후)
          if (!parentNode.children) {
            parentNode.children = [];
          }
        } catch (parentError) {
          console.error('Parent node fetch error:', parentError);
          return res.status(404).json({ error: `Parent node with CID ${parentCid} not found` });
        }
      }
      
      // 노드 콘텐츠 준비
      const content = {
        message,
        // 문자열로 제공된 경우 Buffer로 변환
        data: typeof data === 'string' ? Buffer.from(data) : data,
        children
      };
      
      // 노드 추가
      const result = await client.add(content);
      
      // 부모 노드가 있으면 자식으로 연결
      if (parentCid) {
        try {
          const parentNode = await client.get(parentCid);
          parentNode.children = [...(parentNode.children || []), result.cid];
          
          // 부모 노드 업데이트 (실제 환경에 맞게 구현 필요)
          // 여기서는 모의 구현으로 pass
        } catch (updateError) {
          console.warn('Failed to update parent node:', updateError);
          // 에러를 반환하지는 않고 로그만 남김 (노드 생성은 성공했으므로)
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