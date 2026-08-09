import { useState, useCallback } from 'react';
import { ShieldCheck, Plus } from 'lucide-react';
import { Input, Textarea, Select, SectionHeader, Badge } from './FormControls';
import type { AuthNodeData } from '../nodes/types';

const PROVIDER_OPTIONS = [
  { value: 'jwt', label: 'JWT Bearer Token' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'api-key', label: 'API Key' },
  { value: 'basic', label: 'Basic Auth' },
];

const COMMON_SCOPES: Record<string, string[]> = {
  jwt: ['read', 'write', 'admin', 'read:users', 'write:users'],
  oauth2: ['openid', 'profile', 'email', 'offline_access'],
  'api-key': ['read', 'write', 'full'],
  basic: [],
};

interface Props {
  data: AuthNodeData;
  onChange: (data: Partial<AuthNodeData>) => void;
}

export function AuthInspector({ data, onChange }: Props) {
  const [newScope, setNewScope] = useState('');

  const handleAddScope = useCallback(() => {
    if (!newScope.trim()) return;
    const scopes = data.scopes || [];
    if (scopes.includes(newScope.trim())) return;
    onChange({ scopes: [...scopes, newScope.trim()] });
    setNewScope('');
  }, [newScope, data.scopes, onChange]);

  const handleRemoveScope = useCallback(
    (scope: string) => {
      onChange({ scopes: (data.scopes || []).filter((s) => s !== scope) });
    },
    [data.scopes, onChange]
  );

  const handleAddPresetScope = useCallback(
    (scope: string) => {
      const scopes = data.scopes || [];
      if (scopes.includes(scope)) return;
      onChange({ scopes: [...scopes, scope] });
    },
    [data.scopes, onChange]
  );

  const availablePresets = (COMMON_SCOPES[data.provider] || []).filter(
    (s) => !(data.scopes || []).includes(s)
  );

  return (
    <div className="space-y-4">
      {/* Node Header */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-[#1e2030]">
        <div className="p-1.5 rounded-lg bg-amber-500/10">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#e4e5f1]">Authentication</p>
          <p className="text-[10px] text-[#6e7191]">Configure security scheme</p>
        </div>
      </div>

      {/* Basic Info */}
      <Input
        id="auth-label"
        label="Label"
        value={data.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="e.g., JWT Auth"
      />

      <Select
        id="auth-provider"
        label="Provider Type"
        value={data.provider}
        options={PROVIDER_OPTIONS}
        onChange={(e) => onChange({ provider: e.target.value as AuthNodeData['provider'] })}
      />

      <Textarea
        id="auth-description"
        label="Description"
        value={data.description || ''}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Describe the authentication scheme..."
      />

      {/* Provider-specific fields */}
      {data.provider === 'oauth2' && (
        <Input
          id="auth-token-url"
          label="Token URL"
          value={data.tokenUrl || ''}
          onChange={(e) => onChange({ tokenUrl: e.target.value })}
          placeholder="https://auth.example.com/oauth/token"
        />
      )}

      {data.provider === 'api-key' && (
        <Input
          id="auth-header-name"
          label="Header Name"
          value={data.headerName || 'X-API-Key'}
          onChange={(e) => onChange({ headerName: e.target.value })}
          placeholder="X-API-Key"
        />
      )}

      {/* Scopes */}
      <SectionHeader>Scopes & Permissions</SectionHeader>
      <div className="flex flex-wrap gap-1.5">
        {(data.scopes || []).map((scope) => (
          <Badge
            key={scope}
            variant="warning"
            removable
            onRemove={() => handleRemoveScope(scope)}
          >
            {scope}
          </Badge>
        ))}
        {(data.scopes || []).length === 0 && (
          <p className="text-[10px] text-[#6e7191]/60 italic">No scopes defined</p>
        )}
      </div>

      {/* Add Custom Scope */}
      <div className="flex gap-2">
        <Input
          id="new-scope"
          value={newScope}
          onChange={(e) => setNewScope(e.target.value)}
          placeholder="custom:scope"
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAddScope()}
        />
        <button
          type="button"
          onClick={handleAddScope}
          className="px-3 py-2 rounded-lg bg-[#1a1b25] border border-[#1e2030]
                     text-xs text-[#6e7191] hover:text-[#e4e5f1] hover:border-[#2a2d45]
                     transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preset Scopes */}
      {availablePresets.length > 0 && (
        <div>
          <p className="text-[10px] text-[#6e7191] mb-1.5">Quick add:</p>
          <div className="flex flex-wrap gap-1">
            {availablePresets.map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => handleAddPresetScope(scope)}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono
                           bg-[#1a1b25] text-[#6e7191] border border-[#1e2030]
                           hover:text-amber-400 hover:border-amber-500/30
                           transition-colors cursor-pointer"
              >
                + {scope}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
