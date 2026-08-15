import { useState, useMemo, useCallback } from 'react';
import {
  X, Download, FileJson, FileCode, Package,
  BookOpen, ExternalLink, Check, Loader2,
  Copy, BookMarked, Zap,
} from 'lucide-react';
import { useCanvasStore } from '../stores/canvasStore';
import { buildAST } from '../generators/astBuilder';
import { generateOpenAPISpec, specToJSON, specToYAML } from '../generators/openApiGenerator';
import { generatePostmanCollection, postmanToJSON } from '../generators/postmanGenerator';
import { generateMarkdownDocs } from '../generators/markdownGenerator';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/* ─── Download helper ─── */

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Export option card ─── */

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
  accent: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'openapi-yaml',
    label: 'OpenAPI YAML',
    description: 'OpenAPI 3.0.3 specification in YAML format',
    icon: <FileCode className="w-5 h-5" />,
    extension: '.yaml',
    accent: 'from-[#6c63ff] to-[#a78bfa]',
  },
  {
    id: 'openapi-json',
    label: 'OpenAPI JSON',
    description: 'OpenAPI 3.0.3 specification in JSON format',
    icon: <FileJson className="w-5 h-5" />,
    extension: '.json',
    accent: 'from-amber-500 to-orange-400',
  },
  {
    id: 'postman',
    label: 'Postman Collection',
    description: 'Postman Collection v2.1 with test scripts',
    icon: <Package className="w-5 h-5" />,
    extension: '.json',
    accent: 'from-orange-500 to-red-400',
  },
  {
    id: 'markdown',
    label: 'Markdown Docs',
    description: 'GitHub-flavored API documentation',
    icon: <BookOpen className="w-5 h-5" />,
    extension: '.md',
    accent: 'from-emerald-500 to-teal-400',
  },
  {
    id: 'swagger-ui',
    label: 'View Swagger UI',
    description: 'Interactive API explorer in the browser',
    icon: <ExternalLink className="w-5 h-5" />,
    extension: '',
    accent: 'from-blue-500 to-cyan-400',
  },
];

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportPanel({ isOpen, onClose }: ExportPanelProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [swaggerStatus, setSwaggerStatus] = useState<'idle' | 'pushing' | 'ready' | 'error'>('idle');
  const [swaggerUrl, setSwaggerUrl] = useState('');

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const projectTitle = useCanvasStore((s) => s.projectTitle);

  const { ast, spec } = useMemo(() => {
    try {
      const ast = buildAST(nodes, edges, projectTitle, '1.0.0');
      const spec = generateOpenAPISpec(ast);
      return { ast, spec };
    } catch {
      return { ast: null, spec: null };
    }
  }, [nodes, edges, projectTitle]);

  const handleExport = useCallback(async (optionId: string) => {
    if (!ast || !spec) return;

    setDownloading(optionId);

    try {
      const slug = projectTitle.toLowerCase().replace(/\s+/g, '-');

      switch (optionId) {
        case 'openapi-yaml': {
          downloadFile(specToYAML(spec), `${slug}-openapi.yaml`, 'text/yaml');
          break;
        }
        case 'openapi-json': {
          downloadFile(specToJSON(spec), `${slug}-openapi.json`, 'application/json');
          break;
        }
        case 'postman': {
          const collection = generatePostmanCollection(ast, 'http://localhost:3001');
          downloadFile(postmanToJSON(collection), `${slug}-postman.json`, 'application/json');
          break;
        }
        case 'markdown': {
          const md = generateMarkdownDocs(ast);
          downloadFile(md, `${slug}-api-docs.md`, 'text/markdown');
          break;
        }
        case 'swagger-ui': {
          setSwaggerStatus('pushing');
          // Push spec to backend and open Swagger UI
          const projectId = useCanvasStore.getState().projectId;
          const res = await fetch(`${BACKEND_URL}/docs/spec/${projectId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spec }),
          });
          if (!res.ok) throw new Error('Failed to push spec');
          const url = `${BACKEND_URL}/docs/${projectId}`;
          setSwaggerUrl(url);
          setSwaggerStatus('ready');
          window.open(url, '_blank', 'noopener,noreferrer');
          break;
        }
      }
    } catch (err) {
      console.error('[Export]', err);
      if (optionId === 'swagger-ui') setSwaggerStatus('error');
    } finally {
      setDownloading(null);
    }
  }, [ast, spec, projectTitle]);

  const handleCopySpec = useCallback(async (format: 'yaml' | 'json') => {
    if (!spec) return;
    const content = format === 'yaml' ? specToYAML(spec) : specToJSON(spec);
    await navigator.clipboard.writeText(content).catch(() => {});
    setCopied(format);
    setTimeout(() => setCopied(null), 2000);
  }, [spec]);

  if (!isOpen) return null;

  const stats = ast ? {
    endpoints: ast.endpoints.length,
    schemas: ast.schemas.length,
    security: ast.securitySchemes.length,
  } : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[540px] bg-[#12131a] rounded-2xl border border-[#1e2030]
                      shadow-2xl overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2030]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#6c63ff] to-[#a78bfa]
                            shadow-[0_0_12px_rgba(108,99,255,0.25)]">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Export & Publish</h2>
              <p className="text-[10px] text-[#6e7191]">{projectTitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-[#6e7191] hover:text-[#e4e5f1] hover:bg-[#1a1b25]
                       transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="flex gap-3 px-5 py-3 border-b border-[#1e2030] bg-[#0a0b0f]/40">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#6c63ff]/10">
              <span className="text-[10px] font-medium text-[#6c63ff]">{stats.endpoints} endpoints</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-500/10">
              <span className="text-[10px] font-medium text-cyan-400">{stats.schemas} schemas</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10">
              <span className="text-[10px] font-medium text-amber-400">{stats.security} security schemes</span>
            </div>
          </div>
        )}

        {/* Export options */}
        <div className="p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#6e7191] font-semibold mb-3">
            Export Formats
          </p>

          <div className="grid grid-cols-1 gap-2">
            {EXPORT_OPTIONS.map((option) => {
              const isLoading = downloading === option.id;
              const isCopied = copied !== null;

              return (
                <div key={option.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a1b25]
                             border border-[#1e2030] hover:border-[#2a2d45]
                             transition-all group">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${option.accent} shrink-0`}>
                    {option.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#e4e5f1]">{option.label}</p>
                    <p className="text-[11px] text-[#6e7191]">{option.description}</p>
                    {option.id === 'swagger-ui' && swaggerStatus === 'ready' && swaggerUrl && (
                      <a href={swaggerUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-[#6c63ff] hover:underline mt-0.5 block">
                        {swaggerUrl}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Copy button (not for swagger-ui) */}
                    {option.id === 'openapi-yaml' && (
                      <button
                        type="button"
                        onClick={() => handleCopySpec('yaml')}
                        className="p-1.5 rounded-lg text-[#6e7191] hover:text-[#e4e5f1]
                                   hover:bg-[#12131a] transition-colors cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copied === 'yaml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {option.id === 'openapi-json' && (
                      <button
                        type="button"
                        onClick={() => handleCopySpec('json')}
                        className="p-1.5 rounded-lg text-[#6e7191] hover:text-[#e4e5f1]
                                   hover:bg-[#12131a] transition-colors cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {/* Download / Open button */}
                    <button
                      type="button"
                      onClick={() => void handleExport(option.id)}
                      disabled={isLoading || !ast}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                 bg-[#6c63ff]/15 border border-[#6c63ff]/30 text-[#6c63ff]
                                 text-xs font-medium hover:bg-[#6c63ff]/25
                                 disabled:opacity-40 disabled:cursor-not-allowed
                                 transition-all cursor-pointer"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : option.id === 'swagger-ui' ? (
                        <ExternalLink className="w-3.5 h-3.5" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {option.id === 'swagger-ui'
                        ? (swaggerStatus === 'ready' ? 'Open Again' : 'Open Docs')
                        : `Export ${option.extension}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1e2030]
                        text-[10px] text-[#2a2d45]">
          <span>Phase 8 — Export & Documentation</span>
          <span className="flex items-center gap-1">
            <BookMarked className="w-3 h-3" />
            OpenAPI 3.0.3 compliant
          </span>
        </div>
      </div>
    </div>
  );
}
