'use client';

import { ExternalLink, AlertCircle, Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface Issue {
  id: number;
  repo: string;
  issue_number: number;
  title: string;
  status: string;
  difficulty_score: number;
  retry_count: number;
  error_message: string | null;
  updated_at: string;
}

interface IssueTableProps {
  issues: Issue[];
  title: string;
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  pending: {
    icon: Clock,
    color: 'text-[#ffb800]',
    bg: 'bg-[#ffb800]/10 border-[#ffb800]/20',
    label: 'PENDING',
  },
  processing: {
    icon: Loader2,
    color: 'text-[#00d4ff]',
    bg: 'bg-[#00d4ff]/10 border-[#00d4ff]/20',
    label: 'PROCESSING',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-[#00ff9d]',
    bg: 'bg-[#00ff9d]/10 border-[#00ff9d]/20',
    label: 'COMPLETED',
  },
  failed: {
    icon: XCircle,
    color: 'text-[#ff3d5a]',
    bg: 'bg-[#ff3d5a]/10 border-[#ff3d5a]/20',
    label: 'FAILED',
  },
};

function getScoreColor(score: number): string {
  if (score >= 0.8) return '#00ff9d';
  if (score >= 0.6) return '#00d4ff';
  if (score >= 0.4) return '#ffb800';
  return '#ff3d5a';
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function IssueTable({ issues, title }: IssueTableProps) {
  return (
    <div className="rounded-lg bg-[#12121a] border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#00ff9d] pulse-indicator" />
          <h2 className="text-sm font-semibold text-[#e4e4e7] uppercase tracking-wider font-mono">
            {title}
          </h2>
        </div>
        <span className="text-xs text-[#71717a] font-mono">
          {issues.length} records
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 bg-[#0a0a0f]/50">
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#71717a] uppercase tracking-wider font-mono">
                Repository
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#71717a] uppercase tracking-wider font-mono">
                Issue
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#71717a] uppercase tracking-wider font-mono">
                Status
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#71717a] uppercase tracking-wider font-mono">
                Score
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#71717a] uppercase tracking-wider font-mono">
                Retries
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#71717a] uppercase tracking-wider font-mono">
                Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {issues.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-[#71717a] mx-auto mb-3" />
                  <p className="text-sm text-[#71717a] font-mono">No issues found</p>
                </td>
              </tr>
            ) : (
              issues.map((issue) => {
                const config = statusConfig[issue.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                const scoreColor = getScoreColor(issue.difficulty_score);

                return (
                  <tr key={issue.id} className="table-row-hover group">
                    <td className="px-5 py-3.5">
                      <a
                        href={`https://github.com/${issue.repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[#00d4ff] hover:text-[#00ff9d] transition-colors font-mono group/link"
                      >
                        <span className="truncate max-w-[180px]">{issue.repo}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    </td>
                    <td className="px-5 py-3.5">
                      <a
                        href={`https://github.com/${issue.repo}/issues/${issue.issue_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group/issue"
                      >
                        <span className="text-sm text-[#e4e4e7] hover:text-[#00ff9d] transition-colors font-mono">
                          #{issue.issue_number}
                        </span>
                        <p
                          className="text-xs text-[#71717a] truncate max-w-[200px] mt-0.5 group-hover/issue:text-[#a1a1aa] transition-colors"
                          title={issue.title}
                        >
                          {issue.title}
                        </p>
                      </a>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono font-medium ${config.bg} ${config.color}`}>
                        <StatusIcon className={`w-3 h-3 ${issue.status === 'processing' ? 'animate-spin' : ''}`} />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-[#1a1a24] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${issue.difficulty_score * 100}%`,
                              background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}88)`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono" style={{ color: scoreColor }}>
                          {(issue.difficulty_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-mono ${
                        issue.retry_count > 0 ? 'text-[#ffb800]' : 'text-[#71717a]'
                      }`}>
                        {issue.retry_count}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-[#71717a] font-mono">
                        {formatTimeAgo(issue.updated_at)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
