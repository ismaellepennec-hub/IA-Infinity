import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api, { Contact, Company } from '../lib/api';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  contact?: Contact | null;
}

interface ContactForm {
  type: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  companyId: string;
  jobTitle: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
  source: string;
}

export default function ContactModal({ isOpen, onClose, onSave, contact }: ContactModalProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactForm>();

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (contact) {
      reset({
        type: contact.type,
        status: contact.status,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        companyId: contact.companyId || '',
        jobTitle: contact.jobTitle || '',
        address: contact.address || '',
        city: contact.city || '',
        postalCode: contact.postalCode || '',
        notes: contact.notes || '',
        source: contact.source || '',
      });
    } else {
      reset({
        type: 'PROFESSIONAL',
        status: 'PROSPECT',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        mobile: '',
        companyId: '',
        jobTitle: '',
        address: '',
        city: '',
        postalCode: '',
        notes: '',
        source: '',
      });
    }
  }, [contact, reset]);

  const loadCompanies = async () => {
    try {
      const response = await api.get('/companies?limit=100');
      setCompanies(response.data.data);
    } catch (error) {
      console.error('Erreur chargement entreprises:', error);
    }
  };

  const onSubmit = async (data: ContactForm) => {
    setIsLoading(true);
    try {
      if (contact) {
        await api.put(`/contacts/${contact.id}`, data);
        toast.success('Contact mis à jour');
      } else {
        await api.post('/contacts', data);
        toast.success('Contact créé');
      }
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    {contact ? 'Modifier le contact' : 'Nouveau contact'}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Type</label>
                      <select {...register('type')} className="input">
                        <option value="PROFESSIONAL">Professionnel</option>
                        <option value="INDIVIDUAL">Particulier</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Statut</label>
                      <select {...register('status')} className="input">
                        <option value="PROSPECT">Prospect</option>
                        <option value="CLIENT">Client</option>
                        <option value="APPRENANT">Apprenant</option>
                        <option value="INACTIVE">Inactif</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Prénom *</label>
                      <input
                        {...register('firstName', { required: 'Prénom requis' })}
                        className="input"
                      />
                      {errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Nom *</label>
                      <input
                        {...register('lastName', { required: 'Nom requis' })}
                        className="input"
                      />
                      {errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="label">Email</label>
                    <input type="email" {...register('email')} className="input" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Téléphone</label>
                      <input {...register('phone')} className="input" />
                    </div>
                    <div>
                      <label className="label">Mobile</label>
                      <input {...register('mobile')} className="input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Entreprise</label>
                      <select {...register('companyId')} className="input">
                        <option value="">Aucune</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Fonction</label>
                      <input {...register('jobTitle')} className="input" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Adresse</label>
                    <input {...register('address')} className="input" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Ville</label>
                      <input {...register('city')} className="input" />
                    </div>
                    <div>
                      <label className="label">Code postal</label>
                      <input {...register('postalCode')} className="input" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Source</label>
                    <input
                      {...register('source')}
                      className="input"
                      placeholder="Site web, salon, recommandation..."
                    />
                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea {...register('notes')} className="input" rows={3} />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn-secondary">
                      Annuler
                    </button>
                    <button type="submit" disabled={isLoading} className="btn-primary">
                      {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
