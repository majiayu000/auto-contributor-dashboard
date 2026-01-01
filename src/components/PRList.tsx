'use client';

import { ExternalLink, GitPullRequest, GitMerge, XCircle, Clock } from 'lucide-react';

interface PullRequest {
  id: number;
  pr_url: string;
  pr_number: number;
  branch_name: string;
  status: string;
  ci_status: string;
  created_at: string;
}

interface PRListProps {
  prs: PullRequest[];
}

const statusConfig: Record<string, { icon: typeof GitPullRequest; color: string; bg: string }> = {
  open: {
    icon: GitPullRequest,
    color: 'text-[#00ff9d]',
    bg: 'bg-[#00ff9d]/10',
  },
  merged: {
    icon: GitMerge,
    color: 'text-[#a855f7]',
    bg: 'bg-[#a855f7]/10',
  },
  closed: {
    icon: XCircle,
    color: 'text-[#ff3d5a]',
    bg: 'bg-[#ff3d5a]/10',
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PRList({ prs }: PRListProps) {
  return (
    <div className="rounded-lg bg-[#12121a] border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitPullRequest className="w-4 h-4 text-[#a855f7]" />
          <h2 className="text-sm font-semibold text-[#e4e4e7] uppercase tracking-wider font-mono">
            Pull Requests
          </h2>
        </div>
        <span className="text-xs text-[#71717a] font-mono px-2 py-0.5 bg-[#1a1a24] rounded">
          {prs.length}
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-white/5 max-h-[320px] overflow-y-auto">
        {prs.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Clock className="w-8 h-8 text-[#71717a] mx-auto mb-3" />
            <p className="text-sm text-[#71717a] font-mono">No pull requests yet</p>
            <p className="text-xs text-[#52525b] mt-1">PRs will appear here once created</p>
          </div>
        ) : (
          prs.map((pr) => {
            const config = statusConfig[pr.status] || statusConfig.open;
            const StatusIcon = config.icon;

            return (
              <a
                key={pr.id}
                href={pr.pr_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-5 py-4 hover:bg-[#1a1a24]/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-1.5 rounded ${config.bg} mt-0.5`}>
                      <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#e4e4e7] group-hover:text-[#00ff9d] transition-colors font-mono">
                          PR #{pr.pr_number}
                        </span>
                        <ExternalLink className="w-3 h-3 text-[#71717a] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-[#71717a] truncate mt-1 font-mono">
                        {pr.branch_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[10px] font-mono font-medium uppercase px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                      {pr.status}
                    </span>
                    <span className="text-[10px] text-[#52525b] font-mono">
                      {formatDate(pr.created_at)}
                    </span>
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
