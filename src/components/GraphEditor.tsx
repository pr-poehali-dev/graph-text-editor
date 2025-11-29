import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

export type NodeType = {
  id: string;
  text: string;
  x: number;
  y: number;
};

export type EdgeType = {
  id: string;
  from: string;
  to: string;
  type: 'primary' | 'alias';
};

const GraphEditor = () => {
  const [nodes, setNodes] = useState<NodeType[]>([
    { id: '1', text: 'Начальная идея', x: 200, y: 150 },
    { id: '2', text: 'Развитие концепции', x: 450, y: 150 },
    { id: '3', text: 'Альтернативный подход', x: 325, y: 300 },
  ]);

  const [edges, setEdges] = useState<EdgeType[]>([
    { id: 'e1', from: '1', to: '2', type: 'primary' },
    { id: 'e2', from: '2', to: '3', type: 'alias' },
  ]);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const addNode = () => {
    const newNode: NodeType = {
      id: Date.now().toString(),
      text: 'Новый узел',
      x: 300 + Math.random() * 100,
      y: 200 + Math.random() * 100,
    };
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode.id);
    setEditingNode(newNode.id);
    toast.success('Узел создан');
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    setEdges(edges.filter(e => e.from !== id && e.to !== id));
    setSelectedNode(null);
    setEditingNode(null);
    toast.success('Узел удалён');
  };

  const updateNodeText = (id: string, text: string) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, text } : n));
  };

  const addEdge = (type: 'primary' | 'alias') => {
    if (!selectedNode) return;
    
    const otherNodes = nodes.filter(n => n.id !== selectedNode);
    if (otherNodes.length === 0) {
      toast.error('Нужен ещё один узел для создания связи');
      return;
    }

    const targetNode = otherNodes[0];
    const newEdge: EdgeType = {
      id: Date.now().toString(),
      from: selectedNode,
      to: targetNode.id,
      type,
    };
    setEdges([...edges, newEdge]);
    toast.success(`Связь ${type === 'primary' ? 'основная' : 'псевдоним'} создана`);
  };

  const deleteEdge = (id: string) => {
    setEdges(edges.filter(e => e.id !== id));
    toast.success('Связь удалена');
  };

  const filteredNodes = nodes.filter(node =>
    node.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEdges = searchQuery 
    ? edges.filter(edge => 
        filteredNodes.some(n => n.id === edge.from) && 
        filteredNodes.some(n => n.id === edge.to)
      )
    : edges;

  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const clientX = e.clientX || (e as any).touches?.[0]?.clientX || 0;
    const clientY = e.clientY || (e as any).touches?.[0]?.clientY || 0;

    const currentTime = new Date().getTime();
    const tapGap = currentTime - lastTap;

    if (tapGap < 300 && tapGap > 0) {
      setEditingNode(nodeId);
      setLastTap(0);
      return;
    }
    setLastTap(currentTime);

    setDragNode(nodeId);
    setSelectedNode(nodeId);
    if (isMobile) setShowSidebar(true);
    setDragOffset({
      x: (clientX - pan.x) / zoom - node.x,
      y: (clientY - pan.y) / zoom - node.y,
    });
    e.stopPropagation();
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.graph-node')) return;
    
    const clientX = e.clientX || (e as any).touches?.[0]?.clientX || 0;
    const clientY = e.clientY || (e as any).touches?.[0]?.clientY || 0;

    setIsPanning(true);
    setPanStart({ x: clientX - pan.x, y: clientY - pan.y });
    setSelectedNode(null);
    if (isMobile) setShowSidebar(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const clientX = e.clientX || (e as any).touches?.[0]?.clientX || 0;
    const clientY = e.clientY || (e as any).touches?.[0]?.clientY || 0;

    if (dragNode) {
      const newX = (clientX - pan.x) / zoom - dragOffset.x;
      const newY = (clientY - pan.y) / zoom - dragOffset.y;
      setNodes(nodes.map(n => n.id === dragNode ? { ...n, x: newX, y: newY } : n));
    } else if (isPanning) {
      setPan({
        x: clientX - panStart.x,
        y: clientY - panStart.y,
      });
    }
  };

  const handlePointerUp = () => {
    setDragNode(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 2));
  };

  const selectedNodeData = nodes.find(n => n.id === selectedNode);
  const selectedNodeEdges = edges.filter(e => e.from === selectedNode || e.to === selectedNode);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-card px-3 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Icon name="Network" size={20} className="text-primary flex-shrink-0 md:w-6 md:h-6" />
          <h1 className="text-base md:text-xl font-semibold truncate">Графовый редактор</h1>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <Button onClick={addNode} size="sm" className="h-8 md:h-9">
            <Icon name="Plus" size={16} />
            <span className="hidden sm:inline ml-2">Узел</span>
          </Button>
          {selectedNode && isMobile && (
            <Button 
              onClick={() => setShowSidebar(!showSidebar)} 
              size="sm" 
              variant="outline"
              className="h-8 md:h-9"
            >
              <Icon name="Edit" size={16} />
            </Button>
          )}
        </div>
      </header>

      <div className="px-3 md:px-6 py-2 border-b">
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden touch-none select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        >
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <defs>
              <marker
                id="arrowhead-primary"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#9b87f5" />
              </marker>
              <marker
                id="arrowhead-alias"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
              </marker>
            </defs>
            {filteredEdges.map((edge) => {
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              return (
                <line
                  key={edge.id}
                  x1={fromNode.x + 75}
                  y1={fromNode.y + 40}
                  x2={toNode.x + 75}
                  y2={toNode.y + 40}
                  stroke={edge.type === 'primary' ? '#9b87f5' : '#6b7280'}
                  strokeWidth="2"
                  markerEnd={`url(#arrowhead-${edge.type})`}
                  className="pointer-events-auto cursor-pointer hover:stroke-[3]"
                  onClick={() => deleteEdge(edge.id)}
                />
              );
            })}
          </svg>

          <div
            className="absolute inset-0"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            {filteredNodes.map((node) => (
              <Card
                key={node.id}
                className={`graph-node absolute w-[140px] md:w-[150px] p-2 md:p-3 touch-none transition-all ${
                  selectedNode === node.id ? 'ring-2 ring-primary shadow-lg' : 'active:shadow-md'
                }`}
                style={{ left: node.x, top: node.y, cursor: 'grab' }}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              >
                {editingNode === node.id ? (
                  <Textarea
                    value={node.text}
                    onChange={(e) => updateNodeText(node.id, e.target.value)}
                    onBlur={() => setEditingNode(null)}
                    autoFocus
                    className="min-h-[50px] md:min-h-[60px] text-xs md:text-sm resize-none"
                  />
                ) : (
                  <p className="text-xs md:text-sm min-h-[50px] md:min-h-[60px] break-words">
                    {node.text}
                  </p>
                )}
              </Card>
            ))}
          </div>

          <div className="absolute bottom-3 md:bottom-4 right-3 md:right-4 flex gap-1 md:gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setZoom(prev => Math.min(prev + 0.2, 2))}
              className="h-9 w-9 md:h-10 md:w-10 shadow-lg"
            >
              <Icon name="ZoomIn" size={18} />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
              className="h-9 w-9 md:h-10 md:w-10 shadow-lg"
            >
              <Icon name="ZoomOut" size={18} />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="h-9 w-9 md:h-10 md:w-10 shadow-lg"
            >
              <Icon name="Maximize2" size={18} />
            </Button>
          </div>
        </div>

        {selectedNodeData && (
          <aside className={`
            ${isMobile ? 'fixed inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl shadow-2xl' : 'w-80 border-l'}
            ${isMobile && !showSidebar ? 'hidden' : 'block'}
            bg-card p-4 md:p-6 overflow-y-auto z-50
          `}>
            {isMobile && (
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
            )}
            <div className="space-y-4 md:space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="font-semibold text-sm md:text-base">Редактирование узла</h3>
                  <div className="flex gap-1">
                    {isMobile && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowSidebar(false)}
                        className="h-8 w-8"
                      >
                        <Icon name="X" size={18} />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteNode(selectedNode!)}
                      className="h-8 w-8"
                    >
                      <Icon name="Trash2" size={18} />
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={selectedNodeData.text}
                  onChange={(e) => updateNodeText(selectedNode!, e.target.value)}
                  className="min-h-[100px] md:min-h-[120px] text-sm"
                  placeholder="Введите текст узла..."
                />
              </div>

              <div>
                <h3 className="font-semibold mb-2 md:mb-3 text-sm md:text-base">Создать связь</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => addEdge('primary')}
                    variant="default"
                    size="sm"
                    className="flex-1 h-9 text-xs md:text-sm"
                  >
                    <Icon name="ArrowRight" size={14} className="mr-1 md:mr-2" />
                    Основная
                  </Button>
                  <Button
                    onClick={() => addEdge('alias')}
                    variant="secondary"
                    size="sm"
                    className="flex-1 h-9 text-xs md:text-sm"
                  >
                    <Icon name="Link" size={14} className="mr-1 md:mr-2" />
                    Псевдоним
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 md:mb-3 text-sm md:text-base">Связи узла</h3>
                {selectedNodeEdges.length === 0 ? (
                  <p className="text-xs md:text-sm text-muted-foreground">Нет связей</p>
                ) : (
                  <div className="space-y-2">
                    {selectedNodeEdges.map((edge) => {
                      const otherNodeId = edge.from === selectedNode ? edge.to : edge.from;
                      const otherNode = nodes.find(n => n.id === otherNodeId);
                      
                      return (
                        <div
                          key={edge.id}
                          className="flex items-center justify-between p-2 rounded bg-secondary text-xs md:text-sm"
                        >
                          <div className="flex items-center gap-1 md:gap-2 flex-1 min-w-0">
                            <Badge 
                              variant={edge.type === 'primary' ? 'default' : 'secondary'}
                              className="text-[10px] md:text-xs px-1.5 md:px-2"
                            >
                              {edge.type === 'primary' ? 'primary' : 'alias'}
                            </Badge>
                            <Icon 
                              name={edge.from === selectedNode ? "ArrowRight" : "ArrowLeft"} 
                              size={12} 
                              className="flex-shrink-0"
                            />
                            <span className="truncate text-xs">{otherNode?.text}</span>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => deleteEdge(edge.id)}
                          >
                            <Icon name="X" size={12} />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default GraphEditor;