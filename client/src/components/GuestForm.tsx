import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { EventItem, Guest, RsvpStatus } from '../types';

interface GuestFormProps {
  events: EventItem[];
  initialGuest?: Guest | null;
  onCancel: () => void;
  onSubmit: (payload: Omit<Guest, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const statuses: RsvpStatus[] = ['Pending', 'Attending', 'Declined'];

export function GuestForm({ events, initialGuest, onCancel, onSubmit }: GuestFormProps) {
  const defaultAttendance = useMemo(
    () => events.reduce<Record<string, boolean>>((acc, event) => ({ ...acc, [event.slug]: false }), {}),
    [events]
  );

  const [host, setHost] = useState(initialGuest?.host ?? '');
  const [name, setName] = useState(initialGuest?.name ?? '');
  const [family, setFamily] = useState(initialGuest?.family ?? '');
  const [location, setLocation] = useState(initialGuest?.location ?? '');
  const [stayRequired, setStayRequired] = useState(Boolean(initialGuest?.stayRequired));
  const [saree, setSaree] = useState(Boolean(initialGuest?.saree));
  const [probability, setProbability] = useState(initialGuest?.probability ?? '');
  const [physicalPatrika, setPhysicalPatrika] = useState(Boolean(initialGuest?.physicalPatrika));
  const [returnGift, setReturnGift] = useState(Boolean(initialGuest?.returnGift));
  const [sareeCost, setSareeCost] = useState(initialGuest?.sareeCost?.toString() ?? '');
  const [email, setEmail] = useState(initialGuest?.email ?? '');
  const [phone, setPhone] = useState(initialGuest?.phone ?? '');
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(initialGuest?.rsvpStatus ?? 'Pending');
  const [attendance, setAttendance] = useState<Record<string, boolean>>(
    initialGuest?.attendance ?? defaultAttendance
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        host: host || null,
        name,
        family: family || null,
        location: location || null,
        stayRequired,
        saree,
        probability: probability || null,
        physicalPatrika,
        returnGift,
        sareeCost: sareeCost ? Number(sareeCost) : null,
        email: email || null,
        phone: phone || null,
        rsvpStatus,
        attendance
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-3 sm:p-5">
      <h2 className="text-base font-semibold text-zinc-900">{initialGuest ? 'Edit Guest' : 'Add New Guest'}</h2>

      <div className="grid gap-3 md:grid-cols-2">
        <input className="input" placeholder="Host" value={host} onChange={(e) => setHost(e.target.value)} />
        <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="Family" value={family} onChange={(e) => setFamily(e.target.value)} />
        <input className="input" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="input" placeholder="Probability (e.g. High)" value={probability} onChange={(e) => setProbability(e.target.value)} />
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          placeholder="Saree Cost"
          value={sareeCost}
          onChange={(e) => setSareeCost(e.target.value)}
        />
        <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <select className="input" value={rsvpStatus} onChange={(e) => setRsvpStatus(e.target.value as RsvpStatus)}>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm">
          <span>Stay Required</span>
          <input type="checkbox" checked={stayRequired} onChange={(e) => setStayRequired(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm">
          <span>Saree</span>
          <input type="checkbox" checked={saree} onChange={(e) => setSaree(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm">
          <span>Physical Patrika</span>
          <input type="checkbox" checked={physicalPatrika} onChange={(e) => setPhysicalPatrika(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm">
          <span>Return Gift</span>
          <input type="checkbox" checked={returnGift} onChange={(e) => setReturnGift(e.target.checked)} />
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-600">Event Attendance</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {events.map((eventItem) => (
            <label key={eventItem.id} className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm">
              <span>{eventItem.name}</span>
              <input
                type="checkbox"
                checked={Boolean(attendance[eventItem.slug])}
                onChange={(e) =>
                  setAttendance((prev) => ({
                    ...prev,
                    [eventItem.slug]: e.target.checked
                  }))
                }
              />
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:flex">
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Guest'}
        </button>
        <button type="button" className="btn-muted w-full sm:w-auto" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
