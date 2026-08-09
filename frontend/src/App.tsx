import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeMouseHandler,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './index.css';

import { nodeTypes } from './nodes';
import { useCanvasStore } from './stores/canvasStore';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { InspectorPanel } from './inspector/InspectorPanel';
import { SpecViewer } from './components/SpecViewer';
import { MockPanel } from './components/MockPanel';
import { AIPanel } from './components/AIPanel';
import { ExportPanel } from './components/ExportPanel';
import { AuthModal } from './components/AuthModal';
import { CollabCursors } from './components/CollabCursors';

import { useMockServer } from './hooks/useMockServer';
import { useCollaboration } from './hooks/useCollaboration';
import { useAuth } from './hooks/useAuth';
import { useProject } from './hooks/useProject';

/* ─── PROJECT_ID: in Phase 6+ this would come from URL params / Supabase ─── */
const PROJECT_ID = 'default-project';

/* ─── Inner Canvas component (needs ReactFlow context for cursor conversion) ─── */
function CanvasWithCursors({
  peers,
  onMouseMove,
}: {
  peers: ReturnType<typeof useCollaboration>['peers'];
  onMouseMove: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="absolute inset-0" onMouseMove={onMouseMove}>
      <CollabCursors peers={peers} />
    </div>
  );
}

/* ─── Main App ─── */

export default function App() {
  const {
    nodes,
    edges,
    selectedNodeId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
    projectTitle,
    setProjectTitle,
  } = useCanvasStore();

  /* Panel open states */
  const [isSpecViewerOpen, setIsSpecViewerOpen] = useState(false);
  const [isMockPanelOpen, setIsMockPanelOpen] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  /* Phase 4 — Mock Server */
  const mockServer = useMockServer();
  const isMockRunning = mockServer.status === 'running';

  /* Phase 5 — Real-time Collaboration */
  const { peers, myColor, myName, broadcastCursor, broadcastNodeMove } = useCollaboration(PROJECT_ID);

  /* Phase 6 — Auth & Persistence */
  const auth = useAuth();
  const project = useProject(auth.user);

  /* Auto-open auth modal if not authenticated and not guest */
  useEffect(() => {
    if (!auth.loading && !auth.user && !auth.isGuest) {
      setIsAuthModalOpen(true);
    }
  }, [auth.loading, auth.user, auth.isGuest]);

  /* Node interactions */
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  /* Broadcast node move on drag stop */
  const onNodeDragStop: NodeMouseHandler = useCallback(
    (_event, node) => {
      broadcastNodeMove(node.id, node.position);
    },
    [broadcastNodeMove]
  );

  /* Mouse move → broadcast cursor in canvas coords */
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Simple screen coordinate broadcast — server will relay to peers
      // For precise canvas coords we'd use useReactFlow().screenToFlowPosition()
      // but that requires being inside the ReactFlow context
      broadcastCursor(e.clientX, e.clientY);
    },
    [broadcastCursor]
  );

  const isInspectorOpen = selectedNodeId !== null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0b0f] overflow-hidden">
      {/* ── TopBar: all phases integrated ── */}
      <TopBar
        onGenerateSpec={() => setIsSpecViewerOpen(true)}
        onOpenMockPanel={() => setIsMockPanelOpen(true)}
        onOpenAIPanel={() => setIsAIPanelOpen(true)}
        onOpenExportPanel={() => setIsExportPanelOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        isMockRunning={isMockRunning}
        peers={peers}
        myColor={myColor}
        saveStatus={project.saveStatus}
        isAuthenticated={!!auth.user}
        isGuest={auth.isGuest}
        userName={auth.user?.user_metadata?.full_name || auth.user?.email || myName}
        projectTitle={projectTitle}
        onProjectTitleChange={setProjectTitle}
        onSignOut={auth.signOut}
      />

      {/* ── Canvas Area ── */}
      <div className="flex-1 relative overflow-hidden" onMouseMove={handleCanvasMouseMove}>
        <Toolbar />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: '#6c63ff', strokeWidth: 2 },
          }}
          proOptions={{ hideAttribution: true }}
          className="!bg-[#0a0b0f]"
          style={{
            transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            width: isInspectorOpen ? 'calc(100% - 360px)' : '100%',
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#1e2030"
          />
          <Controls
            showInteractive={false}
            className="!border-[#1e2030] !rounded-xl !overflow-hidden !shadow-2xl"
          />
          <MiniMap
            nodeStrokeColor="#2a2d45"
            nodeColor="#1a1b25"
            nodeBorderRadius={8}
            maskColor="rgba(10, 11, 15, 0.8)"
            className="!bg-[#12131a] !border-[#1e2030] !rounded-xl"
          />
        </ReactFlow>

        {/* Peer cursors overlay */}
        {peers.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <CollabCursors peers={peers} />
          </div>
        )}

        {/* Inspector Panel (Phase 2) */}
        <InspectorPanel />
      </div>

      {/* ── Modals & Panels ── */}

      {/* Phase 3: OpenAPI Spec Viewer */}
      <SpecViewer
        isOpen={isSpecViewerOpen}
        onClose={() => setIsSpecViewerOpen(false)}
      />

      {/* Phase 4: Mock Server Panel */}
      {isMockPanelOpen && (
        <MockPanel
          isOpen={isMockPanelOpen}
          onClose={() => setIsMockPanelOpen(false)}
        />
      )}

      {/* Phase 7: AI Panel */}
      {isAIPanelOpen && (
        <AIPanel
          isOpen={isAIPanelOpen}
          onClose={() => setIsAIPanelOpen(false)}
        />
      )}

      {/* Phase 8: Export Panel */}
      {isExportPanelOpen && (
        <ExportPanel
          isOpen={isExportPanelOpen}
          onClose={() => setIsExportPanelOpen(false)}
        />
      )}

      {/* Phase 6: Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
