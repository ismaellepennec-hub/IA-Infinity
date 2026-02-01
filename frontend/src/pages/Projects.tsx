import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import api, { Project, PaginatedResponse } from '../lib/api';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'ON_HOLD', label: 'En pause' },
  { value: 'COMPLETED', label: 'Terminé' },
  { value: 'CANCELLED', label: 'Annulé' },
];

const priorityOptions = [
  { value: '', label: 'Toutes les priorités' },
  { value: 'LOW', label: 'Basse' },
  { value: 'MEDIUM', label: 'Moyenne' },
  { value: 'HIGH', label: 'Haute' },
  { value: 'URGENT', label: 'Urgente' },
];

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    loadProjects();
    loadClients();
  }, [search, status, priority]);

  const loadProjects = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);

      const response = await api.get<PaginatedResponse<Project>>(`/projects?${params}`);
      setProjects(response.data.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await api.get('/clients?limit=100');
      setClients(response.data.data || []);
    } catch (error) {
      console.error('Erreur chargement clients');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Projet supprimé');
      loadProjects();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      DRAFT: 'badge-gray',
      PENDING: 'badge-primary',
      IN_PROGRESS: 'badge-accent',
      ON_HOLD: 'badge-warning',
      COMPLETED: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      PENDING: 'En attente',
      IN_PROGRESS: 'En cours',
      ON_HOLD: 'En pause',
      COMPLETED: 'Terminé',
      CANCELLED: 'Annulé',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Projets</h1>
          <p className="mt-1 text-sm text-gray-400">
            Gérez vos projets clients
          </p>
        </div>
        <button
          onClick={() => { setEditingProject(null); setShowModal(true); }}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouveau projet
        </button>
      </div>

      {/* Filtres */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher un projet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input w-full sm:w-48"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="input w-full sm:w-48"
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des projets */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400">Aucun projet trouvé</p>
          <button
            onClick={() => { setEditingProject(null); setShowModal(true); }}
            className="btn-primary mt-4"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Créer un projet
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card p-5 hover:border-primary-500/30 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-lg font-semibold text-gray-100 hover:text-primary-400 truncate"
                    >
                      {project.name}
                    </Link>
                    {getStatusBadge(project.status)}
                    {getPriorityBadge(project.priority)}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    {project.client?.name || 'Client non défini'} • Réf: {project.reference}
                  </p>
                  {project.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/projects/${project.id}`}
                    className="p-2 text-gray-400 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
                    title="Voir"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => { setEditingProject(project); setShowModal(true); }}
                    className="p-2 text-gray-400 hover:text-accent-400 hover:bg-dark-700 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500">Progression</span>
                    <span className="text-gray-300">{project.progress || 0}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${project.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {project._count?.tasks || 0} tâches
                </div>
                {project.endDate && (
                  <div className="text-sm text-gray-500">
                    Échéance: {new Date(project.endDate).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de création/édition */}
      {showModal && (
        <ProjectModal
          project={editingProject}
          clients={clients}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadProjects(); }}
        />
      )}
    </div>
  );
}

interface ProjectModalProps {
  project: Project | null;
  clients: any[];
  onClose: () => void;
  onSave: () => void;
}

function ProjectModal({ project, clients, onClose, onSave }: ProjectModalProps) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    clientId: project?.clientId || '',
    status: project?.status || 'DRAFT',
    priority: project?.priority || 'MEDIUM',
    startDate: project?.startDate?.split('T')[0] || '',
    endDate: project?.endDate?.split('T')[0] || '',
    budget: project?.budget?.toString() || '',
    estimatedHours: project?.estimatedHours?.toString() || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };

      if (project) {
        await api.put(`/projects/${project.id}`, data);
        toast.success('Projet mis à jour');
      } else {
        await api.post('/projects', data);
        toast.success('Projet créé');
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
            {project ? 'Modifier le projet' : 'Nouveau projet'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nom du projet *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Client *</label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="input"
              >
                <option value="">Sélectionner un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date de début</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Date de fin</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Budget (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
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
              <button type="button" onClick={onClose} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Enregistrement...' : project ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
