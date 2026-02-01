import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api, { Formation, Category } from '../lib/api';

interface FormationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  formation?: Formation | null;
  categories: Category[];
}

interface FormationForm {
  title: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  duration: number;
  modality: string;
  level: string;
  objectives: string;
  prerequisites: string;
  program: string;
  targetAudience: string;
  priceHT: number;
  priceIntra: number;
  vatRate: number;
  isCertifying: boolean;
  certificationName: string;
}

export default function FormationModal({ isOpen, onClose, onSave, formation, categories }: FormationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormationForm>();

  useEffect(() => {
    if (formation) {
      reset({
        title: formation.title,
        shortDescription: formation.shortDescription || '',
        description: formation.description || '',
        categoryId: formation.categoryId || '',
        duration: formation.duration,
        modality: formation.modality,
        level: formation.level,
        objectives: formation.objectives || '',
        prerequisites: formation.prerequisites || '',
        program: formation.program || '',
        targetAudience: formation.targetAudience || '',
        priceHT: formation.priceHT,
        priceIntra: formation.priceIntra || 0,
        vatRate: formation.vatRate,
        isCertifying: formation.isCertifying,
        certificationName: '',
      });
    } else {
      reset({
        title: '',
        shortDescription: '',
        description: '',
        categoryId: '',
        duration: 7,
        modality: 'PRESENTIAL',
        level: 'BEGINNER',
        objectives: '',
        prerequisites: '',
        program: '',
        targetAudience: '',
        priceHT: 0,
        priceIntra: 0,
        vatRate: 20,
        isCertifying: false,
        certificationName: '',
      });
    }
  }, [formation, reset]);

  const onSubmit = async (data: FormationForm) => {
    setIsLoading(true);
    try {
      if (formation) {
        await api.put(`/formations/${formation.id}`, data);
        toast.success('Formation mise à jour');
      } else {
        await api.post('/formations', data);
        toast.success('Formation créée');
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
              <Dialog.Panel className="relative transform rounded-lg bg-white shadow-xl transition-all w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    {formation ? 'Modifier la formation' : 'Nouvelle formation'}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                  <div>
                    <label className="label">Titre *</label>
                    <input
                      {...register('title', { required: 'Titre requis' })}
                      className="input"
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                  </div>

                  <div>
                    <label className="label">Description courte</label>
                    <input {...register('shortDescription')} className="input" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Catégorie</label>
                      <select {...register('categoryId')} className="input">
                        <option value="">Aucune</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Durée (heures) *</label>
                      <input
                        type="number"
                        {...register('duration', { required: true, min: 1 })}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Modalité</label>
                      <select {...register('modality')} className="input">
                        <option value="PRESENTIAL">Présentiel</option>
                        <option value="REMOTE">Distanciel</option>
                        <option value="HYBRID">Hybride</option>
                        <option value="ELEARNING">E-learning</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Niveau</label>
                      <select {...register('level')} className="input">
                        <option value="BEGINNER">Débutant</option>
                        <option value="INTERMEDIATE">Intermédiaire</option>
                        <option value="ADVANCED">Avancé</option>
                        <option value="EXPERT">Expert</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label">Objectifs</label>
                    <textarea {...register('objectives')} className="input" rows={3} />
                  </div>

                  <div>
                    <label className="label">Prérequis</label>
                    <textarea {...register('prerequisites')} className="input" rows={2} />
                  </div>

                  <div>
                    <label className="label">Programme</label>
                    <textarea {...register('program')} className="input" rows={4} />
                  </div>

                  <div>
                    <label className="label">Public cible</label>
                    <input {...register('targetAudience')} className="input" />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">Prix HT *</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('priceHT', { required: true, min: 0 })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Prix Intra</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('priceIntra')}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">TVA (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('vatRate')}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...register('isCertifying')}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label className="text-sm text-gray-700">Formation certifiante</label>
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
