import { useCallback } from 'react';
import { Database, Plus, Trash2, GripVertical, KeyRound } from 'lucide-react';
import { Input, SectionHeader, IconButton, Toggle } from './FormControls';
import type { DatabaseNodeData, ColumnDef } from '../nodes/types';

const COLUMN_TYPE_PRESETS = [
  'uuid', 'serial', 'bigserial',
  'varchar(255)', 'varchar(100)', 'text',
  'integer', 'bigint', 'numeric', 'decimal',
  'boolean',
  'timestamp', 'timestamptz', 'date', 'time',
  'json', 'jsonb',
  'bytea',
];

interface Props {
  data: DatabaseNodeData;
  onChange: (data: Partial<DatabaseNodeData>) => void;
}

export function DatabaseInspector({ data, onChange }: Props) {
  const handleAddColumn = useCallback(() => {
    const columns: ColumnDef[] = [
      ...(data.columns || []),
      { name: '', type: 'varchar(255)', primaryKey: false, nullable: true },
    ];
    onChange({ columns });
  }, [data.columns, onChange]);

  const handleRemoveColumn = useCallback(
    (idx: number) => {
      const columns = [...(data.columns || [])];
      columns.splice(idx, 1);
      onChange({ columns });
    },
    [data.columns, onChange]
  );

  const handleUpdateColumn = useCallback(
    (idx: number, field: keyof ColumnDef, value: string | boolean) => {
      const columns = [...(data.columns || [])];
      columns[idx] = { ...columns[idx], [field]: value };
      // If setting as primary key, ensure it's not nullable
      if (field === 'primaryKey' && value === true) {
        columns[idx].nullable = false;
      }
      onChange({ columns });
    },
    [data.columns, onChange]
  );

  const handleAddIdColumn = useCallback(() => {
    const columns: ColumnDef[] = [
      { name: 'id', type: 'uuid', primaryKey: true, nullable: false },
      ...(data.columns || []),
    ];
    onChange({ columns });
  }, [data.columns, onChange]);

  const handleAddTimestamps = useCallback(() => {
    const columns: ColumnDef[] = [
      ...(data.columns || []),
      { name: 'created_at', type: 'timestamptz', nullable: false, defaultValue: 'now()' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, defaultValue: 'now()' },
    ];
    onChange({ columns });
  }, [data.columns, onChange]);

  return (
    <div className="space-y-4">
      {/* Node Header */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-[#1e2030]">
        <div className="p-1.5 rounded-lg bg-cyan-500/10">
          <Database className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#e4e5f1]">Database Table</p>
          <p className="text-[10px] text-[#6e7191]">Configure table schema</p>
        </div>
      </div>

      {/* Basic Info */}
      <Input
        id="db-label"
        label="Display Name"
        value={data.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="e.g., Users Table"
      />

      <Input
        id="db-table-name"
        label="Table Name"
        value={data.tableName}
        onChange={(e) => onChange({ tableName: e.target.value })}
        placeholder="e.g., users"
        hint="PostgreSQL table name (snake_case)"
      />

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAddIdColumn}
          className="flex-1 py-1.5 rounded-lg text-[10px] font-medium
                     bg-cyan-500/10 text-cyan-400 border border-cyan-500/20
                     hover:bg-cyan-500/15 transition-colors cursor-pointer"
        >
          + UUID Primary Key
        </button>
        <button
          type="button"
          onClick={handleAddTimestamps}
          className="flex-1 py-1.5 rounded-lg text-[10px] font-medium
                     bg-[#1a1b25] text-[#6e7191] border border-[#1e2030]
                     hover:text-[#e4e5f1] hover:border-[#2a2d45] transition-colors cursor-pointer"
        >
          + Timestamps
        </button>
      </div>

      {/* Columns */}
      <SectionHeader>Columns ({data.columns?.length || 0})</SectionHeader>
      <div className="space-y-2">
        {(data.columns || []).map((col, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-lg bg-[#0a0b0f] border border-[#1e2030]
                       space-y-2 group hover:border-[#2a2d45] transition-colors"
          >
            {/* Column Name + Type */}
            <div className="flex items-center gap-1.5">
              <GripVertical className="w-3 h-3 text-[#2a2d45] shrink-0 cursor-grab" />
              {col.primaryKey && (
                <KeyRound className="w-3 h-3 text-amber-400 shrink-0" />
              )}
              <input
                value={col.name}
                onChange={(e) => handleUpdateColumn(idx, 'name', e.target.value)}
                className="flex-1 px-2 py-1 rounded text-xs text-[#e4e5f1] bg-transparent
                           border border-transparent focus:border-[#6c63ff] outline-none
                           font-mono transition-colors hover:border-[#1e2030]"
                placeholder="column_name"
              />
              <select
                value={col.type}
                onChange={(e) => handleUpdateColumn(idx, 'type', e.target.value)}
                className="px-2 py-1 rounded text-[10px] text-[#6e7191] bg-[#12131a]
                           border border-[#1e2030] outline-none focus:border-[#6c63ff]
                           appearance-none cursor-pointer transition-colors font-mono
                           max-w-[120px]"
              >
                {COLUMN_TYPE_PRESETS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <IconButton onClick={() => handleRemoveColumn(idx)} variant="danger" title="Remove column">
                <Trash2 className="w-3 h-3" />
              </IconButton>
            </div>

            {/* Column Options */}
            <div className="flex items-center gap-4 pl-5">
              <Toggle
                label="Primary Key"
                checked={col.primaryKey || false}
                onChange={(v) => handleUpdateColumn(idx, 'primaryKey', v)}
              />
              <Toggle
                label="Nullable"
                checked={col.nullable || false}
                onChange={(v) => handleUpdateColumn(idx, 'nullable', v)}
              />
              <Toggle
                label="Unique"
                checked={col.unique || false}
                onChange={(v) => handleUpdateColumn(idx, 'unique', v)}
              />
            </div>

            {/* Default Value */}
            <div className="pl-5">
              <input
                value={col.defaultValue || ''}
                onChange={(e) => handleUpdateColumn(idx, 'defaultValue', e.target.value)}
                className="w-full px-2 py-1 rounded text-[10px] text-[#6e7191] bg-transparent
                           border border-transparent focus:border-[#6c63ff] outline-none
                           font-mono transition-colors hover:border-[#1e2030]
                           placeholder:text-[#2a2d45]"
                placeholder="Default value (e.g., now())"
              />
            </div>
          </div>
        ))}

        {/* Add Column */}
        <button
          type="button"
          onClick={handleAddColumn}
          className="w-full py-2.5 rounded-lg border border-dashed border-[#1e2030]
                     text-xs text-[#6e7191] hover:text-[#e4e5f1] hover:border-[#2a2d45]
                     transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add column
        </button>
      </div>
    </div>
  );
}
