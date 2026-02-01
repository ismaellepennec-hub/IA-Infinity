import { useEffect, useState } from 'react';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api, { Company, PaginatedResponse } from '../lib/api';
import CompanyModal from '../components/CompanyModal';

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadCompanies();
  }, [search, pagination.page]);

  const loadCompanies = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      if (search) params.append('search', search);

      const response = await api.get<PaginatedResponse<Company>>(`/companies?${params}`);
      setCompanies(response.data.data);
      setPagination({
        page: response.data.pagination.page,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      });
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) return;

    try {
      await api.delete(`/companies/${id}`);
      toast.success('Entreprise supprimée');
      loadCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const handleSave = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
    loadCompanies();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entreprises</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos entreprises clientes
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouvelle entreprise
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une entreprise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>SIRET</th>
                  <th>Ville</th>
                  <th>OPCO</th>
                  <th>Contacts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td className="font-medium">{company.name}</td>
                    <td className="text-gray-500">{company.siret || '-'}</td>
                    <td>{company.city || '-'}</td>
                    <td>{company.opcoName || '-'}</td>
                    <td>
                      <span className="badge-blue">{company._count?.contacts || 0}</span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCompany(company);
                            setIsModalOpen(true);
                          }}
                          className="text-primary-600 hover:text-primary-800 text-sm"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(company.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      Aucune entreprise trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCompany(null);
        }}
        onSave={handleSave}
        company={editingCompany}
      />
    </div>
  );
}
