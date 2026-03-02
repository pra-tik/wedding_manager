import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { TodoItem, TodoStatus } from '../types';

type TodoPayload = Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>;

interface TodoPanelProps {
  todos: TodoItem[];
  onCreate: (payload: TodoPayload) => Promise<void>;
  onUpdate: (todoId: number, payload: TodoPayload) => Promise<void>;
  onDelete: (todoId: number, title: string) => Promise<void>;
  readOnly?: boolean;
}

const statuses: TodoStatus[] = ['Pending', 'In Progress', 'Completed'];

const initialForm: TodoPayload = {
  title: '',
  assigneeName: '',
  assigneeCount: 1,
  status: 'Pending',
  expectedCompletionDate: ''
};

export function TodoPanel({ todos, onCreate, onUpdate, onDelete, readOnly = false }: TodoPanelProps) {
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [form, setForm] = useState<TodoPayload>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  function startCreate() {
    setEditingTodo(null);
    setForm(initialForm);
  }

  function startEdit(todo: TodoItem) {
    setEditingTodo(todo);
    setForm({
      title: todo.title,
      assigneeName: todo.assigneeName,
      assigneeCount: todo.assigneeCount,
      status: todo.status,
      expectedCompletionDate: todo.expectedCompletionDate
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      if (editingTodo) {
        await onUpdate(editingTodo.id, form);
      } else {
        await onCreate(form);
      }
      startCreate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="card space-y-4 p-3 sm:p-5">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <h3 className="text-base font-semibold text-zinc-900">{editingTodo ? 'Edit Task' : 'Add Task'}</h3>
          {editingTodo && (
            <button className="btn-muted w-full sm:w-auto" onClick={startCreate}>
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="input"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            disabled={readOnly}
          />
          <input
            className="input"
            placeholder="Assignee name"
            value={form.assigneeName}
            onChange={(e) => setForm((prev) => ({ ...prev, assigneeName: e.target.value }))}
            disabled={readOnly}
          />
          <input
            className="input"
            type="number"
            min="1"
            placeholder="Number of assignee"
            value={form.assigneeCount}
            onChange={(e) => setForm((prev) => ({ ...prev, assigneeCount: Number(e.target.value) || 1 }))}
            disabled={readOnly}
          />
          <select
            className="input"
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as TodoStatus }))}
            disabled={readOnly}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            value={form.expectedCompletionDate}
            onChange={(e) => setForm((prev) => ({ ...prev, expectedCompletionDate: e.target.value }))}
            disabled={readOnly}
          />
        </div>

        <button
          className="btn-primary w-full sm:w-auto"
          onClick={submit}
          disabled={readOnly || submitting || !form.title || !form.assigneeName || !form.expectedCompletionDate}
        >
          {submitting ? 'Saving...' : editingTodo ? 'Update Task' : 'Add Task'}
        </button>
      </div>

      <div className="card space-y-3 p-3 md:hidden">
        <h4 className="text-sm font-semibold text-zinc-800">Tasks ({todos.length})</h4>
        {!todos.length && <p className="text-sm text-zinc-500">No tasks yet.</p>}
        {todos.map((todo) => (
          <article key={todo.id} className="rounded-2xl border border-zinc-200 p-3">
            <p className="text-sm font-semibold text-zinc-900">{todo.title}</p>
            <p className="text-xs text-zinc-600">Assignee: {todo.assigneeName} ({todo.assigneeCount})</p>
            <p className="text-xs text-zinc-600">Status: {todo.status}</p>
            <p className="text-xs text-zinc-600">Due: {todo.expectedCompletionDate}</p>
            <div className="mt-3 flex gap-2">
              <button className="btn-muted flex-1 px-2 py-1 text-xs" onClick={() => startEdit(todo)} disabled={readOnly}>
                <Pencil size={14} /> Edit
              </button>
              <button className="btn-muted flex-1 px-2 py-1 text-xs text-rose-600" onClick={() => onDelete(todo.id, todo.title)} disabled={readOnly}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Assignee Count</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Expected Completion</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {todos.map((todo) => (
                <tr key={todo.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium text-zinc-900">{todo.title}</td>
                  <td className="px-4 py-3 text-zinc-700">{todo.assigneeName}</td>
                  <td className="px-4 py-3 text-zinc-700">{todo.assigneeCount}</td>
                  <td className="px-4 py-3 text-zinc-700">{todo.status}</td>
                  <td className="px-4 py-3 text-zinc-700">{todo.expectedCompletionDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="btn-muted px-2 py-1" onClick={() => startEdit(todo)} disabled={readOnly}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn-muted px-2 py-1 text-rose-600" onClick={() => onDelete(todo.id, todo.title)} disabled={readOnly}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!todos.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No tasks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
