import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import { useRouter } from 'next/router';
import styles from '../styles/AINDAGVisualizer.module.css';

export default function Home() {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState([]); // Change to array
  const [fetchingCid, setFetchingCid] = useState('');
  const [dataInput, setDataInput] = useState('');
  const [isConnected, setIsConnected] = useState(true); // Set initial state to true
  const router = useRouter();

  // Initialize API connection
  const initializeClient = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Initialize gRPC client via API call
      const response = await fetch('/api/dag/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: 'localhost:50051' }),
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

  useEffect(() => {
    initializeClient(); // Call initializeClient on component mount
  }, []);

  useEffect(() => {
    if (router.query.cid) {
      setFetchingCid(router.query.cid);
      fetchNodeByCid(router.query.cid);
    }
  }, [router.query.cid]);

  // Fetch node by CID
  const fetchNodeByCid = async (cid) => {
    if (!isConnected) {
      setError('Client is not connected. Click the Connect button first.');
      return;
    }
    
    if (!cid.trim()) {
      setError('Please enter a CID');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Check if the node already exists
      if (!nodes.some(n => n.cid === cid)) {
        const queue = [ {parent: null, cid} ];
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
              // Add child nodes to the queue
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
      setError(`Failed to fetch node: ${err.message}`);
      setLoading(false);
    }
  };

  // Add new prompt node
  const addNode = async () => {
    if (!isConnected) {
      setError('Client is not connected. Click the Connect button first.');
      return;
    }
    
    if (!dataInput.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Add node via API
      const contentForApi = {
        message: dataInput,
        children: []
      };
      
      // Add parent information if parent nodes are selected
      selectedNodes.forEach(node => {
        contentForApi.children.push(node.cid);
      });
      
      // Add node via API call
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

      selectedNodes.forEach(node => {
        newNode.children.push(node.id);
      });
      
      setNodes(prevNodes => [...prevNodes, newNode]);
      
      // Connect Children node
      selectedNodes.forEach(node => {
        setLinks(prevLinks => [
          ...prevLinks, 
          { source: newNode.id, target: node.id }
        ]);
      });
      
      setLoading(false);
      setDataInput('');
    } catch (err) {
      setError(`Failed to add node: ${err.message}`);
      setLoading(false);
    }
  };

  // Initialize D3 visualization
  useEffect(() => {
    if (nodes.length === 0 || typeof window === 'undefined') return;

    // D3 visualization setup
    const width = 800;
    const height = 600;
    
    // Remove previous SVG
    d3.select("#dag-container svg").remove();
    
    const svg = d3.select("#dag-container")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");
    
    // Prepare data
    const nodeData = nodes.map(node => ({ ...node }));
    const linkData = links.map(link => ({ ...link }));
    
    const simulation = d3.forceSimulation(nodeData)
      .force("link", d3.forceLink(linkData).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX().strength(0.1).x(d => Math.max(0, Math.min(800, d.x))))
      .force("y", d3.forceY().strength(0.1).y(d => Math.max(0, Math.min(600, d.y))));
    
    // Define arrow marker
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
    
    // Draw links
    const link = svg.append("g")
      .selectAll("line")
      .data(linkData)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");
    
    // Create node group
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
        // Toggle node selection
        setSelectedNodes(prevSelectedNodes => {
          if (prevSelectedNodes.some(node => node.id === d.id)) {
            return prevSelectedNodes.filter(node => node.id !== d.id);
          } else {
            return [...prevSelectedNodes, d];
          }
        });
        event.stopPropagation();
      });
    
    // Draw node circles
    node.append("circle")
      .attr("r", 20)
      .attr("fill", d => d.type === 'message' ? "#66ccff" : "#ff9966")
      .attr("stroke", d => selectedNodes.some(node => node.id === d.id) ? "#ff0000" : "#fff")
      .attr("stroke-width", d => selectedNodes.some(node => node.id === d.id) ? 2 : 1);
    
    // Node labels
    node.append("text")
      .attr("dx", 25)
      .attr("dy", 4)
      .text(d => {
        const text = d.message || d.cid;
        return text.length > 20 ? text.substring(0, 17) + '...' : text;
      });
    
    // Simulation tick event handler
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node.attr("transform", d => `translate(${d.x}, ${d.y})`);
    });
    
    // Drag event handlers
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
    
    // Clear selected nodes on canvas click
    svg.on("click", () => {
      setSelectedNodes([]);
    });
    
    return () => {
      simulation.stop();
    };
  }, [nodes, links, selectedNodes]);

  // Parse prompt JSON
  const parseData = (data) => {
    try {
      if (typeof data === 'string') {
        return JSON.parse(data);
      } else if (data && typeof data === 'object') {
        return data;
      }
      return null;
    } catch (err) {
      console.error('Failed to parse data:', err);
      return null;
    }
  };

  // Delete selected nodes
  const deleteSelectedNodes = async () => {
    if (selectedNodes.length === 0) return;
    
    setLoading(true);
    
    try {
      for (const selectedNode of selectedNodes) {
        // Delete node via API
        const response = await fetch(`/api/dag/delete?cid=${selectedNode.cid}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete node');
        }
        
        // Delete node
        setNodes(prevNodes => prevNodes.filter(node => node.id !== selectedNode.id));
        
        // Delete related links
        setLinks(prevLinks => prevLinks.filter(link => 
          link.source.id !== selectedNode.id && link.target.id !== selectedNode.id
        ));
        
        // Remove from parent node's children array
        setNodes(prevNodes => prevNodes.map(node => {
          if (node.children && node.children.includes(selectedNode.id)) {
            return {
              ...node,
              children: node.children.filter(childId => childId !== selectedNode.id)
            };
          }
          return node;
        }));
      }
      
      setSelectedNodes([]);
      setLoading(false);
    } catch (err) {
      setError(`Failed to delete nodes: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className={styles.ainContainer}>
      <h1 className={styles.ainTitle}>AIN Merkle DAG Visualizer</h1>
      
      <div className={styles.ainGridContainer}>
        <div className={styles.ainInputGroupRow}>
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
                onClick={() => {
                  router.push({
                    pathname: '/',
                    query: { cid: fetchingCid }
                  });
                }}
                className={`${styles.ainButton} ${styles.ainButtonBlue}`}
                disabled={!isConnected || loading}
              >
                Fetch
              </button>
            </div>
          </div>
          
          <div>
            <label className={styles.ainLabel}>Add New Node</label>
            <div className={styles.ainInputGroup}>
              <input
                type="text"
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
                className={styles.ainInput}
                placeholder="Enter text"
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
          
          {selectedNodes.length > 0 ? (
            <div>
              {selectedNodes.map(selectedNode => (
                <div key={selectedNode.id}>
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
                </div>
              ))}
              
              <div className={styles.ainButtonGroup}>
                <button
                  onClick={deleteSelectedNodes}
                  className={`${styles.ainButton} ${styles.ainButtonRed} ${styles.ainButtonFull}`}
                  disabled={loading}
                >
                  Delete Nodes
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.ainNoSelectionText}>Select nodes to view details</div>
          )}
          
          <div className={styles.ainStatsSection}>
            <h2 className={styles.ainSectionTitle}>DAG Statistics</h2>
            <div className={styles.ainStatItem}>Total Nodes: {nodes.length}</div>
            <div className={styles.ainStatItem}>Total Links: {links.length}</div>
            <div className={styles.ainStatItem}>Leaf Nodes: {nodes.filter(n => !n.children || n.children.length === 0).length}</div>
            <div className={styles.ainStatItem}>Connected Components: {
              // Very simple connected component calculation, more complex graph algorithms needed in reality
              nodes.length > 0 ? '1' : '0'
            }</div>
          </div>
        </div>
      </div>
    </div>
  );
}