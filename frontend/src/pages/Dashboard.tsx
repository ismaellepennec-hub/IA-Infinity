import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderIcon,
  UsersIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api, { DashboardData, Project, Task } from '../lib/api';

const STATUS_COLORS = {
  DRAFT: '#64748b',
  PENDING: '#8b5cf6',
  IN_PROGRESS: '#3b82f6',
  ON_HOLD: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [projectStats, setProjectStats] = useState<any>(null);
  const [workload, setWorkload] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashboardRes, statsRes, workloadRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/dashboard/project-stats'),
        api.get('/dashboard/contractor-workload'),
      ]);
      setData(dashboardRes.data);
      setProjectStats(statsRes.data);
      setWorkload(workloadRes.data);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const classes: Record<string, string> = {
      LOW: 'badge-gray',
      MEDIUM: 'badge-primary',
      HIGH: 'badge-warning',
      URGENT: 'badge-danger',
    };
    const labels: Record<string, string> = {
      LOW: 'Basse',
      MEDIUM: 'Moyenne',
      HIGH: 'Haute',
      URGENT: 'Urgente',
    };
    return <span className={classes[priority] || 'badge-gray'}>{labels[priority] || priority}</span>;
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      TODO: 'badge-gray',
      IN_PROGRESS: 'badge-primary',
      REVIEW: 'badge-accent',
      COMPLETED: 'badge-success',
      BLOCKED: 'badge-danger',
    };
    const labels: Record<string, string> = {
      TODO: 'À faire',
      IN_PROGRESS: 'En cours',
      REVIEW: 'En révision',
      COMPLETED: 'Terminée',
      BLOCKED: 'Bloquée',
    };
    return <span className={classes[status] || 'badge-gray'}>{labels[status] || status}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-gray-400">Erreur de chargement</div>;
  }

  const stats = [
    {
      name: 'Projets actifs',
      value: data.projects.active,
      total: data.projects.total,
      icon: FolderIcon,
      color: 'from-primary-600 to-primary-500',
      href: '/projects',
    },
    {
      name: 'Clients',
      value: data.clients.active,
      total: data.clients.total,
      icon: UsersIcon,
      color: 'from-accent-600 to-accent-500',
      href: '/clients',
    },
    {
      name: 'Sous-traitants',
      value: data.contractors.active,
      total: data.contractors.total,
      icon: UserGroupIcon,
      color: 'from-emerald-600 to-emerald-500',
      href: '/contractors',
    },
    {
      name: 'Tâches en attente',
      value: data.tasks.pending,
      total: data.tasks.total,
      icon: ClipboardDocumentListIcon,
      color: 'from-amber-600 to-amber-500',
      href: '/tasks',
    },
  ];

  const chartData = projectStats?.months?.map((month: string, index: number) => ({
    name: month,
    créés: projectStats.created[index],
    terminés: projectStats.completed[index],
  })) || [];

  const statusData = Object.entries(data.projects.byStatus || {}).map(([status, count]) => ({
    name: status,
    value: count,
    color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#64748b',
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Tableau de bord</h1>
        <p className="mt-1 text-sm text-gray-400">
          Vue d'ensemble de votre activité
        </p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="card p-6 hover:border-primary-500/50 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-100 mt-1">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              <span className="text-primary-400">{stat.total}</span> au total
            </p>
          </Link>
        ))}
      </div>

      {/* Alertes */}
      {data.tasks.overdue > 0 && (
        <div className="card p-4 border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-300">
                {data.tasks.overdue} tâche{data.tasks.overdue > 1 ? 's' : ''} en retard
              </p>
              <p className="text-xs text-red-400/70 mt-0.5">
                Nécessite une attention immédiate
              </p>
            </div>
            <Link to="/tasks?status=overdue" className="ml-auto btn-danger text-sm py-1.5 px-3">
              Voir
            </Link>
          </div>
        </div>
      )}

      {/* Graphiques */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Évolution des projets */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Évolution des projets
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
                <Bar dataKey="créés" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="terminés" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Répartition par statut */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Projets par statut
          </h3>
          <div className="h-64 flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">Aucun projet</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-xs text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projets récents et tâches urgentes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Projets récents */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100">Projets récents</h3>
            <Link to="/projects" className="text-sm text-primary-400 hover:text-primary-300">
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-dark-700">
            {data.recentProjects.length > 0 ? (
              data.recentProjects.map((project: Project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block p-4 hover:bg-dark-700/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-200">{project.name}</p>
                      <p className="text-sm text-gray-500">{project.client?.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                            style={{ width: `${project.progress || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-400">{project.progress || 0}%</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="p-4 text-center text-gray-500">Aucun projet récent</p>
            )}
          </div>
        </div>

        {/* Tâches urgentes */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100">Tâches prioritaires</h3>
            <Link to="/tasks" className="text-sm text-primary-400 hover:text-primary-300">
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-dark-700">
            {data.urgentTasks.length > 0 ? (
              data.urgentTasks.slice(0, 5).map((task: Task) => (
                <div key={task.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-200 truncate">{task.title}</p>
                      <p className="text-sm text-gray-500">{task.project?.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getPriorityBadge(task.priority)}
                      {getStatusBadge(task.status)}
                    </div>
                  </div>
                  {task.dueDate && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="p-4 text-center text-gray-500">Aucune tâche urgente</p>
            )}
          </div>
        </div>
      </div>

      {/* Charge de travail sous-traitants */}
      {workload.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-100">Charge des sous-traitants</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workload.map((contractor) => (
                <div
                  key={contractor.id}
                  className="p-4 rounded-lg bg-dark-700/30 border border-dark-600"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-200">{contractor.name}</p>
                      <p className="text-xs text-gray-500">{contractor.specialty}</p>
                    </div>
                    <span
                      className={`w-3 h-3 rounded-full ${
                        contractor.isAvailable ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      title={contractor.isAvailable ? 'Disponible' : 'Occupé'}
                    ></span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <FolderIcon className="h-4 w-4 text-primary-400" />
                      <span className="text-gray-400">{contractor.activeProjects} projets</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ClipboardDocumentListIcon className="h-4 w-4 text-accent-400" />
                      <span className="text-gray-400">{contractor.pendingTasks} tâches</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
