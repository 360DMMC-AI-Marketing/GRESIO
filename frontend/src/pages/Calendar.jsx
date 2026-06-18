import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { calendarEvents, projects } from '../services/api';
import AddCalendarItemModal from '../components/AddCalendarItemModal';
import Dropdown from '../components/Dropdown';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const COLORS = {
  task: '#86efac',
  sprint: '#93c5fd',
  project_deadline: '#fca5a5',
  milestone: '#c4b5fd',
  event: '#a78bfa',
  reminder: '#fcd34d',
};

const LABELS = {
  task: 'Task',
  sprint: 'Sprint',
  project_deadline: 'Project Deadline',
  milestone: 'Milestone',
  event: 'Event',
  reminder: 'Reminder',
};

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  const startPad = first.getDay();
  for (let i = 0; i < startPad; i++) days.unshift(null);
  const endPad = 6 - last.getDay();
  for (let i = 0; i < endPad; i++) days.push(null);
  return days;
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d) { return isSameDay(d, new Date()); }

function eventsForDay(events, day) {
  return events.filter(e => isSameDay(new Date(e.date), day));
}

const iconMap = { task: '\u2713', sprint: '\u26A1', project_deadline: '\u2691', milestone: '\u25C6', event: '\u25CF', reminder: '\u23F0' };
const USER_PALETTE = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1', '#ec4899'];

export default function Calendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const canAdd = ['admin', 'project_manager', 'manager'].includes(user?.role);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('month');
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDate, setAddDate] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const monthDays = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);

  const fetchEvents = () => {
    setLoading(true);
    const start = new Date(currentYear, currentMonth - 1, 1);
    const end = new Date(currentYear, currentMonth + 2, 0);
    calendarEvents.getAll({ start: start.toISOString(), end: end.toISOString() })
      .then(r => setEvents(r.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, [currentYear, currentMonth]);

  useEffect(() => {
    projects.getAll().then(r => setAllProjects(r.data || [])).catch(() => {});
  }, []);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
    setSelectedDay(null);
  };

  const goToday = () => { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()); setSelectedDay(today); };

  const handleDayClick = (day) => {
    if (!day) return;
    setSelectedDay(isSameDay(selectedDay, day) ? null : day);
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (selectedProjectId && e.projectId !== selectedProjectId) return false;
      return true;
    });
  }, [events, selectedProjectId]);

  const selectedEvents = selectedDay ? eventsForDay(filteredEvents, selectedDay) : [];

  const agendaGroups = useMemo(() => {
    const groups = { today: [], thisWeek: [], nextWeek: [], later: [] };
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(now); endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    const endOfNextWeek = new Date(endOfWeek); endOfNextWeek.setDate(endOfWeek.getDate() + 7);
    for (const e of filteredEvents) {
      const d = new Date(e.date); d.setHours(0, 0, 0, 0);
      if (isSameDay(d, now)) groups.today.push(e);
      else if (d <= endOfWeek) groups.thisWeek.push(e);
      else if (d <= endOfNextWeek) groups.nextWeek.push(e);
      else groups.later.push(e);
    }
    for (const k of Object.keys(groups)) groups[k].sort((a, b) => new Date(a.date) - new Date(b.date));
    return groups;
  }, [filteredEvents]);

  const openAddModal = (day) => { setAddDate(day || new Date()); setShowAddModal(true); };
  const handleEventCreated = () => { setShowAddModal(false); fetchEvents(); };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white">Calendar</h1>
          <div className="flex items-center gap-3">
            <button onClick={goToday} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer border-none dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600">
              Today
            </button>
            <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-700 rounded-lg px-1 py-1">
              <button onClick={prevMonth}
                className="text-xs font-semibold px-2 py-1 rounded-md hover:bg-white dark:hover:bg-neutral-600 text-neutral-500 dark:text-neutral-300 transition-colors cursor-pointer border-none bg-transparent">&lsaquo;</button>
              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 w-36 text-center select-none">
                {MONTHS[currentMonth]} {currentYear}
              </span>
              <button onClick={nextMonth}
                className="text-xs font-semibold px-2 py-1 rounded-md hover:bg-white dark:hover:bg-neutral-600 text-neutral-500 dark:text-neutral-300 transition-colors cursor-pointer border-none bg-transparent">&rsaquo;</button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 px-5 border-b border-neutral-200 dark:border-neutral-700">
          {['month', 'agenda'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-sm font-semibold pb-2.5 transition-colors cursor-pointer bg-transparent border-none capitalize ${
                activeTab === tab
                  ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400 -mb-[1px]'
                  : 'text-neutral-500 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="px-5 py-2.5 border-b border-neutral-100 dark:border-neutral-700 flex items-center gap-3 flex-wrap">
          <Dropdown
            value={selectedProjectId}
            onChange={v => setSelectedProjectId(v)}
            options={[{value:'', label:'All projects'}, ...allProjects.map(p => ({value:p._id, label:p.name}))]}
          />
        </div>

        <div className="p-5">
      {activeTab === 'month' && (
        <>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm">
            <div className="grid grid-cols-7">
              {DAYS.map(d => (
                <div key={d} className="bg-neutral-50 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 text-[10px] font-semibold text-center py-2.5 uppercase tracking-wider border-b border-r border-neutral-200 dark:border-neutral-700 last:border-r-0">
                  {d}
                </div>
              ))}
              {monthDays.map((day, i) => {
                if (!day) return <div key={`e${i}`} className="bg-neutral-50/40 dark:bg-neutral-900 min-h-[105px] border-b border-r border-neutral-200 dark:border-neutral-700 last:border-r-0" />;
                const dayEvts = eventsForDay(filteredEvents, day);
                const isSel = isSameDay(selectedDay, day);
                const rowNum = Math.floor(i / 7);
                const totalRows = Math.ceil(monthDays.length / 7);
                const isLastRow = rowNum === totalRows - 1;
                return (
                  <div key={i} onClick={() => handleDayClick(day)}
                    className={`min-h-[110px] p-3 cursor-pointer transition-all duration-150 relative border-r border-neutral-200 dark:border-neutral-700 last:border-r-0 ${isLastRow ? '' : 'border-b'} ${
                      isSel
                        ? 'bg-brand-50/70 dark:bg-brand-900/25 ring-1 ring-inset ring-brand-200 dark:ring-brand-700'
                        : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}>
                    <div className={`text-xs font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1.5 transition-colors ${
                      isToday(day)
                        ? 'bg-brand-600 dark:bg-brand-500 text-white shadow-sm'
                        : isSel
                          ? 'text-brand-700 dark:text-brand-300'
                          : 'text-neutral-600 dark:text-neutral-300'
                    }`}>
                      {day.getDate()}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {dayEvts.slice(0, 4).map((e, j) => (
                        <span key={j}
                          className="text-[9px] font-medium truncate rounded px-1 py-0.5 leading-none inline-block"
                          style={{ background: `${COLORS[e.type] || '#6b7280'}22`, color: COLORS[e.type]?.replace('8', '7') || '#6b7280' }}
                          title={e.title || e.name || ''}>
                          {e.title || e.name || ''}
                        </span>
                      ))}
                      {dayEvts.length > 4 && <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-medium mt-0.5">+{dayEvts.length - 4} more</span>}
                    </div>
                    {canAdd && (
                      <button onClick={(e) => { e.stopPropagation(); openAddModal(day); }}
                        className="absolute bottom-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-[11px] leading-none cursor-pointer border-none transition-all duration-150 hover:scale-110">
                        +
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 text-[10px] text-neutral-400 dark:text-neutral-500 flex-wrap">
            {Object.entries(COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-neutral-500 dark:text-neutral-400">{LABELS[key]}</span>
              </div>
            ))}
          </div>

          {selectedDay && (
            <div className="mt-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
                <div className="flex items-center gap-2.5">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">
                    {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded-full">{selectedEvents.length} item{selectedEvents.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                {canAdd && (
                  <button onClick={() => openAddModal(selectedDay)}
                    className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 px-3 py-1 rounded-md transition-colors cursor-pointer bg-transparent border-none">
                    + Add
                  </button>
                )}
                  <button onClick={() => setSelectedDay(null)}
                    className="text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400 text-lg leading-none bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">&times;</button>
                </div>
              </div>
              <div className="p-3">
                {selectedEvents.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 py-5 text-center">No items for this day</p>
                ) : (
                  <div className="space-y-0.5">
                    {selectedEvents.map(e => (
                      <div key={e._id} onClick={() => { if (e.projectId) navigate(`/projects/${e.projectId}`); }}
                        className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors ${
                          e.projectId ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/40' : ''
                        }`}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[e.type] || '#6b7280' }} />
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 w-16 shrink-0">
                          {e.endDate
                            ? `${new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${new Date(e.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-neutral-900 dark:text-white truncate">{e.title || e.name}</p>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{LABELS[e.type] || e.type}{e.projectName ? ` \u00B7 ${e.projectName}` : ''}</p>
                          {e.link && e.source === 'custom' && (
                            <a href={e.link} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 mt-0.5">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              Join meeting
                            </a>
                          )}
                        </div>
                        <span className="text-xs opacity-40">{iconMap[e.type] || '\u2022'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'agenda' && (
        <div className="space-y-8">
          {agendaGroups.today.length === 0 && agendaGroups.thisWeek.length === 0 && agendaGroups.nextWeek.length === 0 && agendaGroups.later.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-neutral-400 dark:text-neutral-500">No upcoming events</p>
              {canAdd && (
                <button onClick={() => openAddModal(new Date())}
                  className="mt-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer bg-transparent border-none">
                  Add your first event
                </button>
              )}
            </div>
          ) : (
            <>
              {agendaGroups.today.length > 0 && (
                <AgendaSection title="Today" events={agendaGroups.today} colors={COLORS} labels={LABELS} icons={iconMap} onAdd={canAdd ? () => openAddModal(new Date()) : null} navigate={navigate} />
              )}
              <AgendaSection title="This Week" events={agendaGroups.thisWeek} colors={COLORS} labels={LABELS} icons={iconMap} onAdd={canAdd ? () => openAddModal(new Date()) : null} navigate={navigate} />
              {agendaGroups.nextWeek.length > 0 && (
                <AgendaSection title="Next Week" events={agendaGroups.nextWeek} colors={COLORS} labels={LABELS} icons={iconMap} navigate={navigate} />
              )}
              {agendaGroups.later.length > 0 && (
                <AgendaSection title="Later" events={agendaGroups.later} colors={COLORS} labels={LABELS} icons={iconMap} navigate={navigate} />
              )}
            </>
          )}
        </div>
      )}

      {canAdd && (
        <button onClick={() => openAddModal(new Date())}
          className="fixed bottom-6 right-6 w-12 h-12 bg-brand-600 dark:bg-brand-500 text-white rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-brand-700 dark:hover:bg-brand-600 transition-colors cursor-pointer border-none z-40">
          +
        </button>
      )}

      {showAddModal && (
        <AddCalendarItemModal defaultDate={addDate} onClose={() => setShowAddModal(false)} onCreated={handleEventCreated} />
      )}
        </div>
      </div>
    </div>
  );
}

function AgendaSection({ title, events, colors, labels, icons, onAdd, navigate }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{title}</h3>
        {onAdd && (
          <button onClick={onAdd}
            className="text-[10px] font-semibold text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 cursor-pointer bg-transparent border-none transition-colors">
            + Add
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {events.map(e => (
          <div key={e._id} onClick={() => { if (e.projectId) navigate(`/projects/${e.projectId}`); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm ${e.projectId ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50' : ''}`}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[e.type] || '#6b7280' }} />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 w-14 shrink-0">
              {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-neutral-900 dark:text-white truncate">{e.title}</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{labels[e.type] || e.type}{e.projectName ? ` \u00B7 ${e.projectName}` : ''}</p>
              {e.link && e.source === 'custom' && (
                <a href={e.link} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Join meeting
                </a>
              )}
            </div>
            <span className="text-xs opacity-60">{icons[e.type] || '\u2022'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
