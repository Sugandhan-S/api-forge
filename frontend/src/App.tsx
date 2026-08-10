import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeMouseHandler,
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

import { useMockServer } from './hooks/useMockServer';
import { useAuth } from './hooks/useAuth';
import { useProject } from './hooks/useProject';

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

  /* Phase 6 — Auth & Persistence */
  const auth = useAuth();
  const project = useProject(auth.user, auth.loading);

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
        saveStatus={project.saveStatus}
        onSaveProject={project.saveProject}
        isAuthenticated={!!auth.user}
        isGuest={auth.isGuest}
        userName={auth.user?.user_metadata?.full_name || auth.user?.email}
        projectTitle={project.isHydrating || auth.loading ? '' : projectTitle}
        onProjectTitleChange={setProjectTitle}
        onSignOut={auth.signOut}
      />

      {/* ── Canvas Area ── */}
      <div className="flex-1 relative overflow-hidden">
        {project.isHydrating || auth.loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0b0f] z-50">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 rounded-full border-4 border-[#1e2030] border-t-[#6c63ff] animate-spin" />
              <div className="text-[#8e94a8] text-sm font-medium">Loading canvas...</div>
            </div>
          </div>
        ) : (
          <>
            <Toolbar />

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
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

            {/* Inspector Panel */}
            <InspectorPanel />
          </>
        )}
      </div>

      {/* ── Modals & Panels ── */}

      {/* OpenAPI Spec Viewer */}
      <SpecViewer
        isOpen={isSpecViewerOpen}
        onClose={() => setIsSpecViewerOpen(false)}
      />

      {/* Mock Server Panel */}
      {isMockPanelOpen && (
        <MockPanel
          isOpen={isMockPanelOpen}
          onClose={() => setIsMockPanelOpen(false)}
        />
      )}

      {/* AI Panel */}
      {isAIPanelOpen && (
        <AIPanel
          isOpen={isAIPanelOpen}
          onClose={() => setIsAIPanelOpen(false)}
        />
      )}

      {/* Export Panel */}
      {isExportPanelOpen && (
        <ExportPanel
          isOpen={isExportPanelOpen}
          onClose={() => setIsExportPanelOpen(false)}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

