import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import api, { Contact } from '../lib/api';

const statusLabels: Record<string, { label: string; class: string }> = {
  PROSPECT: { label: 'Prospect', class: 'badge-yellow' },
  CLIENT: { label: 'Client', class: 'badge-green' },
  APPRENANT: { label: 'Apprenant', class: 'badge-blue' },
  INACTIVE: { label: 'Inactif', class: 'badge-gray' },
};

export default function ContactDetail() {
  const { id } = useParams();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContact();
  }, [id]);

  const loadContact = async () => {
    try {
      const response = await api.get(`/contacts/${id}`);
      setContact(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!contact) {
    return <div>Contact non trouvé</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Link to="/contacts" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux contacts
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {contact.firstName} {contact.lastName}
          </h1>
          <div className="mt-2">
            <span className={statusLabels[contact.status]?.class}>
              {statusLabels[contact.status]?.label}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informations</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contact.email && (
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <dt className="text-sm text-gray-500">Email</dt>
                    <dd>
                      <a href={`mailto:${contact.email}`} className="text-primary-600 hover:underline">
                        {contact.email}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {(contact.phone || contact.mobile) && (
                <div className="flex items-center">
                  <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <dt className="text-sm text-gray-500">Téléphone</dt>
                    <dd>{contact.phone || contact.mobile}</dd>
                  </div>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <dt className="text-sm text-gray-500">Entreprise</dt>
                    <dd>
                      <Link to={`/companies/${contact.company.id}`} className="text-primary-600 hover:underline">
                        {contact.company.name}
                      </Link>
                      {contact.jobTitle && <span className="text-gray-500"> - {contact.jobTitle}</span>}
                    </dd>
                  </div>
                </div>
              )}
              {contact.city && (
                <div className="flex items-center">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <dt className="text-sm text-gray-500">Localisation</dt>
                    <dd>{contact.city} {contact.postalCode}</dd>
                  </div>
                </div>
              )}
            </dl>

            {contact.notes && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}
          </div>

          {/* Inscriptions */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Inscriptions</h2>
            </div>
            {contact.inscriptions && contact.inscriptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Formation</th>
                      <th>Session</th>
                      <th>Date</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {contact.inscriptions.map((inscription: any) => (
                      <tr key={inscription.id}>
                        <td>
                          <Link
                            to={`/formations/${inscription.session.formation.id}`}
                            className="text-primary-600 hover:underline"
                          >
                            {inscription.session.formation.title}
                          </Link>
                        </td>
                        <td>
                          <Link
                            to={`/sessions/${inscription.session.id}`}
                            className="text-primary-600 hover:underline"
                          >
                            {inscription.session.reference}
                          </Link>
                        </td>
                        <td>
                          {new Date(inscription.session.startDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td>
                          <span className={`badge-${inscription.status === 'CONFIRMED' ? 'green' : inscription.status === 'PENDING' ? 'yellow' : 'gray'}`}>
                            {inscription.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                Aucune inscription pour ce contact
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Actions rapides</h2>
            <div className="space-y-2">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="btn-secondary w-full justify-center"
                >
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  Envoyer un email
                </a>
              )}
              {(contact.phone || contact.mobile) && (
                <a
                  href={`tel:${contact.phone || contact.mobile}`}
                  className="btn-secondary w-full justify-center"
                >
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  Appeler
                </a>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Créé le</h2>
            <p>{new Date(contact.createdAt).toLocaleDateString('fr-FR')}</p>
            {contact.source && (
              <>
                <h2 className="text-sm font-medium text-gray-500 mt-4 mb-2">Source</h2>
                <p>{contact.source}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
