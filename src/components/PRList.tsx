'use client';

import { ExternalLink, GitPullRequest } from 'lucide-react';

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

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  merged: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  closed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function PRList({ prs }: PRListProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <GitPullRequest className="w-5 h-5" />
          Pull Requests
        </h2>
      </div>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {prs.length === 0 ? (
          <div className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
            No pull requests yet
          </div>
        ) : (
          prs.map((pr) => (
            <div key={pr.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitPullRequest className="w-5 h-5 text-green-500" />
                  <div>
                    <a
                      href={pr.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      PR #{pr.pr_number}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-md">
                      {pr.branch_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[pr.status] || 'bg-zinc-100 text-zinc-800'}`}>
                    {pr.status}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(pr.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
