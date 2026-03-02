import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { StayCandidateItem, StayItem } from '../types';

interface StayPanelProps {
  stays: StayItem[];
  candidates: StayCandidateItem[];
  readOnly: boolean;
  onCreate: (payload: { name: string; location?: string | null; notes?: string | null }) => Promise<void>;
  onUpdate: (stayId: number, payload: { name: string; location?: string | null; notes?: string | null }) => Promise<void>;
  onDelete: (stayId: number, stayName: string) => Promise<void>;
  onAssign: (guestId: number, stayId: number | null) => Promise<void>;
}

const blankForm = {
  name: '',
  location: '',
  notes: ''
};

export function StayPanel({ stays, candidates, readOnly, onCreate, onUpdate, onDelete, onAssign }: StayPanelProps) {
  const [editingStay, setEditingStay] = useState<StayItem | null>(null);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [assigningGuestId, setAssigningGuestId] = useState<number | null>(null);

  function startCreate() {
    setEditingStay(null);
    setForm(blankForm);
  }

  function startEdit(stay: StayItem) {
    setEditingStay(stay);
    setForm({
      name: stay.name,
      location: stay.location ?? '',
      notes: stay.notes ?? ''
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        location: form.location.trim() || null,
        notes: form.notes.trim() || null
      };
      if (editingStay) {
        await onUpdate(editingStay.id, payload);
      } else {
        await onCreate(payload);
      }
      startCreate();
    } finally {
      setSubmitting(false);
    }
  }

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return candidates;
    }
    return candidates.filter((candidate) =>
      [candidate.name, candidate.host ?? '', candidate.family ?? '', candidate.location ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [candidates, search]);

  return (
    <section className="space-y-4">
      <div className="card space-y-4 p-3 sm:p-5">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <h3 className="text-base font-semibold text-zinc-900">{editingStay ? 'Edit Stay' : 'Create Stay'}</h3>
          {editingStay && (
            <button className="btn-muted w-full sm:w-auto" onClick={startCreate} disabled={readOnly}>
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input className="input" placeholder="Stay name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} disabled={readOnly} />
          <input className="input" placeholder="Location" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} disabled={readOnly} />
          <input className="input" placeholder="Notes" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} disabled={readOnly} />
        </div>

        <button className="btn-primary w-full sm:w-auto" onClick={submit} disabled={readOnly || submitting || !form.name.trim()}>
          {submitting ? 'Saving...' : editingStay ? 'Update Stay' : 'Create Stay'}
        </button>
      </div>

      <div className="card space-y-3 p-3 sm:p-5">
        <h3 className="text-base font-semibold text-zinc-900">Stay Groups</h3>
        {!stays.length && <p className="text-sm text-zinc-500">No stays created yet.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {stays.map((stay) => (
            <div key={stay.id} className="rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900">{stay.name}</h4>
                  <p className="text-xs text-zinc-500">{stay.location || 'No location'}</p>
                  {stay.notes && <p className="mt-1 text-xs text-zinc-600">{stay.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-muted px-2 py-1" onClick={() => startEdit(stay)} disabled={readOnly}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn-muted px-2 py-1 text-rose-600" onClick={() => onDelete(stay.id, stay.name)} disabled={readOnly}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-zinc-50 p-3">
                <p className="mb-2 text-xs font-medium text-zinc-600">Guests ({stay.guests.length})</p>
                {stay.guests.length ? (
                  <ul className="space-y-1 text-sm text-zinc-700">
                    {stay.guests.map((guest) => (
                      <li key={guest.id}>
                        {guest.name}
                        {guest.family ? ` (${guest.family})` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500">No guests assigned.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-3 p-3 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-zinc-900">Assign Guests Requiring Stay</h3>
          <input
            className="input w-full sm:max-w-xs"
            placeholder="Search guest"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-2 md:hidden">
          {!filteredCandidates.length && <div className="rounded-xl border border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500">No guests with stay requirement found.</div>}
          {filteredCandidates.map((candidate) => (
            <article key={candidate.id} className="rounded-2xl border border-zinc-200 p-3">
              <p className="text-sm font-semibold text-zinc-900">{candidate.name}</p>
              <p className="text-xs text-zinc-600">Host: {candidate.host || '-'}</p>
              <p className="text-xs text-zinc-600">Family: {candidate.family || '-'}</p>
              <p className="text-xs text-zinc-600">Current: {candidate.stayName || 'Unassigned'}</p>
              <select
                className="input mt-2"
                value={candidate.stayId ?? ''}
                disabled={readOnly || assigningGuestId === candidate.id}
                onChange={async (e) => {
                  const raw = e.target.value;
                  setAssigningGuestId(candidate.id);
                  try {
                    await onAssign(candidate.id, raw ? Number(raw) : null);
                  } finally {
                    setAssigningGuestId(null);
                  }
                }}
              >
                <option value="">Unassigned</option>
                {stays.map((stay) => (
                  <option key={stay.id} value={stay.id}>
                    {stay.name}
                  </option>
                ))}
              </select>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-700">
              <tr>
                <th className="px-3 py-2 font-medium">Guest</th>
                <th className="px-3 py-2 font-medium">Host</th>
                <th className="px-3 py-2 font-medium">Family</th>
                <th className="px-3 py-2 font-medium">Current Stay</th>
                <th className="px-3 py-2 font-medium">Assign</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate) => (
                <tr key={candidate.id} className="border-t border-zinc-200">
                  <td className="px-3 py-2 font-medium text-zinc-900">{candidate.name}</td>
                  <td className="px-3 py-2 text-zinc-700">{candidate.host || '-'}</td>
                  <td className="px-3 py-2 text-zinc-700">{candidate.family || '-'}</td>
                  <td className="px-3 py-2 text-zinc-700">{candidate.stayName || 'Unassigned'}</td>
                  <td className="px-3 py-2">
                    <select
                      className="input"
                      value={candidate.stayId ?? ''}
                      disabled={readOnly || assigningGuestId === candidate.id}
                      onChange={async (e) => {
                        const raw = e.target.value;
                        setAssigningGuestId(candidate.id);
                        try {
                          await onAssign(candidate.id, raw ? Number(raw) : null);
                        } finally {
                          setAssigningGuestId(null);
                        }
                      }}
                    >
                      <option value="">Unassigned</option>
                      {stays.map((stay) => (
                        <option key={stay.id} value={stay.id}>
                          {stay.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {!filteredCandidates.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    No guests with stay requirement found.
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
