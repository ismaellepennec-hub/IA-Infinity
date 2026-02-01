import { useEffect, useState } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import api, { Contractor, PaginatedResponse, Availability } from '../lib/api';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'INACTIVE', label: 'Inactif' },
  { value: 'ON_LEAVE', label: 'En congé' },
];

export default function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);

  useEffect(() => {
    loadContractors();
  }, [search, status]);

  const loadContractors = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const response = await api.get<PaginatedResponse<Contractor>>(`/contractors?${params}`);
      setContractors(response.data.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce sous-traitant ?')) return;
    try {
      await api.delete(`/contractors/${id}`);
      toast.success('Sous-traitant supprimé');
      loadContractors();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      ACTIVE: 'badge-success',
      INACTIVE: 'badge-gray',
      ON_LEAVE: 'badge-warning',
    };
    const labels: Record<string, string> = {
      ACTIVE: 'Actif',
      INACTIVE: 'Inactif',
      ON_LEAVE: 'En congé',
    };
    return <span className={classes[status] || 'badge-gray'}>{labels[status] || status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Sous-traitants</h1>
          <p className="mt-1 text-sm text-gray-400">
            Gérez votre équipe de sous-traitants
          </p>
        </div>
        <button
          onClick={() => { setEditingContractor(null); setShowModal(true); }}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouveau sous-traitant
        </button>
      </div>

      {/* Filtres */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher un sous-traitant..."
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
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : contractors.length === 0 ? (
        <div className="card p-12 text-center">
          <UserIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Aucun sous-traitant trouvé</p>
          <button
            onClick={() => { setEditingContractor(null); setShowModal(true); }}
            className="btn-primary mt-4"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Ajouter un sous-traitant
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contractors.map((contractor) => (
            <div key={contractor.id} className="card p-5 hover:border-primary-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-semibold">
                    {contractor.firstName[0]}{contractor.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-100">
                      {contractor.firstName} {contractor.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{contractor.specialty}</p>
                  </div>
                </div>
                {getStatusBadge(contractor.status)}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <EnvelopeIcon className="h-4 w-4" />
                  <span className="truncate">{contractor.email}</span>
                </div>
                {contractor.phone && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <PhoneIcon className="h-4 w-4" />
                    <span>{contractor.phone}</span>
                  </div>
                )}
                {contractor.dailyRate && (
                  <p className="text-gray-500">TJM: {contractor.dailyRate}€</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-dark-700 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {contractor._count?.assignments || 0} projets • {contractor._count?.tasks || 0} tâches
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setSelectedContractor(contractor); setShowAvailabilityModal(true); }}
                    className="p-2 text-gray-400 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
                    title="Disponibilités"
                  >
                    <CalendarDaysIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { setEditingContractor(contractor); setShowModal(true); }}
                    className="p-2 text-gray-400 hover:text-accent-400 hover:bg-dark-700 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(contractor.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Contractor */}
      {showModal && (
        <ContractorModal
          contractor={editingContractor}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadContractors(); }}
        />
      )}

      {/* Modal Availability */}
      {showAvailabilityModal && selectedContractor && (
        <AvailabilityModal
          contractor={selectedContractor}
          onClose={() => setShowAvailabilityModal(false)}
          onSave={() => { setShowAvailabilityModal(false); loadContractors(); }}
        />
      )}
    </div>
  );
}

function ContractorModal({ contractor, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    firstName: contractor?.firstName || '',
    lastName: contractor?.lastName || '',
    email: contractor?.email || '',
    phone: contractor?.phone || '',
    specialty: contractor?.specialty || '',
    skills: contractor?.skills || '',
    hourlyRate: contractor?.hourlyRate?.toString() || '',
    dailyRate: contractor?.dailyRate?.toString() || '',
    status: contractor?.status || 'ACTIVE',
    notes: contractor?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : null,
      };
      if (contractor) {
        await api.put(`/contractors/${contractor.id}`, data);
        toast.success('Sous-traitant mis à jour');
      } else {
        await api.post('/contractors', data);
        toast.success('Sous-traitant créé');
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
        <div className="relative card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold text-gray-100 mb-6">
            {contractor ? 'Modifier le sous-traitant' : 'Nouveau sous-traitant'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Prénom *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Nom *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label">Spécialité *</label>
              <input
                type="text"
                required
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="input"
                placeholder="Ex: Développeur Frontend, Designer UI/UX..."
              />
            </div>
            <div>
              <label className="label">Compétences</label>
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className="input"
                placeholder="React, TypeScript, Figma..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">TJM (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.dailyRate}
                  onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Taux horaire (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
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
                  <option value="ACTIVE">Actif</option>
                  <option value="INACTIVE">Inactif</option>
                  <option value="ON_LEAVE">En congé</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input"
              ></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Enregistrement...' : contractor ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AvailabilityModal({ contractor, onClose, onSave }: any) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    type: 'AVAILABLE',
    notes: '',
  });

  useEffect(() => {
    loadAvailabilities();
  }, []);

  const loadAvailabilities = async () => {
    try {
      const response = await api.get(`/contractors/${contractor.id}/availabilities`);
      setAvailabilities(response.data);
    } catch (error) {
      console.error('Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/contractors/${contractor.id}/availabilities`, formData);
      toast.success('Disponibilité ajoutée');
      setFormData({ startDate: '', endDate: '', type: 'AVAILABLE', notes: '' });
      loadAvailabilities();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      await api.delete(`/contractors/${contractor.id}/availabilities/${id}`);
      loadAvailabilities();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const getTypeBadge = (type: string) => {
    const classes: Record<string, string> = {
      AVAILABLE: 'badge-success',
      BUSY: 'badge-danger',
      VACATION: 'badge-warning',
      SICK: 'badge-primary',
      OTHER: 'badge-gray',
    };
    const labels: Record<string, string> = {
      AVAILABLE: 'Disponible',
      BUSY: 'Occupé',
      VACATION: 'Congés',
      SICK: 'Maladie',
      OTHER: 'Autre',
    };
    return <span className={classes[type] || 'badge-gray'}>{labels[type] || type}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold text-gray-100 mb-2">
            Disponibilités de {contractor.firstName} {contractor.lastName}
          </h2>
          <p className="text-sm text-gray-500 mb-6">{contractor.specialty}</p>

          {/* Form */}
          <form onSubmit={handleAddAvailability} className="mb-6 p-4 bg-dark-700/30 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Ajouter une période</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Début</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Fin</label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input"
                >
                  <option value="AVAILABLE">Disponible</option>
                  <option value="BUSY">Occupé</option>
                  <option value="VACATION">Congés</option>
                  <option value="SICK">Maladie</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn-primary w-full">Ajouter</button>
              </div>
            </div>
          </form>

          {/* List */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : availabilities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune période définie</div>
          ) : (
            <div className="space-y-2">
              {availabilities.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTypeBadge(a.type)}
                    <span className="text-gray-300">
                      {new Date(a.startDate).toLocaleDateString('fr-FR')} - {new Date(a.endDate).toLocaleDateString('fr-FR')}
                    </span>
                    {a.notes && <span className="text-sm text-gray-500">({a.notes})</span>}
                  </div>
                  <button
                    onClick={() => handleDeleteAvailability(a.id)}
                    className="p-1 text-gray-400 hover:text-red-400"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button onClick={onClose} className="btn-secondary">Fermer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
