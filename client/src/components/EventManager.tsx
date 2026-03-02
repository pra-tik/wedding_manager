import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { EventItem } from '../types';

type EventFormPayload = Omit<EventItem, 'id' | 'slug'>;

interface EventManagerProps {
  events: EventItem[];
  onCreate: (payload: EventFormPayload) => Promise<void>;
  onUpdate: (eventId: number, payload: EventFormPayload) => Promise<void>;
  onDelete: (eventId: number, eventName: string) => Promise<void>;
  readOnly?: boolean;
}

const initialForm: EventFormPayload = {
  name: '',
  eventDate: '',
  eventTime: '',
  location: '',
  lunchProvided: false,
  dinnerProvided: false,
  snacksProvided: false,
  dressTheme: '',
  otherOptions: ''
};

export function EventManager({ events, onCreate, onUpdate, onDelete, readOnly = false }: EventManagerProps) {
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [form, setForm] = useState<EventFormPayload>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  function startCreate() {
    setEditingEvent(null);
    setForm(initialForm);
  }

  function startEdit(eventItem: EventItem) {
    setEditingEvent(eventItem);
    setForm({
      name: eventItem.name,
      eventDate: eventItem.eventDate,
      eventTime: eventItem.eventTime,
      location: eventItem.location,
      lunchProvided: eventItem.lunchProvided,
      dinnerProvided: eventItem.dinnerProvided,
      snacksProvided: eventItem.snacksProvided,
      dressTheme: eventItem.dressTheme ?? '',
      otherOptions: eventItem.otherOptions ?? ''
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      if (editingEvent) {
        await onUpdate(editingEvent.id, form);
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
          <h3 className="text-base font-semibold text-zinc-900">{editingEvent ? 'Edit Event' : 'Add Event'}</h3>
          {editingEvent && (
            <button className="btn-muted w-full sm:w-auto" onClick={startCreate}>
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" placeholder="Event name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} disabled={readOnly} />
          <input className="input" placeholder="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} disabled={readOnly} />
          <input className="input" type="date" value={form.eventDate} onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))} disabled={readOnly} />
          <input className="input" type="time" value={form.eventTime} onChange={(e) => setForm((p) => ({ ...p, eventTime: e.target.value }))} disabled={readOnly} />
          <input className="input" placeholder="Dress theme" value={form.dressTheme ?? ''} onChange={(e) => setForm((p) => ({ ...p, dressTheme: e.target.value }))} disabled={readOnly} />
          <input className="input" placeholder="Other options" value={form.otherOptions ?? ''} onChange={(e) => setForm((p) => ({ ...p, otherOptions: e.target.value }))} disabled={readOnly} />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm">
            <span>Lunch</span>
            <input
              type="checkbox"
              checked={form.lunchProvided}
              onChange={(e) => setForm((p) => ({ ...p, lunchProvided: e.target.checked }))}
              disabled={readOnly}
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm">
            <span>Dinner</span>
            <input
              type="checkbox"
              checked={form.dinnerProvided}
              onChange={(e) => setForm((p) => ({ ...p, dinnerProvided: e.target.checked }))}
              disabled={readOnly}
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm">
            <span>Snacks</span>
            <input
              type="checkbox"
              checked={form.snacksProvided}
              onChange={(e) => setForm((p) => ({ ...p, snacksProvided: e.target.checked }))}
              disabled={readOnly}
            />
          </label>
        </div>

        <button
          className="btn-primary w-full sm:w-auto"
          onClick={submit}
          disabled={readOnly || submitting || !form.name || !form.eventDate || !form.eventTime || !form.location}
        >
          {submitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Meals</th>
                <th className="px-4 py-3 font-medium">Theme</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((eventItem) => (
                <tr key={eventItem.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium text-zinc-900">{eventItem.name}</td>
                  <td className="px-4 py-3 text-zinc-700">{eventItem.eventDate}</td>
                  <td className="px-4 py-3 text-zinc-700">{eventItem.eventTime}</td>
                  <td className="px-4 py-3 text-zinc-700">{eventItem.location}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {[eventItem.lunchProvided && 'Lunch', eventItem.dinnerProvided && 'Dinner', eventItem.snacksProvided && 'Snacks']
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{eventItem.dressTheme || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="btn-muted px-2 py-1" onClick={() => startEdit(eventItem)} disabled={readOnly}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn-muted px-2 py-1 text-rose-600" onClick={() => onDelete(eventItem.id, eventItem.name)} disabled={readOnly}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!events.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No events yet.
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
