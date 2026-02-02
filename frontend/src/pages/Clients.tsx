import { useEffect, useState } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import api, { Client, PaginatedResponse } from '../lib/api';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'INACTIVE', label: 'Inactif' },
  { value: 'ARCHIVED', label: 'Archivé' },
];

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    loadClients();
  }, [search, status]);

  const loadClients = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const response = await api.get<PaginatedResponse<Client>>(`/clients?${params}`);
      setClients(response.data.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Client supprimé');
      loadClients();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      PROSPECT: 'badge-primary',
      ACTIVE: 'badge-success',
      INACTIVE: 'badge-warning',
      ARCHIVED: 'badge-gray',
    };
    const labels: Record<string, string> = {
      PROSPECT: 'Prospect',
      ACTIVE: 'Actif',
      INACTIVE: 'Inactif',
      ARCHIVED: 'Archivé',
    };
    return <span className={classes[status] || 'badge-gray'}>{labels[status] || status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Clients</h1>
          <p className="mt-1 text-sm text-gray-400">
            Gérez vos clients et prospects
          </p>
        </div>
        <button
          onClick={() => { setEditingClient(null); setShowModal(true); }}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouveau client
        </button>
      </div>

      {/* Filtres */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher un client..."
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
      ) : clients.length === 0 ? (
        <div className="card p-12 text-center">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Aucun client trouvé</p>
          <button
            onClick={() => { setEditingClient(null); setShowModal(true); }}
            className="btn-primary mt-4"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Ajouter un client
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div key={client.id} className="card p-5 hover:border-primary-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-600 to-accent-500 flex items-center justify-center">
                    <BuildingOfficeIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-100">{client.name}</h3>
                    {getStatusBadge(client.status)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingClient(client); setShowModal(true); }}
                    className="p-2 text-gray-400 hover:text-accent-400 hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {client.email && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <EnvelopeIcon className="h-4 w-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <PhoneIcon className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.city && (
                  <p className="text-gray-500">{client.city}</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-dark-700 flex items-center justify-between text-sm">
                <span className="text-gray-500">{client._count?.projects || 0} projets</span>
                <span className="text-gray-500">{client._count?.contacts || 0} contacts</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ClientModal
          client={editingClient}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadClients(); }}
        />
      )}
    </div>
  );
}

interface ClientModalProps {
  client: Client | null;
  onClose: () => void;
  onSave: () => void;
}

function ClientModal({ client, onClose, onSave }: ClientModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    siret: string;
    status: string;
    notes: string;
  }>({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    website: client?.website || '',
    address: client?.address || '',
    city: client?.city || '',
    postalCode: client?.postalCode || '',
    country: client?.country || 'France',
    siret: client?.siret || '',
    status: client?.status || 'PROSPECT',
    notes: client?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (client) {
        await api.put(`/clients/${client.id}`, formData);
        toast.success('Client mis à jour');
      } else {
        await api.post('/clients', formData);
        toast.success('Client créé');
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
            {client ? 'Modifier le client' : 'Nouveau client'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nom de l'entreprise *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
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
              <label className="label">Site web</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="input"
                placeholder="https://"
              />
            </div>
            <div>
              <label className="label">Adresse</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Code postal</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Ville</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Pays</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">SIRET</label>
                <input
                  type="text"
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
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
                  {statusOptions.slice(1).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
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
              <button type="button" onClick={onClose} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Enregistrement...' : client ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
