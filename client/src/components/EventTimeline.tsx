import { CalendarClock, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import type { EventItem } from '../types';

interface EventTimelineProps {
  events: EventItem[];
}

function formatDate(dateText: string) {
  return new Date(dateText).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <div className="space-y-3">
      {events.map((eventItem, index) => (
        <motion.article
          key={eventItem.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          className="card p-3 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">{eventItem.name}</h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
                <CalendarClock size={16} />
                <span>
                  {formatDate(eventItem.eventDate)} at {eventItem.eventTime}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-zinc-600">
                <MapPin size={16} />
                <span>{eventItem.location}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {eventItem.lunchProvided && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">Lunch</span>}
                {eventItem.dinnerProvided && <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">Dinner</span>}
                {eventItem.snacksProvided && <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">Snacks</span>}
                {eventItem.dressTheme && <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-800">Theme: {eventItem.dressTheme}</span>}
                {eventItem.otherOptions && (
                  <span className="rounded-full bg-zinc-200 px-2 py-1 text-zinc-700">{eventItem.otherOptions}</span>
                )}
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">Event {index + 1}</span>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
