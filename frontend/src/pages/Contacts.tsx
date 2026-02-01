import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api, { Contact, PaginatedResponse } from '../lib/api';
import ContactModal from '../components/ContactModal';

const statusLabels: Record<string, { label: string; class: string }> = {
  PROSPECT: { label: 'Prospect', class: 'badge-yellow' },
  CLIENT: { label: 'Client', class: 'badge-green' },
  APPRENANT: { label: 'Apprenant', class: 'badge-blue' },
  INACTIVE: { label: 'Inactif', class: 'badge-gray' },
};

const typeLabels: Record<string, string> = {
  INDIVIDUAL: 'Particulier',
  PROFESSIONAL: 'Professionnel',
};

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    loadContacts();
  }, [search, statusFilter, pagination.page]);

  const loadContacts = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get<PaginatedResponse<Contact>>(`/contacts?${params}`);
      setContacts(response.data.data);
      setPagination({
        page: response.data.pagination.page,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      });
    } catch (error) {
      toast.error('Erreur lors du chargement des contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return;

    try {
      await api.delete(`/contacts/${id}`);
      toast.success('Contact supprimé');
      loadContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const handleSave = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    loadContacts();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos prospects, clients et apprenants
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouveau contact
        </button>
      </div>

      {/* Filtres */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="">Tous les statuts</option>
            <option value="PROSPECT">Prospects</option>
            <option value="CLIENT">Clients</option>
            <option value="APPRENANT">Apprenants</option>
            <option value="INACTIVE">Inactifs</option>
          </select>
        </div>
      </div>

      {/* Liste des contacts */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Entreprise</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td>
                        <Link
                          to={`/contacts/${contact.id}`}
                          className="font-medium text-primary-600 hover:text-primary-800"
                        >
                          {contact.firstName} {contact.lastName}
                        </Link>
                      </td>
                      <td>{contact.email || '-'}</td>
                      <td>{contact.phone || contact.mobile || '-'}</td>
                      <td>{contact.company?.name || '-'}</td>
                      <td>{typeLabels[contact.type]}</td>
                      <td>
                        <span className={statusLabels[contact.status]?.class}>
                          {statusLabels[contact.status]?.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingContact(contact);
                              setIsModalOpen(true);
                            }}
                            className="text-primary-600 hover:text-primary-800 text-sm"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {contacts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        Aucun contact trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {pagination.total} contact(s) au total
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <span className="px-4 py-2 text-sm">
                    Page {pagination.page} sur {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingContact(null);
        }}
        onSave={handleSave}
        contact={editingContact}
      />
    </div>
  );
}
