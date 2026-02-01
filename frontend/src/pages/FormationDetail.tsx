import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ClockIcon, CurrencyEuroIcon, UserGroupIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';

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

const statusLabels: Record<string, { label: string; class: string }> = {
  PLANNED: { label: 'Planifiée', class: 'badge-gray' },
  CONFIRMED: { label: 'Confirmée', class: 'badge-green' },
  IN_PROGRESS: { label: 'En cours', class: 'badge-blue' },
  COMPLETED: { label: 'Terminée', class: 'badge-purple' },
  CANCELLED: { label: 'Annulée', class: 'badge-red' },
};

export default function FormationDetail() {
  const { id } = useParams();
  const [formation, setFormation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFormation();
  }, [id]);

  const loadFormation = async () => {
    try {
      const response = await api.get(`/formations/${id}`);
      setFormation(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(value);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  if (!formation) return <div>Formation non trouvée</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/formations" className="text-sm text-gray-500 hover:text-gray-700">← Retour aux formations</Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{formation.title}</h1>
            <p className="text-gray-500">{formation.reference}</p>
          </div>
          <div className="flex gap-2">
            {formation.isCertifying && <span className="badge-purple">Certifiante</span>}
            {formation.isActive ? <span className="badge-green">Active</span> : <span className="badge-gray">Inactive</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center">
          <ClockIcon className="h-10 w-10 text-primary-600" />
          <div className="ml-4">
            <p className="text-sm text-gray-500">Durée</p>
            <p className="text-xl font-bold">{formation.duration}h</p>
          </div>
        </div>
        <div className="card p-4 flex items-center">
          <CurrencyEuroIcon className="h-10 w-10 text-green-600" />
          <div className="ml-4">
            <p className="text-sm text-gray-500">Prix HT</p>
            <p className="text-xl font-bold">{formatCurrency(formation.priceHT)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center">
          <UserGroupIcon className="h-10 w-10 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm text-gray-500">Modalité</p>
            <p className="text-xl font-bold">{modalityLabels[formation.modality]}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center">
          <AcademicCapIcon className="h-10 w-10 text-purple-600" />
          <div className="ml-4">
            <p className="text-sm text-gray-500">Niveau</p>
            <p className="text-xl font-bold">{levelLabels[formation.level]}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {formation.shortDescription && (
            <div className="card p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700">{formation.shortDescription}</p>
              {formation.description && <p className="text-gray-600 mt-3">{formation.description}</p>}
            </div>
          )}

          {formation.objectives && (
            <div className="card p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-3">Objectifs</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{formation.objectives}</p>
            </div>
          )}

          {formation.program && (
            <div className="card p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-3">Programme</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{formation.program}</p>
            </div>
          )}

          <div className="card">
            <div className="card-header flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Sessions</h2>
              <Link to="/sessions" className="text-sm text-primary-600 hover:text-primary-800">Voir toutes</Link>
            </div>
            {formation.sessions && formation.sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Dates</th>
                      <th>Lieu</th>
                      <th>Inscrits</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formation.sessions.map((session: any) => (
                      <tr key={session.id}>
                        <td>
                          <Link to={`/sessions/${session.id}`} className="text-primary-600 hover:underline">
                            {session.reference}
                          </Link>
                        </td>
                        <td>
                          {new Date(session.startDate).toLocaleDateString('fr-FR')} - {new Date(session.endDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td>{session.isRemote ? 'Distanciel' : session.city || session.location || '-'}</td>
                        <td>{session._count?.inscriptions || 0}/{session.maxParticipants}</td>
                        <td><span className={statusLabels[session.status]?.class}>{statusLabels[session.status]?.label}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">Aucune session planifiée</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informations</h2>
            <dl className="space-y-3">
              {formation.category && (
                <div>
                  <dt className="text-sm text-gray-500">Catégorie</dt>
                  <dd className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs" style={{ backgroundColor: formation.category.color + '20', color: formation.category.color }}>
                      {formation.category.name}
                    </span>
                  </dd>
                </div>
              )}
              {formation.prerequisites && (
                <div>
                  <dt className="text-sm text-gray-500">Prérequis</dt>
                  <dd className="mt-1 text-gray-900">{formation.prerequisites}</dd>
                </div>
              )}
              {formation.targetAudience && (
                <div>
                  <dt className="text-sm text-gray-500">Public cible</dt>
                  <dd className="mt-1 text-gray-900">{formation.targetAudience}</dd>
                </div>
              )}
              {formation.priceIntra && (
                <div>
                  <dt className="text-sm text-gray-500">Prix Intra-entreprise</dt>
                  <dd className="mt-1 text-gray-900 font-medium">{formatCurrency(formation.priceIntra)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
