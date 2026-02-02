import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import api, { Project, Task, Contractor } from '../lib/api';
import toast from 'react-hot-toast';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'milestones' | 'team'>('tasks');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);

  useEffect(() => {
    loadProject();
    loadContractors();
  }, [id]);

  const loadProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement du projet');
    } finally {
      setLoading(false);
    }
  };

  const loadContractors = async () => {
    try {
      const response = await api.get('/contractors?status=ACTIVE&limit=100');
      setContractors(response.data.data || []);
    } catch (error) {
      console.error('Erreur chargement sous-traitants');
    }
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      DRAFT: 'badge-gray', PENDING: 'badge-primary', IN_PROGRESS: 'badge-accent',
      ON_HOLD: 'badge-warning', COMPLETED: 'badge-success', CANCELLED: 'badge-danger',
      TODO: 'badge-gray', REVIEW: 'badge-accent', BLOCKED: 'badge-danger', DELAYED: 'badge-danger',
    };
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon', PENDING: 'En attente', IN_PROGRESS: 'En cours',
      ON_HOLD: 'En pause', COMPLETED: 'Terminé', CANCELLED: 'Annulé',
      TODO: 'À faire', REVIEW: 'En révision', BLOCKED: 'Bloquée', DELAYED: 'En retard',
    };
    return <span className={classes[status] || 'badge-gray'}>{labels[status] || status}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const classes: Record<string, string> = {
      LOW: 'badge-gray', MEDIUM: 'badge-primary', HIGH: 'badge-warning', URGENT: 'badge-danger',
    };
    const labels: Record<string, string> = {
      LOW: 'Basse', MEDIUM: 'Moyenne', HIGH: 'Haute', URGENT: 'Urgente',
    };
    return <span className={classes[priority] || 'badge-gray'}>{labels[priority] || priority}</span>;
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Supprimer cette tâche ?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Tâche supprimée');
      loadProject();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      loadProject();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!project) {
    return <div className="text-gray-400">Projet non trouvé</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/projects" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-4">
            <ArrowLeftIcon className="h-4 w-4" />
            Retour aux projets
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-100">{project.name}</h1>
            {getStatusBadge(project.status)}
            {getPriorityBadge(project.priority)}
          </div>
          <p className="mt-1 text-gray-400">
            {project.client?.name} • Réf: {project.reference}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Progression</p>
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl font-bold text-gray-100">{project.progress || 0}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${project.progress || 0}%` }}></div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Tâches</p>
          <p className="text-2xl font-bold text-gray-100 mt-2">{project._count?.tasks || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Jalons</p>
          <p className="text-2xl font-bold text-gray-100 mt-2">{project._count?.milestones || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Équipe</p>
          <p className="text-2xl font-bold text-gray-100 mt-2">{project._count?.assignments || 0}</p>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-3">Description</h3>
          <p className="text-gray-400">{project.description}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-dark-700">
        <nav className="flex gap-8">
          {[
            { id: 'tasks', label: 'Tâches' },
            { id: 'milestones', label: 'Jalons / Roadmap' },
            { id: 'team', label: 'Équipe' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
              className="btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Nouvelle tâche
            </button>
          </div>
          {project.tasks && project.tasks.length > 0 ? (
            <div className="space-y-3">
              {project.tasks.map((task) => (
                <div key={task.id} className="card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-200">{task.title}</span>
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-500 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {task.contractor && (
                          <span>Assigné à: {task.contractor.firstName} {task.contractor.lastName}</span>
                        )}
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-3.5 w-3.5" />
                            {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, 'COMPLETED')}
                          className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-dark-700 rounded-lg"
                          title="Marquer comme terminée"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingTask(task); setShowTaskModal(true); }}
                        className="p-2 text-gray-400 hover:text-accent-400 hover:bg-dark-700 rounded-lg"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-700 rounded-lg"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-500">
              Aucune tâche pour ce projet
            </div>
          )}
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowMilestoneModal(true)} className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Nouveau jalon
            </button>
          </div>
          {project.milestones && project.milestones.length > 0 ? (
            <div className="relative pl-8">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-dark-600"></div>
              {project.milestones.map((milestone) => (
                <div key={milestone.id} className="relative mb-6 last:mb-0">
                  <div className={`absolute -left-5 w-4 h-4 rounded-full border-2 ${
                    milestone.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500' :
                    milestone.status === 'IN_PROGRESS' ? 'bg-primary-500 border-primary-500' :
                    'bg-dark-800 border-dark-500'
                  }`}></div>
                  <div className="card p-4 ml-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-200">{milestone.name}</span>
                          {getStatusBadge(milestone.status)}
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-gray-500 mb-2">{milestone.description}</p>
                        )}
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <FlagIcon className="h-3.5 w-3.5" />
                          Échéance: {new Date(milestone.dueDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-500">
              Aucun jalon défini pour ce projet
            </div>
          )}
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-4">
          {project.assignments && project.assignments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {project.assignments.map((assignment) => (
                <div key={assignment.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-semibold">
                      {assignment.contractor?.firstName?.[0]}{assignment.contractor?.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-200">
                        {assignment.contractor?.firstName} {assignment.contractor?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{assignment.role || assignment.contractor?.specialty}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-500">
              Aucun membre assigné à ce projet
            </div>
          )}
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          projectId={project.id}
          task={editingTask}
          contractors={contractors}
          onClose={() => setShowTaskModal(false)}
          onSave={() => { setShowTaskModal(false); loadProject(); }}
        />
      )}

      {/* Milestone Modal */}
      {showMilestoneModal && (
        <MilestoneModal
          projectId={project.id}
          onClose={() => setShowMilestoneModal(false)}
          onSave={() => { setShowMilestoneModal(false); loadProject(); }}
        />
      )}
    </div>
  );
}

function TaskModal({ projectId, task, contractors, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'TODO',
    priority: task?.priority || 'MEDIUM',
    contractorId: task?.contractorId || '',
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
        projectId,
        contractorId: formData.contractorId || null,
        estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : null,
        dueDate: formData.dueDate || null,
      };
      if (task) {
        await api.put(`/tasks/${task.id}`, data);
      } else {
        await api.post('/tasks', data);
      }
      toast.success(task ? 'Tâche mise à jour' : 'Tâche créée');
      onSave();
    } catch (error) {
      toast.error('Erreur');
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
                  <option value="TODO">À faire</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="REVIEW">En révision</option>
                  <option value="COMPLETED">Terminée</option>
                  <option value="BLOCKED">Bloquée</option>
                </select>
              </div>
              <div>
                <label className="label">Priorité</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="input"
                >
                  <option value="LOW">Basse</option>
                  <option value="MEDIUM">Moyenne</option>
                  <option value="HIGH">Haute</option>
                  <option value="URGENT">Urgente</option>
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

function MilestoneModal({ projectId, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dueDate: '',
    status: 'PENDING',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/milestones`, formData);
      toast.success('Jalon créé');
      onSave();
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative card w-full max-w-lg p-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-6">Nouveau jalon</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nom *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
              />
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
                <label className="label">Échéance *</label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input"
                >
                  <option value="PENDING">En attente</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="COMPLETED">Terminé</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
