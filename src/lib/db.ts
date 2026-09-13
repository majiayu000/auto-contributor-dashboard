import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export interface Issue {
  id: number;
  repo: string;
  issue_number: number;
  title: string;
  body: string;
  labels: string;
  language: string;
  difficulty_score: number;
  status: string;
  error_message: string | null;
  retry_count: number;
  discovered_at: string;
  updated_at: string;
}

export interface PullRequest {
  id: number;
  issue_id: number;
  pr_url: string;
  pr_number: number;
  branch_name: string;
  status: string;
  ci_status: string;
  created_at: string;
}

export interface SolveAttempt {
  id: number;
  issue_id: number;
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  success: boolean;
  failure_reason: string | null;
}

export interface BlacklistEntry {
  id: number;
  repo: string;
  reason: string;
  added_at: string;
}

export interface Stats {
  total_issues: number;
  pending_issues: number;
  processing_issues: number;
  completed_issues: number;
  failed_issues: number;
  total_prs: number;
  success_rate: number;
}

const DEFAULT_LIMIT = 50;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

/** Parse and clamp a LIMIT value. NaN / non-positive → default; then clamp to [min, max]. */
export function parseLimit(
  raw: string | number | null | undefined,
  options: { default?: number; min?: number; max?: number } = {}
): number {
  const defaultLimit = options.default ?? DEFAULT_LIMIT;
  const min = options.min ?? MIN_LIMIT;
  const max = options.max ?? MAX_LIMIT;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) {
    return defaultLimit;
  }
  return Math.min(max, Math.max(min, n));
}

export async function getIssues(status?: string, limit = DEFAULT_LIMIT): Promise<Issue[]> {
  const safeLimit = parseLimit(limit);
  let query = 'SELECT * FROM issues';
  const params: (string | number)[] = [];

  if (status) {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY updated_at DESC LIMIT $' + (params.length + 1);
  params.push(safeLimit);

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getPullRequests(limit = DEFAULT_LIMIT): Promise<PullRequest[]> {
  const safeLimit = parseLimit(limit);
  const result = await pool.query(
    'SELECT * FROM pull_requests ORDER BY created_at DESC LIMIT $1',
    [safeLimit]
  );
  return result.rows;
}

export async function getSolveAttempts(limit = 100): Promise<SolveAttempt[]> {
  const result = await pool.query(
    'SELECT * FROM solve_attempts ORDER BY started_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
}

export async function getBlacklist(): Promise<BlacklistEntry[]> {
  const result = await pool.query('SELECT * FROM blacklist ORDER BY added_at DESC');
  return result.rows;
}

export async function getStats(): Promise<Stats> {
  const issueStats = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'processing') as processing,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM issues
  `);

  const prStats = await pool.query('SELECT COUNT(*) as total FROM pull_requests');

  const row = issueStats.rows[0];
  const total = parseInt(row.total) || 0;
  const completed = parseInt(row.completed) || 0;
  const failed = parseInt(row.failed) || 0;

  return {
    total_issues: total,
    pending_issues: parseInt(row.pending) || 0,
    processing_issues: parseInt(row.processing) || 0,
    completed_issues: completed,
    failed_issues: failed,
    total_prs: parseInt(prStats.rows[0].total) || 0,
    success_rate: (completed + failed) > 0 ? (completed / (completed + failed)) * 100 : 0
  };
}

export async function addToBlacklist(repo: string, reason: string): Promise<void> {
  await pool.query(
    'INSERT INTO blacklist (repo, reason) VALUES ($1, $2) ON CONFLICT(repo) DO UPDATE SET reason = $2',
    [repo, reason]
  );
}

export async function removeFromBlacklist(repo: string): Promise<void> {
  await pool.query('DELETE FROM blacklist WHERE repo = $1', [repo]);
}
