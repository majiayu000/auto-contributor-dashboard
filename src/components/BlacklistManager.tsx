'use client';

import { useState } from 'react';
import { Ban, Plus, Trash2, Shield } from 'lucide-react';

interface BlacklistEntry {
  id: number;
  repo: string;
  reason: string;
  added_at: string;
}

interface BlacklistManagerProps {
  entries: BlacklistEntry[];
  onAdd: (repo: string, reason: string) => Promise<void>;
  onRemove: (repo: string) => Promise<void>;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function BlacklistManager({ entries, onAdd, onRemove }: BlacklistManagerProps) {
  const [newRepo, setNewRepo] = useState('');
  const [newReason, setNewReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAdd = async () => {
    if (!newRepo.trim()) return;
    setLoading(true);
    try {
      await onAdd(newRepo.trim(), newReason.trim() || 'User requested');
      setNewRepo('');
      setNewReason('');
      setIsExpanded(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (repo: string) => {
    setLoading(true);
    try {
      await onRemove(repo);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-[#12121a] border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-[#ff3d5a]" />
          <h2 className="text-sm font-semibold text-[#e4e4e7] uppercase tracking-wider font-mono">
            Blacklist
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#71717a] font-mono px-2 py-0.5 bg-[#1a1a24] rounded">
            {entries.length}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[#71717a] hover:text-[#00ff9d] hover:bg-[#1a1a24] rounded transition-colors"
          >
            <Plus className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* Add Form */}
      {isExpanded && (
        <div className="p-4 border-b border-white/5 bg-[#0a0a0f]/50">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-[#71717a] uppercase tracking-wider font-mono mb-1.5 block">
                Repository
              </label>
              <input
                type="text"
                placeholder="owner/repo"
                value={newRepo}
                onChange={(e) => setNewRepo(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#1a1a24] border border-white/5 rounded text-[#e4e4e7] placeholder-[#52525b] font-mono focus:border-[#00ff9d]/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#71717a] uppercase tracking-wider font-mono mb-1.5 block">
                Reason (optional)
              </label>
              <input
                type="text"
                placeholder="Why is this repo blacklisted?"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#1a1a24] border border-white/5 rounded text-[#e4e4e7] placeholder-[#52525b] font-mono focus:border-[#00ff9d]/50 transition-colors"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={loading || !newRepo.trim()}
              className="w-full px-4 py-2 bg-[#ff3d5a] text-white text-sm font-medium rounded hover:bg-[#ff3d5a]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-mono"
            >
              <Ban className="w-4 h-4" />
              Add to Blacklist
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="divide-y divide-white/5 max-h-[240px] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Ban className="w-6 h-6 text-[#52525b] mx-auto mb-2" />
            <p className="text-xs text-[#71717a] font-mono">No blacklisted repos</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="px-5 py-3 flex items-center justify-between hover:bg-[#1a1a24]/50 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#e4e4e7] font-mono truncate">
                  {entry.repo}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-[#71717a] truncate max-w-[150px]">
                    {entry.reason}
                  </p>
                  <span className="text-[10px] text-[#52525b] font-mono">
                    {formatDate(entry.added_at)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleRemove(entry.repo)}
                disabled={loading}
                className="p-2 text-[#71717a] hover:text-[#ff3d5a] hover:bg-[#ff3d5a]/10 rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
