import { useEffect, useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import api from '../lib/api';

interface CalendarItem {
  id: string;
  title: string;
  date: string;
  type: 'milestone' | 'task' | 'event' | 'availability';
  status?: string;
  projectName?: string;
  contractorName?: string;
  availabilityType?: string;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadCalendarData = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await api.get(`/calendar?year=${year}&month=${month}`);

      const allItems: CalendarItem[] = [];

      // Milestones
      response.data.milestones?.forEach((m: any) => {
        allItems.push({
          id: m.id,
          title: m.name,
          date: m.dueDate,
          type: 'milestone',
          status: m.status,
          projectName: m.project?.name,
        });
      });

      // Tasks
      response.data.tasks?.forEach((t: any) => {
        if (t.dueDate) {
          allItems.push({
            id: t.id,
            title: t.title,
            date: t.dueDate,
            type: 'task',
            status: t.status,
            projectName: t.project?.name,
            contractorName: t.contractor ? `${t.contractor.firstName} ${t.contractor.lastName}` : undefined,
          });
        }
      });

      // Events
      response.data.events?.forEach((e: any) => {
        allItems.push({
          id: e.id,
          title: e.title,
          date: e.startDate,
          type: 'event',
          projectName: e.project?.name,
        });
      });

      // Availabilities
      response.data.availabilities?.forEach((a: any) => {
        allItems.push({
          id: a.id,
          title: `${a.contractor?.firstName} ${a.contractor?.lastName}`,
          date: a.startDate,
          type: 'availability',
          availabilityType: a.type,
          contractorName: `${a.contractor?.firstName} ${a.contractor?.lastName}`,
        });
      });

      setItems(allItems);
    } catch (error) {
      console.error('Erreur chargement calendrier:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getItemsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return items.filter(item => item.date.split('T')[0] === dateStr);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = getDaysInMonth(currentDate);
  const today = formatDate(new Date());
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'milestone': return <FlagIcon className="h-3 w-3" />;
      case 'task': return <ClipboardDocumentListIcon className="h-3 w-3" />;
      case 'event': return <CalendarDaysIcon className="h-3 w-3" />;
      case 'availability': return <UserGroupIcon className="h-3 w-3" />;
      default: return null;
    }
  };

  const getTypeColor = (item: CalendarItem) => {
    if (item.type === 'availability') {
      switch (item.availabilityType) {
        case 'AVAILABLE': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
        case 'BUSY': return 'bg-red-500/20 text-red-300 border-red-500/30';
        case 'VACATION': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
        default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      }
    }
    switch (item.type) {
      case 'milestone': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'task': return 'bg-primary-500/20 text-primary-300 border-primary-500/30';
      case 'event': return 'bg-accent-500/20 text-accent-300 border-accent-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const selectedDateItems = selectedDate ? items.filter(item => item.date.split('T')[0] === selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Calendrier</h1>
          <p className="mt-1 text-sm text-gray-400">
            Vue d'ensemble de vos échéances et disponibilités
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500"></div>
            <span className="text-sm text-gray-400">Jalons</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary-500"></div>
            <span className="text-sm text-gray-400">Tâches</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent-500"></div>
            <span className="text-sm text-gray-400">Événements</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500"></div>
            <span className="text-sm text-gray-400">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-sm text-gray-400">Occupé</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span className="text-sm text-gray-400">Congés</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-100">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={goToToday} className="btn-secondary text-sm py-1.5 px-3">
                Aujourd'hui
              </button>
              <button
                onClick={prevMonth}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-dark-700 rounded-lg"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-dark-700 rounded-lg"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const dateStr = formatDate(day.date);
                const dayItems = getItemsForDate(day.date);
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-h-[80px] p-2 rounded-lg text-left transition-all ${
                      !day.isCurrentMonth ? 'opacity-40' : ''
                    } ${
                      isToday ? 'bg-primary-500/20 border border-primary-500/50' :
                      isSelected ? 'bg-dark-700 border border-primary-500/30' :
                      'hover:bg-dark-700/50'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday ? 'text-primary-400' : 'text-gray-300'
                    }`}>
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className={`text-xs px-1.5 py-0.5 rounded border truncate ${getTypeColor(item)}`}
                        >
                          {item.title}
                        </div>
                      ))}
                      {dayItems.length > 2 && (
                        <div className="text-xs text-gray-500">+{dayItems.length - 2}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            {selectedDate ? (
              <>
                {new Date(selectedDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </>
            ) : (
              'Sélectionnez une date'
            )}
          </h3>

          {selectedDate && selectedDateItems.length > 0 ? (
            <div className="space-y-3">
              {selectedDateItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${getTypeColor(item)}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getTypeIcon(item.type)}
                    <span className="font-medium text-sm">{item.title}</span>
                  </div>
                  {item.projectName && (
                    <p className="text-xs opacity-70">{item.projectName}</p>
                  )}
                  {item.contractorName && item.type === 'task' && (
                    <p className="text-xs opacity-70">Assigné à: {item.contractorName}</p>
                  )}
                  {item.status && (
                    <p className="text-xs opacity-70 mt-1">Statut: {item.status}</p>
                  )}
                </div>
              ))}
            </div>
          ) : selectedDate ? (
            <p className="text-gray-500 text-sm">Aucun élément pour cette date</p>
          ) : (
            <p className="text-gray-500 text-sm">
              Cliquez sur une date pour voir les détails
            </p>
          )}

          {/* Upcoming items */}
          <div className="mt-6 pt-6 border-t border-dark-700">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Prochaines échéances</h4>
            <div className="space-y-2">
              {items
                .filter(item => new Date(item.date) >= new Date())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded bg-dark-700/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getTypeIcon(item.type)}
                      <span className="text-sm text-gray-300 truncate">{item.title}</span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {new Date(item.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                ))}
              {items.filter(item => new Date(item.date) >= new Date()).length === 0 && (
                <p className="text-sm text-gray-500">Aucune échéance à venir</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
