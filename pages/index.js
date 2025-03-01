import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import styles from '../styles/AINDAGVisualizer.module.css';

export default function Home() {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [address, setAddress] = useState('localhost:50051');
  const [fetchingCid, setFetchingCid] = useState('');
  const [dataInput, setDataInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // API 연결 초기화 함수
  const initializeClient = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // API 호출을 통해 gRPC 클라이언트 초기화
      const response = await fetch('/api/dag/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect');
      }
      
      setIsConnected(true);
      setLoading(false);
    } catch (err) {
      setError(`Failed to connect: ${err.message}`);
      setLoading(false);
    }
  };

  // CID로 노드 가져오기
  const fetchNodeByCid = async () => {
    if (!isConnected) {
      setError('클라이언트가 연결되지 않았습니다. 먼저 Connect 버튼을 클릭하세요.');
      return;
    }
    
    if (!fetchingCid.trim()) {
      setError('CID를 입력해주세요');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // 이미 노드가 있는지 확인
      if (!nodes.some(n => n.cid === fetchingCid)) {
        const queue = [ {parent: null, cid: fetchingCid} ];
        while (queue.length > 0) {
          const edge = queue.shift();
          try {
            const nodeResponse = await fetch(`/api/dag/get?cid=${edge.cid}`);
            const nodeResult = await nodeResponse.json();
            
            if (nodeResult && !nodes.some(n => n.cid === nodeResult.cid)) {
              const node = {
                id: nodeResult.cid,
                cid: nodeResult.cid,
                message: nodeResult.message || `Child of ${childResult.cid.substring(0, 6)}`,
                type: 'message',
                children: nodeResult.children || [],
                data: nodeResult.data
              };
              
              setNodes(prevNodes => [...prevNodes, node]);
              if (edge.parent) {
                setLinks(prevLinks => [...prevLinks, { source: edge.parent, target: node.id }]);
              }
              // 자식 노드들도 큐에 추가
              node.children.map(childCid => 
                queue.push({parent: node.id, cid: childCid}));
            }
          } catch (childErr) {
            console.error(`Failed to fetch child node ${edge.cid}:`, childErr);
          }
        }
      }
      
      setLoading(false);
      setFetchingCid('');
    } catch (err) {
      setError(`노드를 가져오는데 실패했습니다: ${err.message}`);
      setLoading(false);
    }
  };

  // 새 프롬프트 노드 추가
  const addNode = async () => {
    if (!isConnected) {
      setError('클라이언트가 연결되지 않았습니다. 먼저 Connect 버튼을 클릭하세요.');
      return;
    }
    
    if (!dataInput.trim()) {
      setError('프롬프트를 입력해주세요');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // API를 통해 노드 추가
      const contentForApi = {
        message: dataInput,
        children: []
      };
      
      // 선택된 부모 노드가 있으면 부모 정보 추가
      if (selectedNode && selectedNode.id) {
        contentForApi.children.push(selectedNode.cid);
      }
      
      // API 호출로 노드 추가
      const response = await fetch('/api/dag/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contentForApi),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add node');
      }
      
      const result = await response.json();
      
      const newNode = {
        id: result.cid,
        cid: result.cid,
        message: contentForApi.message,
        data: contentForApi.data,
        type: 'message',
        children: []
      };

      if (selectedNode) {
        newNode.children.push(selectedNode.id);
      }
      
      setNodes(prevNodes => [...prevNodes, newNode]);
      
      // Connect Children node
      if (selectedNode) {
        setLinks(prevLinks => [
          ...prevLinks, 
          { source: newNode.id, target: selectedNode.id }
        ]);
      }
      
      setLoading(false);
      setDataInput('');
    } catch (err) {
      setError(`노드 추가에 실패했습니다: ${err.message}`);
      setLoading(false);
    }
  };

  // D3 시각화 초기화
  useEffect(() => {
    if (nodes.length === 0 || typeof window === 'undefined') return;

    // D3 시각화 설정
    const width = 800;
    const height = 600;
    
    // 이전 SVG 제거
    d3.select("#dag-container svg").remove();
    
    const svg = d3.select("#dag-container")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");
    
    // 데이터 준비
    const nodeData = nodes.map(node => ({ ...node }));
    const linkData = links.map(link => ({ ...link }));
    
    const simulation = d3.forceSimulation(nodeData)
      .force("link", d3.forceLink(linkData).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2));
    
    // 화살표 마커 정의
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#999")
      .attr("d", "M0,-5L10,0L0,5");
    
    // 링크 그리기
    const link = svg.append("g")
      .selectAll("line")
      .data(linkData)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");
    
    // 노드 그룹 생성
    const node = svg.append("g")
      .selectAll(".node")
      .data(nodeData)
      .join("g")
      .attr("class", "node")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("click", (event, d) => {
        setSelectedNode(d);
        event.stopPropagation();
      });
    
    // 노드 원 그리기
    node.append("circle")
      .attr("r", 20)
      .attr("fill", d => d.type === 'message' ? "#66ccff" : "#ff9966")
      .attr("stroke", d => d.id === (selectedNode?.id || '') ? "#ff0000" : "#fff")
      .attr("stroke-width", d => d.id === (selectedNode?.id || '') ? 2 : 1);
    
    // 노드 라벨
    node.append("text")
      .attr("dx", 25)
      .attr("dy", 4)
      .text(d => {
        const text = d.message || d.cid;
        return text.length > 20 ? text.substring(0, 17) + '...' : text;
      });
    
    // 시뮬레이션 틱 이벤트 핸들러
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node.attr("transform", d => `translate(${d.x}, ${d.y})`);
    });
    
    // 드래그 이벤트 핸들러
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    // 캔버스 클릭 시 선택 노드 지우기
    svg.on("click", () => {
      setSelectedNode(null);
    });
    
    return () => {
      simulation.stop();
    };
  }, [nodes, links, selectedNode]);

  // 프롬프트 JSON 파싱
  const parseData = (data) => {
    try {
      if (typeof data === 'string') {
        return JSON.parse(data);
      } else if (data && typeof data === 'object') {
        return data;
      }
      return null;
    } catch (err) {
      console.error('Failed to parse  data:', err);
      return null;
    }
  };

  // 선택된 노드 삭제
  const deleteSelectedNode = async () => {
    if (!selectedNode) return;
    
    setLoading(true);
    
    try {
      // API를 통해 노드 삭제
      const response = await fetch(`/api/dag/delete?cid=${selectedNode.cid}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete node');
      }
      
      // 노드 삭제
      setNodes(prevNodes => prevNodes.filter(node => node.id !== selectedNode.id));
      
      // 관련 링크 삭제
      setLinks(prevLinks => prevLinks.filter(link => 
        link.source.id !== selectedNode.id && link.target.id !== selectedNode.id
      ));
      
      // 부모 노드의 children 배열에서 삭제
      setNodes(prevNodes => prevNodes.map(node => {
        if (node.children && node.children.includes(selectedNode.id)) {
          return {
            ...node,
            children: node.children.filter(childId => childId !== selectedNode.id)
          };
        }
        return node;
      }));
      
      setSelectedNode(null);
      setLoading(false);
    } catch (err) {
      setError(`노드 삭제에 실패했습니다: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className={styles.ainContainer}>
      <h1 className={styles.ainTitle}>AIN Merkle DAG Visualizer</h1>
      
      <div className={styles.ainGridContainer}>
        <div>
          <label className={styles.ainLabel}>Server Address</label>
          <div className={styles.ainInputGroup}>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={styles.ainInput}
              placeholder="localhost:50051"
            />
            <button
              onClick={initializeClient}
              className={`${styles.ainButton} ${isConnected ? styles.ainButtonGreen : styles.ainButtonBlue}`}
              disabled={loading}
            >
              {isConnected ? 'Connected' : 'Connect'}
            </button>
          </div>
        </div>
        
        <div>
          <label className={styles.ainLabel}>Fetch Node by CID</label>
          <div className={styles.ainInputGroup}>
            <input
              type="text"
              value={fetchingCid}
              onChange={(e) => setFetchingCid(e.target.value)}
              className={styles.ainInput}
              placeholder="Enter CID"
              disabled={!isConnected || loading}
            />
            <button
              onClick={fetchNodeByCid}
              className={`${styles.ainButton} ${styles.ainButtonBlue}`}
              disabled={!isConnected || loading}
            >
              Fetch
            </button>
          </div>
        </div>
      </div>
      
      <div className={styles.ainFormGroup}>
        <label className={styles.ainLabel}>Add New Node</label>
        <div className={styles.ainInputGroup}>
          <input
            type="text"
            value={dataInput}
            onChange={(e) => setDataInput(e.target.value)}
            className={styles.ainInput}
            placeholder="Enter  text"
            disabled={!isConnected || loading}
          />
          <button
            onClick={addNode}
            className={`${styles.ainButton} ${styles.ainButtonPurple}`}
            disabled={!isConnected || loading}
          >
            Add 
          </button>
        </div>
      </div>
      
      {error && (
        <div className={styles.ainErrorBox}>
          {error}
        </div>
      )}
      
      <div className={styles.ainFlexContainer}>
        <div className={styles.ainCard}>
          <div id="dag-container" className={styles.ainDagContainer}>
            {loading && (
              <div className={styles.ainLoadingOverlay}>
                <div className={styles.ainLoadingText}>Loading...</div>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.ainSidePanel}>
          <h2 className={styles.ainSectionTitle}>Node Details</h2>
          
          {selectedNode ? (
            <div>
              <div className={styles.ainNodeDetail}>
                <span className={styles.ainDetailLabel}>ID:</span> {selectedNode.id}
              </div>
              <div className={styles.ainNodeDetail}>
                <span className={styles.ainDetailLabel}>CID:</span> {selectedNode.cid}
              </div>
              <div className={styles.ainNodeDetail}>
                <span className={styles.ainDetailLabel}>Message:</span> {selectedNode.message}
              </div>
              
              {selectedNode.data && (
                <div className={styles.ainNodeDetail}>
                  <span className={styles.ainDetailLabel}>Data:</span>
                  <div className={styles.ainDataBox}>
                    {(() => {
                      const data = parseData(selectedNode.data);
                      if (data && data.messages) {
                        return data.messages.find(m => m.role === 'user')?.content || 'No data content';
                      }
                      return 'Invalid data format';
                    })()}
                  </div>
                </div>
              )}
              
              <div className={styles.ainNodeDetail}>
                <span className={styles.ainDetailLabel}>Children:</span> {selectedNode.children?.length || 0}
              </div>
              
              <div className={styles.ainButtonGroup}>
                <button
                  onClick={deleteSelectedNode}
                  className={`${styles.ainButton} ${styles.ainButtonRed} ${styles.ainButtonFull}`}
                  disabled={loading}
                >
                  Delete Node
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.ainNoSelectionText}>Select a node to view details</div>
          )}
          
          <div className={styles.ainStatsSection}>
            <h2 className={styles.ainSectionTitle}>DAG Statistics</h2>
            <div className={styles.ainStatItem}>Total Nodes: {nodes.length}</div>
            <div className={styles.ainStatItem}>Total Links: {links.length}</div>
            <div className={styles.ainStatItem}>Leaf Nodes: {nodes.filter(n => !n.children || n.children.length === 0).length}</div>
            <div className={styles.ainStatItem}>Connected Components: {
              // 매우 단순한 연결 요소 계산, 실제로는 더 복잡한 그래프 알고리즘 필요
              nodes.length > 0 ? '1' : '0'
            }</div>
          </div>
        </div>
      </div>
    </div>
  );
}