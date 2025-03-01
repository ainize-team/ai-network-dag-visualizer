// API 서버에서만 실행되는 gRPC 클라이언트
// Next.js API 라우트에서 import하여 사용

import AINetworkDAGClient from 'ai-network-dag-client';

// 싱글톤 인스턴스를 위한 클로저
let instance = null;
let clientAddress = null;

/**
 * AINetworkDAGClient의 싱글톤 인스턴스를 가져오거나 생성합니다.
 * @param {string} address gRPC 서버 주소
 * @returns {Object} 프로미스로 래핑된 gRPC 클라이언트 메서드
 */
export function getDAGClient(address) {
  // 주소가 변경되었거나 인스턴스가 없는 경우 새로 생성
  if (!instance || address !== clientAddress) {
    instance = new AINetworkDAGClient(address);
    clientAddress = address;
  }
  
  return instance;
}

/**
 * 모의 클라이언트를 생성합니다. 개발 환경이나 실제 gRPC 서버가 없는 경우 사용
 * @returns {Object} 모의 gRPC 클라이언트 메서드
 */
export function getMockDAGClient() {
  // 모의 데이터 저장소
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

// API 경로에서 사용할 클라이언트 설정
// 개발 환경에서는 모의 클라이언트 사용 (필요에 따라 수정)
export const getClient = (address) => {
  if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_CLIENT === 'true') {
    return getMockDAGClient();
  }
  return getDAGClient(address);
};

export default getClient;