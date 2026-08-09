import { useState, useCallback } from 'react';
import { Globe, Plus, Trash2, GripVertical } from 'lucide-react';
import { Input, Textarea, Select, SectionHeader, Badge, IconButton, Toggle } from './FormControls';
import type { EndpointNodeData, HeaderEntry, RequestBodyField } from '../nodes/types';

const HTTP_METHODS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
];

const STATUS_CODE_PRESETS: Record<string, number[]> = {
  GET: [200, 401, 404, 500],
  POST: [201, 400, 401, 409, 500],
  PUT: [200, 400, 401, 404, 500],
  PATCH: [200, 400, 401, 404, 500],
  DELETE: [204, 401, 404, 500],
};

const BODY_FIELD_TYPES = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'boolean', label: 'boolean' },
  { value: 'object', label: 'object' },
  { value: 'array', label: 'array' },
];

function getStatusBadgeVariant(code: number): 'success' | 'warning' | 'danger' | 'info' {
  if (code < 300) return 'success';
  if (code < 400) return 'warning';
  if (code < 500) return 'danger';
  return 'danger';
}

interface Props {
  data: EndpointNodeData;
  onChange: (data: Partial<EndpointNodeData>) => void;
}

export function EndpointInspector({ data, onChange }: Props) {
  const [newStatusCode, setNewStatusCode] = useState('');
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');

  /* ─── Handlers ─── */
  const handleAddStatusCode = useCallback(() => {
    const code = parseInt(newStatusCode, 10);
    if (!code || code < 100 || code > 599) return;
    const current = data.statusCodes || [];
    if (current.includes(code)) return;
    onChange({ statusCodes: [...current, code].sort((a, b) => a - b) });
    setNewStatusCode('');
  }, [newStatusCode, data.statusCodes, onChange]);

  const handleRemoveStatusCode = useCallback(
    (code: number) => {
      onChange({ statusCodes: (data.statusCodes || []).filter((c) => c !== code) });
    },
    [data.statusCodes, onChange]
  );

  const handleAddHeader = useCallback(() => {
    if (!newHeaderKey.trim()) return;
    const headers: HeaderEntry[] = data.headers || [];
    onChange({ headers: [...headers, { key: newHeaderKey, value: newHeaderValue, required: false }] });
    setNewHeaderKey('');
    setNewHeaderValue('');
  }, [newHeaderKey, newHeaderValue, data.headers, onChange]);

  const handleRemoveHeader = useCallback(
    (idx: number) => {
      const headers = [...(data.headers || [])];
      headers.splice(idx, 1);
      onChange({ headers });
    },
    [data.headers, onChange]
  );

  const handleUpdateHeader = useCallback(
    (idx: number, field: keyof HeaderEntry, value: string | boolean) => {
      const headers = [...(data.headers || [])];
      headers[idx] = { ...headers[idx], [field]: value };
      onChange({ headers });
    },
    [data.headers, onChange]
  );

  const handleAddBodyField = useCallback(() => {
    const fields: RequestBodyField[] = data.requestBody || [];
    onChange({
      requestBody: [...fields, { name: '', type: 'string', required: false }],
    });
  }, [data.requestBody, onChange]);

  const handleRemoveBodyField = useCallback(
    (idx: number) => {
      const fields = [...(data.requestBody || [])];
      fields.splice(idx, 1);
      onChange({ requestBody: fields });
    },
    [data.requestBody, onChange]
  );

  const handleUpdateBodyField = useCallback(
    (idx: number, field: keyof RequestBodyField, value: string | boolean) => {
      const fields = [...(data.requestBody || [])];
      fields[idx] = { ...fields[idx], [field]: value };
      onChange({ requestBody: fields });
    },
    [data.requestBody, onChange]
  );

  const handleApplyPresetCodes = useCallback(() => {
    onChange({ statusCodes: STATUS_CODE_PRESETS[data.method] || [200] });
  }, [data.method, onChange]);

  return (
    <div className="space-y-4">
      {/* Node Header */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-[#1e2030]">
        <div className="p-1.5 rounded-lg bg-emerald-500/10">
          <Globe className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#e4e5f1]">Endpoint</p>
          <p className="text-[10px] text-[#6e7191]">Configure HTTP endpoint</p>
        </div>
      </div>

      {/* Basic Info */}
      <Input
        id="endpoint-label"
        label="Label"
        value={data.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="e.g., Get Users"
      />

      <div className="grid grid-cols-[100px_1fr] gap-2">
        <Select
          id="endpoint-method"
          label="Method"
          value={data.method}
          options={HTTP_METHODS}
          onChange={(e) => onChange({ method: e.target.value as EndpointNodeData['method'] })}
        />
        <Input
          id="endpoint-path"
          label="Path"
          value={data.path}
          onChange={(e) => onChange({ path: e.target.value })}
          placeholder="/api/v1/resource"
        />
      </div>

      <Textarea
        id="endpoint-description"
        label="Description"
        value={data.description || ''}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="What does this endpoint do?"
      />

      {/* Status Codes */}
      <SectionHeader>Response Status Codes</SectionHeader>
      <div className="flex flex-wrap gap-1.5">
        {(data.statusCodes || []).map((code) => (
          <Badge
            key={code}
            variant={getStatusBadgeVariant(code)}
            removable
            onRemove={() => handleRemoveStatusCode(code)}
          >
            {code}
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          id="new-status-code"
          value={newStatusCode}
          onChange={(e) => setNewStatusCode(e.target.value)}
          placeholder="e.g., 200"
          className="flex-1 !font-mono"
          onKeyDown={(e) => e.key === 'Enter' && handleAddStatusCode()}
        />
        <button
          type="button"
          onClick={handleAddStatusCode}
          className="px-3 py-2 rounded-lg bg-[#1a1b25] border border-[#1e2030]
                     text-xs text-[#6e7191] hover:text-[#e4e5f1] hover:border-[#2a2d45]
                     transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={handleApplyPresetCodes}
        className="text-[10px] text-[#6c63ff] hover:text-[#7b73ff] transition-colors cursor-pointer"
      >
        Apply {data.method} presets →
      </button>

      {/* Headers */}
      <SectionHeader>Headers</SectionHeader>
      <div className="space-y-2">
        {(data.headers || []).map((header, idx) => (
          <div key={idx} className="flex items-center gap-1.5 group">
            <GripVertical className="w-3 h-3 text-[#2a2d45] shrink-0" />
            <input
              value={header.key}
              onChange={(e) => handleUpdateHeader(idx, 'key', e.target.value)}
              className="flex-1 px-2 py-1.5 rounded text-xs text-[#e4e5f1] bg-[#0a0b0f]
                         border border-[#1e2030] outline-none focus:border-[#6c63ff]
                         font-mono transition-colors"
              placeholder="Header-Name"
            />
            <input
              value={header.value}
              onChange={(e) => handleUpdateHeader(idx, 'value', e.target.value)}
              className="flex-1 px-2 py-1.5 rounded text-xs text-[#e4e5f1] bg-[#0a0b0f]
                         border border-[#1e2030] outline-none focus:border-[#6c63ff]
                         font-mono transition-colors"
              placeholder="Value"
            />
            <IconButton onClick={() => handleRemoveHeader(idx)} variant="danger" title="Remove header">
              <Trash2 className="w-3 h-3" />
            </IconButton>
          </div>
        ))}
        <div className="flex gap-1.5">
          <input
            value={newHeaderKey}
            onChange={(e) => setNewHeaderKey(e.target.value)}
            className="flex-1 px-2 py-1.5 rounded text-xs text-[#e4e5f1] bg-[#0a0b0f]
                       border border-[#1e2030] border-dashed outline-none focus:border-[#6c63ff]
                       font-mono transition-colors"
            placeholder="New header key"
          />
          <input
            value={newHeaderValue}
            onChange={(e) => setNewHeaderValue(e.target.value)}
            className="flex-1 px-2 py-1.5 rounded text-xs text-[#e4e5f1] bg-[#0a0b0f]
                       border border-[#1e2030] border-dashed outline-none focus:border-[#6c63ff]
                       font-mono transition-colors"
            placeholder="Value"
            onKeyDown={(e) => e.key === 'Enter' && handleAddHeader()}
          />
          <button
            type="button"
            onClick={handleAddHeader}
            className="px-2 py-1.5 rounded bg-[#1a1b25] border border-[#1e2030]
                       text-[#6e7191] hover:text-[#e4e5f1] hover:border-[#2a2d45]
                       transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Request Body (only for POST/PUT/PATCH) */}
      {['POST', 'PUT', 'PATCH'].includes(data.method) && (
        <>
          <SectionHeader>Request Body Schema</SectionHeader>
          <div className="space-y-2">
            {(data.requestBody || []).map((field, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-[#0a0b0f] border border-[#1e2030] space-y-2"
              >
                <div className="flex items-center gap-1.5">
                  <input
                    value={field.name}
                    onChange={(e) => handleUpdateBodyField(idx, 'name', e.target.value)}
                    className="flex-1 px-2 py-1 rounded text-xs text-[#e4e5f1] bg-transparent
                               border border-[#1e2030] outline-none focus:border-[#6c63ff]
                               font-mono transition-colors"
                    placeholder="field_name"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => handleUpdateBodyField(idx, 'type', e.target.value)}
                    className="px-2 py-1 rounded text-xs text-[#e4e5f1] bg-[#12131a]
                               border border-[#1e2030] outline-none focus:border-[#6c63ff]
                               appearance-none cursor-pointer transition-colors"
                  >
                    {BODY_FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <IconButton onClick={() => handleRemoveBodyField(idx)} variant="danger" title="Remove field">
                    <Trash2 className="w-3 h-3" />
                  </IconButton>
                </div>
                <div className="flex items-center justify-between pl-1">
                  <Toggle
                    label="Required"
                    checked={field.required || false}
                    onChange={(v) => handleUpdateBodyField(idx, 'required', v)}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddBodyField}
              className="w-full py-2 rounded-lg border border-dashed border-[#1e2030]
                         text-xs text-[#6e7191] hover:text-[#e4e5f1] hover:border-[#2a2d45]
                         transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Add field
            </button>
          </div>
        </>
      )}
    </div>
  );
}
