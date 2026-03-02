import type { ImportJob } from '../types';

interface ImportJobsPanelProps {
  jobs: ImportJob[];
  onRefresh: () => Promise<void>;
}

function statusBadge(status: ImportJob['status']) {
  if (status === 'completed') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (status === 'failed') {
    return 'bg-rose-100 text-rose-800';
  }
  if (status === 'processing') {
    return 'bg-blue-100 text-blue-800';
  }
  return 'bg-zinc-200 text-zinc-700';
}

function progressPercent(job: ImportJob) {
  if (!job.totalRows) {
    return 0;
  }
  return Math.min(100, Math.round((job.processedRows / job.totalRows) * 100));
}

export function ImportJobsPanel({ jobs, onRefresh }: ImportJobsPanelProps) {
  return (
    <section className="space-y-4">
      <div className="card flex flex-col items-start justify-between gap-2 p-3 sm:flex-row sm:items-center sm:p-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Import Queue</h3>
          <p className="text-sm text-zinc-500">Live CSV import status, including skipped and failed rows.</p>
        </div>
        <button className="btn-muted w-full sm:w-auto" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      {!jobs.length && <div className="card p-3 text-sm text-zinc-500 sm:p-5">No import jobs yet.</div>}

      {jobs.map((job) => (
        <article key={job.id} className="card space-y-3 p-3 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-zinc-900">{job.fileName}</p>
              <p className="text-xs text-zinc-500">Job ID: {job.id}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge(job.status)}`}>{job.status}</span>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-zinc-600">
              <span>
                {job.processedRows}/{job.totalRows || '?'} processed
              </span>
              <span>{progressPercent(job)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
              <div className="h-full bg-emerald-500" style={{ width: `${progressPercent(job)}%` }} />
            </div>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-zinc-100 px-3 py-2">Inserted: {job.insertedRows}</div>
            <div className="rounded-xl bg-zinc-100 px-3 py-2">Skipped: {job.skippedRows}</div>
            <div className="rounded-xl bg-zinc-100 px-3 py-2">Failed: {job.failedRows}</div>
            <div className="rounded-xl bg-zinc-100 px-3 py-2">Total: {job.totalRows}</div>
          </div>

          {job.errors.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <p className="mb-1 font-medium">Errors (showing up to 25):</p>
              <ul className="space-y-1">
                {job.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
