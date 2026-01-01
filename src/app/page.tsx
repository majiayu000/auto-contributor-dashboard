'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Bug, CheckCircle, XCircle, Clock, GitPullRequest, Activity } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { IssueTable } from '@/components/IssueTable';
import { PRList } from '@/components/PRList';
import { BlacklistManager } from '@/components/BlacklistManager';

interface Stats {
  total_issues: number;
  pending_issues: number;
  processing_issues: number;
  completed_issues: number;
  failed_issues: number;
  total_prs: number;
  success_rate: number;
}

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

interface PullRequest {
  id: number;
  pr_url: string;
  pr_number: number;
  branch_name: string;
  status: string;
  ci_status: string;
  created_at: string;
}

interface BlacklistEntry {
  id: number;
  repo: string;
  reason: string;
  added_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, issuesRes, prsRes, blacklistRes] = await Promise.all([
        fetch('/api/stats'),
        fetch(`/api/issues${activeTab !== 'all' ? `?status=${activeTab}` : ''}`),
        fetch('/api/prs'),
        fetch('/api/blacklist'),
      ]);

      const [statsData, issuesData, prsData, blacklistData] = await Promise.all([
        statsRes.json(),
        issuesRes.json(),
        prsRes.json(),
        blacklistRes.json(),
      ]);

      setStats(statsData);
      setIssues(issuesData);
      setPrs(prsData);
      setBlacklist(blacklistData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAddBlacklist = async (repo: string, reason: string) => {
    await fetch('/api/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo, reason }),
    });
    fetchData();
  };

  const handleRemoveBlacklist = async (repo: string) => {
    await fetch(`/api/blacklist?repo=${encodeURIComponent(repo)}`, {
      method: 'DELETE',
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Auto Contributor</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdate && (
                <span className="text-xs text-zinc-400">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={fetchData}
                className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Issues"
            value={stats?.total_issues || 0}
            icon={Bug}
            color="bg-blue-500"
          />
          <StatsCard
            title="Pending"
            value={stats?.pending_issues || 0}
            icon={Clock}
            color="bg-yellow-500"
            subtitle={`${stats?.processing_issues || 0} processing`}
          />
          <StatsCard
            title="Completed"
            value={stats?.completed_issues || 0}
            icon={CheckCircle}
            color="bg-green-500"
            subtitle={`${stats?.success_rate?.toFixed(1) || 0}% success rate`}
          />
          <StatsCard
            title="Pull Requests"
            value={stats?.total_prs || 0}
            icon={GitPullRequest}
            color="bg-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-2 mb-4">
              {(['all', 'pending', 'processing', 'completed', 'failed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <IssueTable issues={issues} title={`Issues (${issues.length})`} />
          </div>

          <div className="space-y-6">
            <PRList prs={prs} />
            <BlacklistManager
              entries={blacklist}
              onAdd={handleAddBlacklist}
              onRemove={handleRemoveBlacklist}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
