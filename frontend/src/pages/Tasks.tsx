import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import api, { Task, Project, Contractor, PaginatedResponse } from '../lib/api';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'TODO', label: 'À faire' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'REVIEW', label: 'En révision' },
  { value: 'COMPLETED', label: 'Terminée' },
  { value: 'BLOCKED', label: 'Bloquée' },
];

const priorityOptions = [
  { value: '', label: 'Toutes les priorités' },
  { value: 'LOW', label: 'Basse' },
  { value: 'MEDIUM', label: 'Moyenne' },
  { value: 'HIGH', label: 'Haute' },
  { value: 'URGENT', label: 'Urgente' },
];

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
    loadProjects();
    loadContractors();
  }, [search, status, priority, projectId]);

  const loadTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      if (projectId) params.append('projectId', projectId);

      const response = await api.get<PaginatedResponse<Task>>(`/tasks?${params}`);
      setTasks(response.data.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await api.get('/projects?limit=100');
      setProjects(response.data.data || []);
    } catch (error) {
      console.error('Erreur');
    }
  };

  const loadContractors = async () => {
    try {
      const response = await api.get('/contractors?status=ACTIVE&limit=100');
      setContractors(response.data.data || []);
    } catch (error) {
      console.error('Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette tâche ?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Tâche supprimée');
      loadTasks();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      loadTasks();
    } catch (error) {
      toast.error('Erreur');
    }
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

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'COMPLETED') return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Tâches</h1>
          <p className="mt-1 text-sm text-gray-400">
            Gérez toutes vos tâches
          </p>
        </div>
        <button
          onClick={() => { setEditingTask(null); setShowModal(true); }}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouvelle tâche
        </button>
      </div>

      {/* Filtres */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher une tâche..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="input"
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="input"
          >
            <option value="">Tous les projets</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400">Aucune tâche trouvée</p>
          <button
            onClick={() => { setEditingTask(null); setShowModal(true); }}
            className="btn-primary mt-4"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Créer une tâche
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`card p-4 hover:border-primary-500/30 transition-all ${
                isOverdue(task) ? 'border-red-500/30' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleToggleComplete(task)}
                  className={`mt-1 flex-shrink-0 h-5 w-5 rounded border transition-colors ${
                    task.status === 'COMPLETED'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-dark-500 hover:border-primary-500'
                  }`}
                >
                  {task.status === 'COMPLETED' && (
                    <CheckCircleIcon className="h-full w-full" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`font-medium ${
                      task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-200'
                    }`}>
                      {task.title}
                    </span>
                    {getStatusBadge(task.status)}
                    {getPriorityBadge(task.priority)}
                    {isOverdue(task) && (
                      <span className="badge-danger">En retard</span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500 mb-2 line-clamp-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {task.project && (
                      <Link
                        to={`/projects/${task.project.id}`}
                        className="hover:text-primary-400"
                      >
                        {task.project.name}
                      </Link>
                    )}
                    {task.contractor && (
                      <span>{task.contractor.firstName} {task.contractor.lastName}</span>
                    )}
                    {task.dueDate && (
                      <span className={`flex items-center gap-1 ${isOverdue(task) ? 'text-red-400' : ''}`}>
                        <ClockIcon className="h-3.5 w-3.5" />
                        {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingTask(task); setShowModal(true); }}
                    className="p-2 text-gray-400 hover:text-accent-400 hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          projects={projects}
          contractors={contractors}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadTasks(); }}
        />
      )}
    </div>
  );
}

function TaskModal({ task, projects, contractors, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    projectId: task?.projectId || '',
    contractorId: task?.contractorId || '',
    status: task?.status || 'TODO',
    priority: task?.priority || 'MEDIUM',
    dueDate: task?.dueDate?.split('T')[0] || '',
    estimatedHours: task?.estimatedHours?.toString() || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        contractorId: formData.contractorId || null,
        estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : null,
        dueDate: formData.dueDate || null,
      };
      if (task) {
        await api.put(`/tasks/${task.id}`, data);
        toast.success('Tâche mise à jour');
      } else {
        await api.post('/tasks', data);
        toast.success('Tâche créée');
      }
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative card w-full max-w-lg p-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-6">
            {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Titre *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Projet *</label>
              <select
                required
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="input"
              >
                <option value="">Sélectionner un projet</option>
                {projects.map((p: Project) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
              ></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input"
                >
                  {statusOptions.slice(1).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Priorité</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="input"
                >
                  {priorityOptions.slice(1).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Assigné à</label>
              <select
                value={formData.contractorId}
                onChange={(e) => setFormData({ ...formData, contractorId: e.target.value })}
                className="input"
              >
                <option value="">Non assigné</option>
                {contractors.map((c: Contractor) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Échéance</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Heures estimées</label>
                <input
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Enregistrement...' : task ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
