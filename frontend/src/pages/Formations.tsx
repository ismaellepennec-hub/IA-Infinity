import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api, { Formation, Category, PaginatedResponse } from '../lib/api';
import FormationModal from '../components/FormationModal';

const modalityLabels: Record<string, string> = {
  PRESENTIAL: 'Présentiel',
  REMOTE: 'Distanciel',
  HYBRID: 'Hybride',
  ELEARNING: 'E-learning',
};

const levelLabels: Record<string, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
  EXPERT: 'Expert',
};

export default function Formations() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFormation, setEditingFormation] = useState<Formation | null>(null);

  useEffect(() => {
    loadCategories();
    loadFormations();
  }, [search, categoryFilter, pagination.page]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Erreur catégories:', error);
    }
  };

  const loadFormations = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      if (search) params.append('search', search);
      if (categoryFilter) params.append('categoryId', categoryFilter);

      const response = await api.get<PaginatedResponse<Formation>>(`/formations?${params}`);
      setFormations(response.data.data);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) return;

    try {
      await api.delete(`/formations/${id}`);
      toast.success('Formation supprimée');
      loadFormations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur');
    }
  };

  const handleSave = () => {
    setIsModalOpen(false);
    setEditingFormation(null);
    loadFormations();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Formations</h1>
          <p className="mt-1 text-sm text-gray-500">Catalogue des formations</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouvelle formation
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
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
                  <th>Référence</th>
                  <th>Titre</th>
                  <th>Catégorie</th>
                  <th>Durée</th>
                  <th>Modalité</th>
                  <th>Prix HT</th>
                  <th>Sessions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {formations.map((formation) => (
                  <tr key={formation.id}>
                    <td className="text-gray-500">{formation.reference}</td>
                    <td>
                      <Link
                        to={`/formations/${formation.id}`}
                        className="font-medium text-primary-600 hover:text-primary-800"
                      >
                        {formation.title}
                      </Link>
                      {formation.isCertifying && (
                        <span className="ml-2 badge-purple">Certifiante</span>
                      )}
                    </td>
                    <td>
                      {formation.category && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: formation.category.color + '20',
                            color: formation.category.color,
                          }}
                        >
                          {formation.category.name}
                        </span>
                      )}
                    </td>
                    <td>{formation.duration}h</td>
                    <td>{modalityLabels[formation.modality]}</td>
                    <td className="font-medium">{formatCurrency(formation.priceHT)}</td>
                    <td>
                      <span className="badge-blue">{formation._count?.sessions || 0}</span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingFormation(formation);
                            setIsModalOpen(true);
                          }}
                          className="text-primary-600 hover:text-primary-800 text-sm"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(formation.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {formations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      Aucune formation trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FormationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFormation(null);
        }}
        onSave={handleSave}
        formation={editingFormation}
        categories={categories}
      />
    </div>
  );
}
