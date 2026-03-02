import { Pencil, Trash2 } from 'lucide-react';
import type { EventItem, Guest } from '../types';

interface GuestTableProps {
  guests: Guest[];
  events: EventItem[];
  selectedGuestIds: number[];
  onToggleSelectGuest: (guestId: number, selected: boolean) => void;
  onToggleSelectAll: (selected: boolean) => void;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => Promise<void>;
}

const statusStyles: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800',
  Attending: 'bg-emerald-100 text-emerald-800',
  Declined: 'bg-rose-100 text-rose-800'
};

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No';
}

export function GuestTable({
  guests,
  events,
  selectedGuestIds,
  onToggleSelectGuest,
  onToggleSelectAll,
  onEdit,
  onDelete
}: GuestTableProps) {
  const allSelected = guests.length > 0 && guests.every((guest) => selectedGuestIds.includes(guest.id));

  return (
    <div className="card min-w-0 overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[1240px] text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-700">
            <tr>
              <th className="sticky left-0 z-30 w-12 bg-zinc-100 px-3 py-3 font-medium">
                <input type="checkbox" checked={allSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} />
              </th>
              <th className="sticky left-12 z-30 min-w-[180px] bg-zinc-100 px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Host</th>
              <th className="px-4 py-3 font-medium">Family</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Stay Required</th>
              <th className="px-4 py-3 font-medium">Probability</th>
              <th className="px-4 py-3 font-medium">Saree</th>
              <th className="px-4 py-3 font-medium">Physical Patrika</th>
              <th className="px-4 py-3 font-medium">Return Gift</th>
              <th className="px-4 py-3 font-medium">Saree Cost</th>
              <th className="px-4 py-3 font-medium">RSVP</th>
              <th className="px-4 py-3 font-medium">Events</th>
              <th className="sticky right-0 z-30 min-w-[110px] bg-zinc-100 px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id} className="border-t border-zinc-200">
                <td className="sticky left-0 z-20 bg-white px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedGuestIds.includes(guest.id)}
                    onChange={(e) => onToggleSelectGuest(guest.id, e.target.checked)}
                  />
                </td>
                <td className="sticky left-12 z-20 min-w-[180px] bg-white px-4 py-3 font-medium text-zinc-900">{guest.name}</td>
                <td className="px-4 py-3 text-zinc-700">{guest.host || '-'}</td>
                <td className="px-4 py-3 text-zinc-700">{guest.family || '-'}</td>
                <td className="px-4 py-3 text-zinc-700">{guest.location || '-'}</td>
                <td className="px-4 py-3 text-zinc-700">{yesNo(guest.stayRequired)}</td>
                <td className="px-4 py-3 text-zinc-700">{guest.probability || '-'}</td>
                <td className="px-4 py-3 text-zinc-700">{yesNo(guest.saree)}</td>
                <td className="px-4 py-3 text-zinc-700">{yesNo(guest.physicalPatrika)}</td>
                <td className="px-4 py-3 text-zinc-700">{yesNo(guest.returnGift)}</td>
                <td className="px-4 py-3 text-zinc-700">{guest.sareeCost ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[guest.rsvpStatus]}`}>
                    {guest.rsvpStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {events
                    .filter((event) => guest.attendance[event.slug])
                    .map((event) => event.name)
                    .join(', ') || '-'}
                </td>
                <td className="sticky right-0 z-20 bg-white px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="btn-muted px-2 py-1" onClick={() => onEdit(guest)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn-muted px-2 py-1 text-rose-600" onClick={() => onDelete(guest)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!guests.length && (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-zinc-500">
                  No guests found with current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
