import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import type { Analytics, TodoItem, TodoStatus } from '../types';

const pieColors = ['#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#a855f7'];

interface AnalyticsPanelProps {
  analytics: Analytics | null;
  todos: TodoItem[];
}

function currency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

const todoStatusColors: Record<TodoStatus, string> = {
  Pending: '#f59e0b',
  'In Progress': '#0ea5e9',
  Completed: '#10b981'
};

export function AnalyticsPanel({ analytics, todos }: AnalyticsPanelProps) {
  if (!analytics) {
    return <div className="card p-3 text-sm text-zinc-500 sm:p-5">Loading analytics...</div>;
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekAhead = new Date(today);
  weekAhead.setDate(today.getDate() + 7);
  const weekAheadStr = weekAhead.toISOString().slice(0, 10);

  const todoStatuses: TodoStatus[] = ['Pending', 'In Progress', 'Completed'];
  const todoStatusCounts = todoStatuses.map((status) => ({
    status,
    count: todos.filter((todo) => todo.status === status).length
  }));

  const overdueTodoCount = todos.filter((todo) => todo.status !== 'Completed' && todo.expectedCompletionDate < todayStr).length;
  const dueThisWeekTodoCount = todos.filter(
    (todo) =>
      todo.status !== 'Completed' &&
      todo.expectedCompletionDate >= todayStr &&
      todo.expectedCompletionDate <= weekAheadStr
  ).length;

  const assigneeWorkloadMap = new Map<string, number>();
  for (const todo of todos) {
    assigneeWorkloadMap.set(todo.assigneeName, (assigneeWorkloadMap.get(todo.assigneeName) ?? 0) + todo.assigneeCount);
  }
  const assigneeWorkload = Array.from(assigneeWorkloadMap.entries())
    .map(([assigneeName, totalAssignees]) => ({ assigneeName, totalAssignees }))
    .sort((a, b) => b.totalAssignees - a.totalAssignees)
    .slice(0, 8);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card p-3 sm:p-5">
          <p className="text-sm text-zinc-500">Total Guests</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900 sm:text-3xl">{analytics.totals.total}</p>
        </div>
        <div className="card p-3 sm:p-5">
          <p className="text-sm text-zinc-500">Pending Responses</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900 sm:text-3xl">{analytics.totals.pending}</p>
        </div>
        <div className="card p-3 sm:p-5">
          <p className="text-sm text-zinc-500">Total Saree Cost</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900 sm:text-3xl">{currency(analytics.sareeMetrics.totalSareeCost)}</p>
        </div>
        <div className="card p-3 sm:p-5">
          <p className="text-sm text-zinc-500">Avg Saree Cost</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900 sm:text-3xl">{currency(analytics.sareeMetrics.avgSareeCost)}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-3 sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-700">RSVP Distribution</h3>
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.rsvpDistribution} dataKey="count" nameKey="status" outerRadius={100} label>
                  {analytics.rsvpDistribution.map((entry, index) => (
                    <Cell key={entry.status} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-3 sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-700">Attendance by Event</h3>
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.eventAttendance}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#047857" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-3 sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-700">Probability Funnel</h3>
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.probabilityDistribution}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-3 sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-700">Data Quality Alerts</h3>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
              Missing Phone: {analytics.dataQuality.missingPhone}
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
              Missing Location: {analytics.dataQuality.missingLocation}
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
              Missing Probability: {analytics.dataQuality.missingProbability}
            </div>
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-rose-900">
              Saree Yes + Cost Missing: {analytics.dataQuality.missingSareeCost}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            Saree Cost Missing (summary): {analytics.sareeMetrics.sareeCostMissing}
          </div>
        </div>
      </div>

      <div className="card p-3 sm:p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-700">Host-wise Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-700">
              <tr>
                <th className="px-3 py-2 font-medium">Host</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Attending</th>
                <th className="px-3 py-2 font-medium">Pending</th>
              </tr>
            </thead>
            <tbody>
              {analytics.hostSummary.map((item) => (
                <tr key={item.host} className="border-t border-zinc-200">
                  <td className="px-3 py-2">{item.host}</td>
                  <td className="px-3 py-2">{item.total}</td>
                  <td className="px-3 py-2">{item.attending}</td>
                  <td className="px-3 py-2">{item.pending}</td>
                </tr>
              ))}
              {!analytics.hostSummary.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                    No host data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-3 sm:p-5">
          <p className="text-sm text-zinc-500">Total Tasks</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900 sm:text-3xl">{todos.length}</p>
        </div>
        <div className="card p-3 sm:p-5">
          <p className="text-sm text-zinc-500">Overdue Tasks</p>
          <p className="mt-2 text-2xl font-semibold text-rose-700 sm:text-3xl">{overdueTodoCount}</p>
        </div>
        <div className="card p-3 sm:p-5">
          <p className="text-sm text-zinc-500">Tasks Due This Week</p>
          <p className="mt-2 text-2xl font-semibold text-blue-700 sm:text-3xl">{dueThisWeekTodoCount}</p>
        </div>
        <div className="card p-3 sm:p-5">
          <p className="text-sm text-zinc-500">Completed Tasks</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700 sm:text-3xl">
            {todoStatusCounts.find((item) => item.status === 'Completed')?.count ?? 0}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-3 sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-700">Task Status Distribution</h3>
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={todoStatusCounts} dataKey="count" nameKey="status" outerRadius={95} label>
                  {todoStatusCounts.map((item) => (
                    <Cell key={item.status} fill={todoStatusColors[item.status]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-3 sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-700">Assignee Workload</h3>
          <div className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assigneeWorkload}>
                <XAxis dataKey="assigneeName" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="totalAssignees" fill="#047857" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
