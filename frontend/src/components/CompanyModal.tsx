import { Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api, { Company } from '../lib/api';
import { useState } from 'react';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  company?: Company | null;
}

interface CompanyForm {
  name: string;
  siret: string;
  vatNumber: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  legalForm: string;
  opcoName: string;
  opcoCode: string;
  notes: string;
}

export default function CompanyModal({ isOpen, onClose, onSave, company }: CompanyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyForm>();

  useEffect(() => {
    if (company) {
      reset({
        name: company.name,
        siret: company.siret || '',
        address: company.address || '',
        city: company.city || '',
        postalCode: company.postalCode || '',
        phone: company.phone || '',
        email: company.email || '',
        opcoName: company.opcoName || '',
        vatNumber: '',
        website: '',
        legalForm: '',
        opcoCode: '',
        notes: '',
      });
    } else {
      reset({
        name: '',
        siret: '',
        vatNumber: '',
        address: '',
        city: '',
        postalCode: '',
        phone: '',
        email: '',
        website: '',
        legalForm: '',
        opcoName: '',
        opcoCode: '',
        notes: '',
      });
    }
  }, [company, reset]);

  const onSubmit = async (data: CompanyForm) => {
    setIsLoading(true);
    try {
      if (company) {
        await api.put(`/companies/${company.id}`, data);
        toast.success('Entreprise mise à jour');
      } else {
        await api.post('/companies', data);
        toast.success('Entreprise créée');
      }
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur');
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
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative transform rounded-lg bg-white shadow-xl transition-all w-full max-w-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    {company ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                  <div>
                    <label className="label">Nom *</label>
                    <input
                      {...register('name', { required: 'Nom requis' })}
                      className="input"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">SIRET</label>
                      <input {...register('siret')} className="input" />
                    </div>
                    <div>
                      <label className="label">Forme juridique</label>
                      <input {...register('legalForm')} className="input" placeholder="SARL, SAS..." />
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Téléphone</label>
                      <input {...register('phone')} className="input" />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input type="email" {...register('email')} className="input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">OPCO</label>
                      <input {...register('opcoName')} className="input" placeholder="ATLAS, OPCO 2i..." />
                    </div>
                    <div>
                      <label className="label">Code OPCO</label>
                      <input {...register('opcoCode')} className="input" />
                    </div>
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
