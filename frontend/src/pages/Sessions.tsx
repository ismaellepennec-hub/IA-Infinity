import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, CalendarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api, { Session, PaginatedResponse } from '../lib/api';

const statusLabels: Record<string, { label: string; class: string }> = {
  PLANNED: { label: 'Planifiée', class: 'badge-gray' },
  CONFIRMED: { label: 'Confirmée', class: 'badge-green' },
  IN_PROGRESS: { label: 'En cours', class: 'badge-blue' },
  COMPLETED: { label: 'Terminée', class: 'badge-purple' },
  CANCELLED: { label: 'Annulée', class: 'badge-red' },
  POSTPONED: { label: 'Reportée', class: 'badge-yellow' },
};

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

  useEffect(() => {
    loadSessions();
  }, [search, statusFilter, pagination.page]);

  const loadSessions = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get<PaginatedResponse<Session>>(`/sessions?${params}`);
      setSessions(response.data.data);
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

  const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR');

  const getFormateur = (session: Session) => {
    if (!session.formateurs || session.formateurs.length === 0) return '-';
    const primary = session.formateurs.find(f => f.isPrimary) || session.formateurs[0];
    return `${primary.formateur.contact.firstName} ${primary.formateur.contact.lastName}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="mt-1 text-sm text-gray-500">Planification des sessions de formation</p>
        </div>
        <Link to="/sessions/new" className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouvelle session
        </Link>
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="">Tous les statuts</option>
            <option value="PLANNED">Planifiées</option>
            <option value="CONFIRMED">Confirmées</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="COMPLETED">Terminées</option>
            <option value="CANCELLED">Annulées</option>
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
                  <th>Formation</th>
                  <th>Dates</th>
                  <th>Lieu</th>
                  <th>Formateur</th>
                  <th>Inscrits</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <Link
                        to={`/sessions/${session.id}`}
                        className="font-medium text-primary-600 hover:text-primary-800"
                      >
                        {session.reference}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/formations/${session.formation.id}`} className="hover:underline">
                        {session.formation.title}
                      </Link>
                    </td>
                    <td>
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                        {formatDate(session.startDate)} - {formatDate(session.endDate)}
                      </div>
                    </td>
                    <td>{session.isRemote ? 'Distanciel' : session.city || session.location || '-'}</td>
                    <td>{getFormateur(session)}</td>
                    <td>
                      <div className="flex items-center">
                        <span className={`${(session._count?.inscriptions || 0) >= session.maxParticipants ? 'text-red-600' : 'text-gray-900'}`}>
                          {session._count?.inscriptions || 0}
                        </span>
                        <span className="text-gray-400">/{session.maxParticipants}</span>
                      </div>
                    </td>
                    <td>
                      <span className={statusLabels[session.status]?.class}>
                        {statusLabels[session.status]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      Aucune session trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
