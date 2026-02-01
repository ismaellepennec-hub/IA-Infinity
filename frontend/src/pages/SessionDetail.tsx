import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CalendarIcon, MapPinIcon, UserGroupIcon, LinkIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';

const statusLabels: Record<string, { label: string; class: string }> = {
  PLANNED: { label: 'Planifiée', class: 'badge-gray' },
  CONFIRMED: { label: 'Confirmée', class: 'badge-green' },
  IN_PROGRESS: { label: 'En cours', class: 'badge-blue' },
  COMPLETED: { label: 'Terminée', class: 'badge-purple' },
  CANCELLED: { label: 'Annulée', class: 'badge-red' },
};

const inscriptionStatusLabels: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'En attente', class: 'badge-yellow' },
  CONFIRMED: { label: 'Confirmée', class: 'badge-green' },
  WAITING_LIST: { label: 'Liste d\'attente', class: 'badge-gray' },
  CANCELLED: { label: 'Annulée', class: 'badge-red' },
  COMPLETED: { label: 'Terminée', class: 'badge-purple' },
};

export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, [id]);

  const loadSession = async () => {
    try {
      const response = await api.get(`/sessions/${id}`);
      setSession(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  if (!session) return <div>Session non trouvée</div>;

  const fillRate = session.inscriptions ? (session.inscriptions.length / session.maxParticipants) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/sessions" className="text-sm text-gray-500 hover:text-gray-700">← Retour aux sessions</Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{session.reference}</h1>
            <p className="text-gray-500 mt-1">
              <Link to={`/formations/${session.formation.id}`} className="text-primary-600 hover:underline">
                {session.formation.title}
              </Link>
            </p>
          </div>
          <span className={statusLabels[session.status]?.class}>
            {statusLabels[session.status]?.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-3">
              <p className="text-sm text-gray-500">Dates</p>
              <p className="font-medium">{new Date(session.startDate).toLocaleDateString('fr-FR')} - {new Date(session.endDate).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <MapPinIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm text-gray-500">Lieu</p>
              <p className="font-medium">{session.isRemote ? 'Distanciel' : session.city || session.location || 'Non défini'}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm text-gray-500">Participants</p>
              <p className="font-medium">{session.inscriptions?.length || 0} / {session.maxParticipants}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-purple-600 font-bold text-sm">{Math.round(fillRate)}%</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Taux de remplissage</p>
              <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                <div className="h-2 bg-primary-600 rounded-full" style={{ width: `${Math.min(fillRate, 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Inscriptions */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Inscriptions ({session.inscriptions?.length || 0})</h2>
            </div>
            {session.inscriptions && session.inscriptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Entreprise</th>
                      <th>Email</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {session.inscriptions.map((inscription: any) => (
                      <tr key={inscription.id}>
                        <td>
                          <Link to={`/contacts/${inscription.contact.id}`} className="font-medium text-primary-600 hover:underline">
                            {inscription.contact.firstName} {inscription.contact.lastName}
                          </Link>
                        </td>
                        <td>{inscription.contact.company?.name || '-'}</td>
                        <td>{inscription.contact.email || '-'}</td>
                        <td>
                          <span className={inscriptionStatusLabels[inscription.status]?.class}>
                            {inscriptionStatusLabels[inscription.status]?.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">Aucune inscription</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Formateurs */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Formateurs</h2>
            {session.formateurs && session.formateurs.length > 0 ? (
              <ul className="space-y-3">
                {session.formateurs.map((sf: any) => (
                  <li key={sf.formateur.id} className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-700 font-medium">
                        {sf.formateur.contact.firstName[0]}{sf.formateur.contact.lastName[0]}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{sf.formateur.contact.firstName} {sf.formateur.contact.lastName}</p>
                      {sf.isPrimary && <span className="text-xs text-gray-500">Principal</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Aucun formateur assigné</p>
            )}
          </div>

          {/* Détails */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Détails</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Formation</dt>
                <dd className="mt-1">{session.formation.title}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Durée</dt>
                <dd className="mt-1">{session.formation.duration}h</dd>
              </div>
              {session.isRemote && session.meetingLink && (
                <div>
                  <dt className="text-sm text-gray-500">Lien visio</dt>
                  <dd className="mt-1">
                    <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline flex items-center">
                      <LinkIcon className="h-4 w-4 mr-1" />
                      Rejoindre
                    </a>
                  </dd>
                </div>
              )}
              {session.notes && (
                <div>
                  <dt className="text-sm text-gray-500">Notes</dt>
                  <dd className="mt-1 text-gray-700">{session.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
