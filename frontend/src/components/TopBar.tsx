import { useState, useCallback } from 'react';
import {
  Terminal, Zap, Code, Sparkles, Download,
  LogIn, LogOut, User2, Cloud, CloudOff,
  Save, CheckCircle2, Loader2, XCircle,
} from 'lucide-react';
import type { CollabPeer } from '../hooks/useCollaboration';
import type { SaveStatus } from '../hooks/useProject';

interface TopBarProps {
  onGenerateSpec?: () => void;
  onOpenMockPanel?: () => void;
  onOpenAIPanel?: () => void;
  onOpenExportPanel?: () => void;
  onOpenAuthModal?: () => void;
  isMockRunning?: boolean;
  peers?: CollabPeer[];
  myColor?: string;
  saveStatus?: SaveStatus;
  isAuthenticated?: boolean;
  isGuest?: boolean;
  userName?: string;
  projectTitle?: string;
  onProjectTitleChange?: (title: string) => void;
  onSignOut?: () => void;
}

/* ─── Peer Avatar ─── */
function PeerAvatar({ peer }: { peer: CollabPeer }) {
  const initials = peer.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center
                 text-[10px] font-bold text-white ring-2 ring-[#12131a]
                 -ml-2 first:ml-0 cursor-default transition-transform hover:z-10 hover:scale-110"
      style={{ backgroundColor: peer.color }}
      title={`${peer.name} is collaborating`}
    >
      {initials}
    </div>
  );
}

/* ─── Save Status Indicator ─── */
function SaveIndicator({ status }: { status: SaveStatus }) {
  const configs = {
    idle:    { icon: <Cloud className="w-3 h-3" />,                           text: 'Saved',    cls: 'text-[#6e7191] bg-[#1a1b25] border-[#1e2030]' },
    saving:  { icon: <Loader2 className="w-3 h-3 animate-spin" />,            text: 'Saving…',  cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    saved:   { icon: <CheckCircle2 className="w-3 h-3" />,                    text: 'Saved',    cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    error:   { icon: <XCircle className="w-3 h-3" />,                         text: 'Error',    cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
  };
  const cfg = configs[status] || configs.idle;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium ${cfg.cls}`}>
      {cfg.icon}
      {cfg.text}
    </div>
  );
}

export function TopBar({
  onGenerateSpec,
  onOpenMockPanel,
  onOpenAIPanel,
  onOpenExportPanel,
  onOpenAuthModal,
  isMockRunning = false,
  peers = [],
  myColor,
  saveStatus = 'idle',
  isAuthenticated = false,
  isGuest = false,
  userName,
  projectTitle = 'User Service API',
  onProjectTitleChange,
  onSignOut,
}: TopBarProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(projectTitle);

  const handleTitleBlur = useCallback(() => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== projectTitle) {
      onProjectTitleChange?.(titleDraft.trim());
    }
  }, [titleDraft, projectTitle, onProjectTitleChange]);

  const handleTitleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
    if (e.key === 'Escape') { setTitleDraft(projectTitle); setEditingTitle(false); }
  }, [projectTitle]);

  return (
    <header className="h-12 bg-[#12131a]/90 backdrop-blur-xl border-b border-[#1e2030]
                       flex items-center justify-between px-4 z-50 relative shrink-0">
      {/* ── Left: Logo + Collab Presence ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-gradient-to-br from-[#6c63ff] to-[#a78bfa]
                          shadow-[0_0_16px_rgba(108,99,255,0.3)]">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold tracking-tight text-white">APIForge</span>
            <span className="text-[10px] text-[#6e7191] font-medium">v0.4</span>
          </div>
        </div>

        {/* Collab avatars */}
        {peers.length > 0 && (
          <div className="flex items-center pl-1">
            {peers.slice(0, 5).map((p) => <PeerAvatar key={p.socketId} peer={p} />)}
            {peers.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-[#1a1b25] border border-[#1e2030]
                             flex items-center justify-center text-[9px] text-[#6e7191] -ml-2">
                +{peers.length - 5}
              </div>
            )}
            <span className="ml-2 text-[10px] text-[#6e7191]">
              {peers.length} collaborator{peers.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Center: Project title (editable) ── */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKey}
            className="text-xs font-medium text-[#e4e5f1] bg-[#1a1b25] px-3 py-1
                       rounded-md border border-[#6c63ff]/50 outline-none w-48"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setTitleDraft(projectTitle); setEditingTitle(true); }}
            className="text-xs font-medium text-[#e4e5f1] bg-[#1a1b25] px-3 py-1 rounded-md
                       border border-[#1e2030] hover:border-[#2a2d45] transition-colors cursor-text"
            title="Click to rename project"
          >
            {projectTitle}
          </button>
        )}

        <SaveIndicator status={saveStatus} />
      </div>

      {/* ── Right: Action buttons ── */}
      <div className="flex items-center gap-1.5">
        {/* AI Assistant */}
        <button
          type="button"
          onClick={onOpenAIPanel}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                     bg-[#1a1b25] border border-[#1e2030] text-[#6e7191]
                     hover:text-[#e4e5f1] hover:border-[#2a2d45]
                     text-xs font-medium transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI
        </button>

        {/* Export */}
        <button
          type="button"
          onClick={onOpenExportPanel}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                     bg-[#1a1b25] border border-[#1e2030] text-[#6e7191]
                     hover:text-[#e4e5f1] hover:border-[#2a2d45]
                     text-xs font-medium transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>

        {/* Mock Server */}
        <button
          type="button"
          onClick={onOpenMockPanel}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                     transition-all cursor-pointer
                     ${isMockRunning
                       ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                       : 'bg-[#1a1b25] border border-[#1e2030] text-[#6e7191] hover:text-[#e4e5f1] hover:border-[#2a2d45]'
                     }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Mock
          {isMockRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
        </button>

        {/* Generate Spec */}
        <button
          type="button"
          onClick={onGenerateSpec}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                     bg-gradient-to-r from-[#6c63ff] to-[#a78bfa]
                     text-xs font-semibold text-white
                     hover:shadow-[0_0_20px_rgba(108,99,255,0.35)]
                     active:scale-[0.97] transition-all cursor-pointer"
        >
          <Code className="w-3.5 h-3.5" />
          Spec
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[#1e2030] mx-0.5" />

        {/* Auth */}
        {isAuthenticated ? (
          <div className="flex items-center gap-1.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center
                         text-[10px] font-bold text-white cursor-default"
              style={{ backgroundColor: myColor || '#6c63ff' }}
              title={userName || 'You'}
            >
              {(userName || 'U').charAt(0).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="p-1.5 rounded-lg text-[#6e7191] hover:text-red-400
                         hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuthModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                       text-xs font-medium transition-all cursor-pointer
                       ${isGuest
                         ? 'bg-[#1a1b25] border border-[#1e2030] text-[#6e7191] hover:text-[#e4e5f1]'
                         : 'bg-[#6c63ff]/15 border border-[#6c63ff]/30 text-[#6c63ff] hover:bg-[#6c63ff]/25'
                       }`}
          >
            {isGuest ? <User2 className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
            {isGuest ? 'Guest' : 'Sign In'}
          </button>
        )}
      </div>
    </header>
  );
}
