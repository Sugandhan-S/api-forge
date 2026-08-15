import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  FileJson,
  FileCode,
  Braces,
  ChevronRight,
  Zap,
  AlertCircle,
  ShieldCheck,
  Loader2,
  XCircle,
} from 'lucide-react';

import { useCanvasStore } from '../stores/canvasStore';
import { apiFetch } from '../utils/apiClient';
import { buildAST } from '../generators/astBuilder';
import { generateOpenAPISpec, specToJSON, specToYAML } from '../generators/openApiGenerator';

type TabId = 'yaml' | 'json' | 'ast';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'yaml', label: 'YAML', icon: <FileCode className="w-3.5 h-3.5" /> },
  { id: 'json', label: 'JSON', icon: <FileJson className="w-3.5 h-3.5" /> },
  { id: 'ast', label: 'AST', icon: <Braces className="w-3.5 h-3.5" /> },
];

/* ─── Simple Syntax Highlighting ─── */

function highlightYAML(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      // Comments
      if (line.trimStart().startsWith('#')) {
        return `<span class="text-[#6e7191]">${escapeHtml(line)}</span>`;
      }

      // Key-value pairs
      const match = line.match(/^(\s*)([\w$/.]+)(:)(.*)/);
      if (match) {
        const [, indent, key, colon, value] = match;
        let highlightedValue = escapeHtml(value);

        // String values
        if (value.trim().startsWith("'") || value.trim().startsWith('"')) {
          highlightedValue = `<span class="text-emerald-400">${escapeHtml(value)}</span>`;
        }
        // Numbers
        else if (/^\s*\d+(\.\d+)?$/.test(value)) {
          highlightedValue = `<span class="text-amber-400">${escapeHtml(value)}</span>`;
        }
        // Booleans
        else if (/^\s*(true|false)$/i.test(value)) {
          highlightedValue = `<span class="text-blue-400">${escapeHtml(value)}</span>`;
        }
        // $ref values
        else if (value.includes('$ref') || value.includes('#/')) {
          highlightedValue = `<span class="text-purple-400">${escapeHtml(value)}</span>`;
        }

        return `${escapeHtml(indent)}<span class="text-cyan-300">${escapeHtml(key)}</span><span class="text-[#6e7191]">${escapeHtml(colon)}</span>${highlightedValue}`;
      }

      // Array items
      const arrayMatch = line.match(/^(\s*)(- )(.*)/);
      if (arrayMatch) {
        const [, indent, dash, value] = arrayMatch;
        return `${escapeHtml(indent)}<span class="text-[#6e7191]">${escapeHtml(dash)}</span><span class="text-[#e4e5f1]">${escapeHtml(value)}</span>`;
      }

      return escapeHtml(line);
    })
    .join('\n');
}

function highlightJSON(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      const escaped = escapeHtml(line);
      return escaped
        // $ref keys (special case of string key, e.g. &quot;$ref&quot;:)
        .replace(/&quot;(\$ref)&quot;:/g, '<span class="text-purple-400">&quot;$1&quot;</span>:')
        // String keys (e.g., &quot;id&quot;:)
        .replace(/&quot;((?:(?!&quot;).)*)&quot;:/g, '<span class="text-cyan-300">&quot;$1&quot;</span>:')
        // String values
        .replace(/: &quot;((?:(?!&quot;).)*)&quot;/g, ': <span class="text-emerald-400">&quot;$1&quot;</span>')
        // Numbers
        .replace(/: (\d+(\.\d+)?)/g, ': <span class="text-amber-400">$1</span>')
        // Booleans
        .replace(/: (true|false)/g, ': <span class="text-blue-400">$1</span>')
        // Null
        .replace(/: (null)/g, ': <span class="text-[#6e7191]">$1</span>')
        // Brackets/braces
        .replace(/([{}[\]])/g, '<span class="text-[#6e7191]">$1</span>');
    })
    .join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── Stats Component ─── */

function SpecStats({
  endpointCount,
  schemaCount,
  securityCount,
}: {
  endpointCount: number;
  schemaCount: number;
  securityCount: number;
}) {
  return (
    <div className="flex gap-3 px-4 py-2.5 border-b border-[#1e2030]">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10">
        <ChevronRight className="w-3 h-3 text-emerald-400" />
        <span className="text-[10px] font-medium text-emerald-400">
          {endpointCount} endpoint{endpointCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-500/10">
        <ChevronRight className="w-3 h-3 text-cyan-400" />
        <span className="text-[10px] font-medium text-cyan-400">
          {schemaCount} schema{schemaCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10">
        <ChevronRight className="w-3 h-3 text-amber-400" />
        <span className="text-[10px] font-medium text-amber-400">
          {securityCount} security
        </span>
      </div>
    </div>
  );
}

/* ─── Main Spec Viewer ─── */

/* ─── Validation Result Types ─── */

interface ValidationResult {
  valid: boolean;
  issues: string[];
  stats?: {
    paths: number;
    operations: number;
    schemas: number;
    securitySchemes: number;
  };
  error?: string;
}

type ValidateStatus = 'idle' | 'loading' | 'success' | 'error';

/* ─── Validate Panel ─── */

function ValidatePanel({ result, status }: { result: ValidationResult | null; status: ValidateStatus }) {
  if (status === 'idle') return null;

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e2030] bg-[#0a0b0f]/40">
        <Loader2 className="w-3.5 h-3.5 text-[#6c63ff] animate-spin" />
        <span className="text-[11px] text-[#6e7191]">Validating with server...</span>
      </div>
    );
  }

  if (status === 'error' || !result) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e2030] bg-red-500/5">
        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
        <span className="text-[11px] text-red-400">{result?.error || 'Failed to reach validation server'}</span>
      </div>
    );
  }

  return (
    <div className={`px-4 py-2.5 border-b border-[#1e2030] ${
      result.valid ? 'bg-emerald-500/5' : 'bg-red-500/5'
    }`}>
      <div className="flex items-center gap-2 mb-1.5">
        {result.valid ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-red-400" />
        )}
        <span className={`text-[11px] font-semibold ${
          result.valid ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {result.valid ? 'Spec is valid ✓' : `${result.issues.length} issue${result.issues.length !== 1 ? 's' : ''} found`}
        </span>
        {result.stats && (
          <span className="ml-auto text-[10px] text-[#6e7191]">
            {result.stats.operations} ops · {result.stats.schemas} schemas
          </span>
        )}
      </div>
      {result.issues.length > 0 && (
        <ul className="space-y-0.5">
          {result.issues.map((issue, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[10px] text-red-400">
              <span className="mt-0.5 shrink-0">•</span>
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SpecViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpecViewer({ isOpen, onClose }: SpecViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('yaml');
  const [copied, setCopied] = useState(false);
  const [validateStatus, setValidateStatus] = useState<ValidateStatus>('idle');
  const [validateResult, setValidateResult] = useState<ValidationResult | null>(null);
  const codeRef = useRef<HTMLPreElement>(null);

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  // Build AST and generate spec
  const { ast, yamlOutput, jsonOutput, hasError, errorMessage } = useMemo(() => {
    try {
      const ast = buildAST(nodes, edges, 'User Service API', '1.0.0');
      const spec = generateOpenAPISpec(ast);
      return {
        ast,
        yamlOutput: specToYAML(spec),
        jsonOutput: specToJSON(spec),
        hasError: false,
        errorMessage: '',
      };
    } catch (err) {
      return {
        ast: null,
        yamlOutput: '',
        jsonOutput: '',
        hasError: true,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }, [nodes, edges]);

  // Scroll to top when switching tabs
  useEffect(() => {
    codeRef.current?.scrollTo(0, 0);
  }, [activeTab]);

  const currentOutput = useMemo(() => {
    switch (activeTab) {
      case 'yaml':
        return yamlOutput;
      case 'json':
        return jsonOutput;
      case 'ast':
        return ast ? JSON.stringify(ast, null, 2) : '{}';
      default:
        return '';
    }
  }, [activeTab, yamlOutput, jsonOutput, ast]);

  const highlightedOutput = useMemo(() => {
    switch (activeTab) {
      case 'yaml':
        return highlightYAML(yamlOutput);
      case 'json':
        return highlightJSON(jsonOutput);
      case 'ast':
        return highlightJSON(ast ? JSON.stringify(ast, null, 2) : '{}');
      default:
        return '';
    }
  }, [activeTab, yamlOutput, jsonOutput, ast]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = currentOutput;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentOutput]);

  const handleValidate = useCallback(async () => {
    if (!ast) return;
    setValidateStatus('loading');
    setValidateResult(null);
    try {
      // Re-generate the spec as a JS object for the backend
      const { generateOpenAPISpec: genSpec } = await import('../generators/openApiGenerator');
      const specObj = genSpec(ast);

      const res = await apiFetch('/api/openapi/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: specObj }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data: ValidationResult = await res.json();
      setValidateResult(data);
      setValidateStatus('success');
    } catch (err) {
      setValidateResult({
        valid: false,
        issues: [],
        error: err instanceof Error ? err.message : 'Network error — is the backend running?',
      });
      setValidateStatus('error');
    }
  }, [ast]);

  const handleDownload = useCallback(() => {
    const ext = activeTab === 'yaml' ? 'yaml' : 'json';
    const mime = activeTab === 'yaml' ? 'text/yaml' : 'application/json';
    const filename = activeTab === 'ast' ? 'apiforge-ast.json' : `openapi-spec.${ext}`;

    const blob = new Blob([currentOutput], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeTab, currentOutput]);

  const lineCount = currentOutput.split('\n').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-[90vw] max-w-[900px] h-[85vh] bg-[#12131a] rounded-2xl
                   border border-[#1e2030] shadow-2xl flex flex-col overflow-hidden
                   animate-slide-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e2030]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#6c63ff] to-[#a78bfa]
                            shadow-[0_0_12px_rgba(108,99,255,0.25)]">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                OpenAPI Specification
              </h2>
              <p className="text-[10px] text-[#6e7191]">
                Generated from canvas • {lineCount} lines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Validate */}
            <button
              type="button"
              onClick={handleValidate}
              disabled={!ast || validateStatus === 'loading'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-[#1a1b25] border border-[#1e2030]
                         text-xs text-[#6e7191] hover:text-[#e4e5f1]
                         hover:border-[#2a2d45] transition-colors cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validateStatus === 'loading' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              Validate
            </button>

            {/* Copy */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-[#1a1b25] border border-[#1e2030]
                         text-xs text-[#6e7191] hover:text-[#e4e5f1]
                         hover:border-[#2a2d45] transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-[#6c63ff] text-xs text-white font-medium
                         hover:bg-[#7b73ff] transition-colors cursor-pointer
                         shadow-[0_0_12px_rgba(108,99,255,0.2)]"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6e7191] hover:text-[#e4e5f1]
                         hover:bg-[#1a1b25] transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        {ast && (
          <SpecStats
            endpointCount={ast.endpoints.length}
            schemaCount={ast.schemas.length}
            securityCount={ast.securitySchemes.length}
          />
        )}

        {/* Validation Result */}
        <ValidatePanel result={validateResult} status={validateStatus} />

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1e2030]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-150 cursor-pointer
                ${activeTab === tab.id
                  ? 'bg-[#6c63ff]/15 text-[#6c63ff] border border-[#6c63ff]/30'
                  : 'text-[#6e7191] hover:text-[#e4e5f1] hover:bg-[#1a1b25] border border-transparent'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Content */}
        {hasError ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="text-sm text-[#e4e5f1]">Failed to generate spec</p>
              <p className="text-xs text-[#6e7191] font-mono">{errorMessage}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex">
            {/* Line Numbers */}
            <div className="py-4 pl-4 pr-2 overflow-hidden select-none shrink-0
                           text-right text-[11px] font-mono text-[#2a2d45] leading-[1.65]">
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code */}
            <pre
              ref={codeRef}
              className="flex-1 py-4 px-3 overflow-auto text-[11px] font-mono
                         text-[#e4e5f1] leading-[1.65] selection:bg-[#6c63ff]/30"
              dangerouslySetInnerHTML={{ __html: highlightedOutput }}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-[#1e2030]
                       text-[10px] text-[#6e7191]">
          <span>OpenAPI 3.0.3 • {activeTab.toUpperCase()} format</span>
          <span>
            Generated {ast ? new Date(ast.meta.generatedAt).toLocaleTimeString() : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
