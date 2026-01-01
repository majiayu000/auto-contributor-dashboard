'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Bug, CheckCircle, XCircle, Clock, GitPullRequest, Zap, Terminal } from 'lucide-react';
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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#1a1a24] border-t-[#00ff9d] spinner mx-auto" />
          <p className="mt-4 text-sm text-[#71717a] font-mono">Initializing system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] grid-bg">
      {/* Scanline overlay */}
      <div className="scanlines" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Terminal className="w-8 h-8 text-[#00ff9d]" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00ff9d] rounded-full pulse-indicator" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#e4e4e7] tracking-tight">
                  Auto Contributor
                </h1>
                <p className="text-xs text-[#71717a] font-mono">
                  v1.0.0 • System Active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {lastUpdate && (
                <div className="flex items-center gap-2 text-xs text-[#52525b] font-mono">
                  <span className="w-1.5 h-1.5 bg-[#00ff9d] rounded-full" />
                  <span>Synced {lastUpdate.toLocaleTimeString()}</span>
                </div>
              )}
              <button
                onClick={fetchData}
                className="p-2 text-[#71717a] hover:text-[#00ff9d] hover:bg-[#1a1a24] rounded-lg transition-all group"
              >
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Issues"
            value={stats?.total_issues || 0}
            icon={Bug}
            variant="info"
          />
          <StatsCard
            title="Pending"
            value={stats?.pending_issues || 0}
            icon={Clock}
            variant="warning"
            subtitle={`${stats?.processing_issues || 0} processing`}
          />
          <StatsCard
            title="Completed"
            value={stats?.completed_issues || 0}
            icon={CheckCircle}
            variant="success"
            subtitle={`${stats?.success_rate?.toFixed(1) || 0}% success rate`}
          />
          <StatsCard
            title="Pull Requests"
            value={stats?.total_prs || 0}
            icon={GitPullRequest}
            variant="purple"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Issues Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 p-1 bg-[#12121a] rounded-lg border border-white/5 w-fit">
              {(['all', 'pending', 'processing', 'completed', 'failed'] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-xs font-mono font-medium rounded-md transition-all ${
                      isActive
                        ? 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/20'
                        : 'text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#1a1a24]'
                    }`}
                  >
                    {tab.toUpperCase()}
                  </button>
                );
              })}
            </div>

            <IssueTable issues={issues} title={`Issues (${issues.length})`} />
          </div>

          {/* Sidebar */}
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

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-xs text-[#52525b] font-mono">
            <span>Auto Contributor Dashboard</span>
            <span>Powered by Claude</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
