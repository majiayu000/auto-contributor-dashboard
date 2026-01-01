'use client';

import { useState } from 'react';
import { Ban, Plus, Trash2 } from 'lucide-react';

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

export function BlacklistManager({ entries, onAdd, onRemove }: BlacklistManagerProps) {
  const [newRepo, setNewRepo] = useState('');
  const [newReason, setNewReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newRepo.trim()) return;
    setLoading(true);
    try {
      await onAdd(newRepo.trim(), newReason.trim() || 'User requested');
      setNewRepo('');
      setNewReason('');
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
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <Ban className="w-5 h-5" />
          Blacklist ({entries.length})
        </h2>
      </div>

      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="owner/repo"
            value={newRepo}
            onChange={(e) => setNewRepo(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400"
          />
          <input
            type="text"
            placeholder="Reason (optional)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400"
          />
          <button
            onClick={handleAdd}
            disabled={loading || !newRepo.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-64 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
            No blacklisted repositories
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="px-6 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{entry.repo}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{entry.reason}</p>
              </div>
              <button
                onClick={() => handleRemove(entry.repo)}
                disabled={loading}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
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
