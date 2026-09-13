'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw, Bug, CheckCircle, Clock, GitPullRequest, Terminal } from 'lucide-react';
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

type IssueTab = 'all' | 'pending' | 'processing' | 'completed' | 'failed';

/** Abort hung dashboard fetches so polling can recover after a stall. */
const FETCH_TIMEOUT_MS = 15_000;

function isStatsPayload(value: unknown): value is Stats {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.total_issues === 'number' &&
    typeof candidate.pending_issues === 'number' &&
    typeof candidate.processing_issues === 'number' &&
    typeof candidate.completed_issues === 'number' &&
    typeof candidate.failed_issues === 'number' &&
    typeof candidate.total_prs === 'number' &&
    typeof candidate.success_rate === 'number'
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<IssueTab>('all');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const fetchRequestIdRef = useRef(0);
  const fetchInFlightRef = useRef(false);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const issuesFilterRef = useRef<IssueTab>('all');

  const fetchData = useCallback(async (options?: { force?: boolean }) => {
    const force = options?.force ?? true;
    // Skip overlapping polls so a slow in-flight load can finish and clear loading.
    if (fetchInFlightRef.current && !force) {
      return;
    }

    // Abort any prior batch (including hung requests) so force refresh / tab change can recover.
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const requestId = ++fetchRequestIdRef.current;
    const requestedTab = activeTab;
    const isLatest = () => requestId === fetchRequestIdRef.current;
    fetchInFlightRef.current = true;

    try {
      const { signal } = controller;
      const [statsRes, issuesRes, prsRes, blacklistRes] = await Promise.all([
        fetch('/api/stats', { signal }),
        fetch(`/api/issues${requestedTab !== 'all' ? `?status=${requestedTab}` : ''}`, { signal }),
        fetch('/api/prs', { signal }),
        fetch('/api/blacklist', { signal }),
      ]);

      const [statsData, issuesData, prsData, blacklistData] = await Promise.all([
        readJson(statsRes),
        readJson(issuesRes),
        readJson(prsRes),
        readJson(blacklistRes),
      ]);

      if (!isLatest()) {
        return;
      }

      const failures: string[] = [];

      if (statsRes.ok && isStatsPayload(statsData)) {
        setStats(statsData);
      } else {
        failures.push('stats');
      }

      if (issuesRes.ok && Array.isArray(issuesData)) {
        setIssues(issuesData);
        issuesFilterRef.current = requestedTab;
      } else {
        failures.push('issues');
        // Never keep another tab's rows under the newly selected filter.
        if (issuesFilterRef.current !== requestedTab) {
          setIssues([]);
          issuesFilterRef.current = requestedTab;
        }
      }

      if (prsRes.ok && Array.isArray(prsData)) {
        setPrs(prsData);
      } else {
        failures.push('prs');
      }

      if (blacklistRes.ok && Array.isArray(blacklistData)) {
        setBlacklist(blacklistData);
      } else {
        failures.push('blacklist');
      }

      if (failures.length > 0) {
        setFetchError(`Failed to load: ${failures.join(', ')}. Showing last successful data.`);
      } else {
        setFetchError(null);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (!isLatest()) {
        return;
      }
      // Match non-OK issues handling: do not keep another tab's rows after a rejected fetch.
      if (issuesFilterRef.current !== requestedTab) {
        setIssues([]);
        issuesFilterRef.current = requestedTab;
      }
      setFetchError('Failed to refresh dashboard data. Showing last successful data.');
    } finally {
      // Abort siblings still in flight when Promise.all rejects early (one fetch
      // failed while another is stalled). Clearing the timeout alone would leave
      // those requests detached from fetchAbortRef and able to accumulate.
      window.clearTimeout(timeoutId);
      if (!controller.signal.aborted) {
        controller.abort();
      }
      if (fetchAbortRef.current === controller) {
        fetchAbortRef.current = null;
      }
      if (isLatest()) {
        fetchInFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
    const restoreAdminSession = async () => {
      try {
        const res = await fetch('/api/admin/login', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setAdminAuthenticated(Boolean(data.authenticated));
        }
      } catch (error) {
        console.error('Error restoring admin session:', error);
      }
    };
    void restoreAdminSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void fetchData({ force: true });
    const interval = setInterval(() => {
      void fetchData({ force: false });
    }, 10000);
    return () => {
      clearInterval(interval);
      fetchAbortRef.current?.abort();
    };
  }, [fetchData]);

  const handleAdminLogin = async (token: string) => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Unauthorized');
    }
    setAdminAuthenticated(true);
  };

  const handleAdminLogout = async () => {
    await fetch('/api/admin/login', {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    setAdminAuthenticated(false);
  };

  const handleAddBlacklist = async (repo: string, reason: string) => {
    const res = await fetch('/api/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ repo, reason }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) setAdminAuthenticated(false);
      throw new Error(data.error || 'Failed to add to blacklist');
    }
    void fetchData({ force: true });
  };

  const handleRemoveBlacklist = async (repo: string) => {
    const res = await fetch(`/api/blacklist?repo=${encodeURIComponent(repo)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) setAdminAuthenticated(false);
      throw new Error(data.error || 'Failed to remove from blacklist');
    }
    void fetchData({ force: true });
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
                onClick={() => void fetchData({ force: true })}
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
        {fetchError && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 px-4 py-3 text-sm font-mono text-[#ff8a8a]"
          >
            {fetchError}
          </div>
        )}

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
              onAdminLogin={handleAdminLogin}
              onAdminLogout={handleAdminLogout}
              adminAuthenticated={adminAuthenticated}
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
