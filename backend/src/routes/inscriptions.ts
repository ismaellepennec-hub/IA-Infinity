import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, paginatedResponse, generateReference } from '../utils/helpers';

const router = Router();

router.use(authenticate);

// Lister les inscriptions
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, sessionId, contactId, status, financingType } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { reference: { contains: search as string } },
        { contact: { firstName: { contains: search as string } } },
        { contact: { lastName: { contains: search as string } } },
        { session: { formation: { title: { contains: search as string } } } }
      ];
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (contactId) {
      where.contactId = contactId;
    }

    if (status) {
      where.status = status;
    }

    if (financingType) {
      where.financingType = financingType;
    }

    const [inscriptions, total] = await Promise.all([
      prisma.inscription.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: { select: { id: true, name: true } }
            }
          },
          session: {
            include: {
              formation: { select: { id: true, title: true, reference: true } }
            }
          }
        },
        orderBy: { registrationDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.inscription.count({ where })
    ]);

    res.json(paginatedResponse(inscriptions, total, page, limit));
  } catch (error) {
    console.error('Erreur liste inscriptions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des inscriptions' });
  }
});

// Obtenir une inscription par ID
router.get('/:id', async (req, res) => {
  try {
    const inscription = await prisma.inscription.findUnique({
      where: { id: req.params.id },
      include: {
        contact: {
          include: {
            company: true
          }
        },
        session: {
          include: {
            formation: true,
            formateurs: {
              include: {
                formateur: {
                  include: { contact: true }
                }
              }
            }
          }
        },
        attendances: {
          orderBy: { date: 'asc' }
        },
        evaluations: {
          orderBy: { date: 'desc' }
        },
        certificates: {
          orderBy: { issueDate: 'desc' }
        }
      }
    });

    if (!inscription) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    res.json(inscription);
  } catch (error) {
    console.error('Erreur récupération inscription:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'inscription' });
  }
});

// Créer une inscription
router.post('/', async (req, res) => {
  try {
    const {
      contactId,
      sessionId,
      financingType,
      financingDetails,
      priceHT,
      vatRate,
      notes,
      specialNeeds
    } = req.body;

    if (!contactId || !sessionId) {
      return res.status(400).json({ error: 'Contact et session sont requis' });
    }

    // Vérifier que le contact existe
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      return res.status(404).json({ error: 'Contact non trouvé' });
    }

    // Vérifier que la session existe et n'est pas complète
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        formation: true,
        _count: { select: { inscriptions: true } }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    // Vérifier qu'il n'y a pas déjà une inscription pour ce contact sur cette session
    const existingInscription = await prisma.inscription.findUnique({
      where: {
        contactId_sessionId: { contactId, sessionId }
      }
    });

    if (existingInscription) {
      return res.status(400).json({ error: 'Ce contact est déjà inscrit à cette session' });
    }

    // Vérifier la capacité
    const isWaitingList = session._count.inscriptions >= session.maxParticipants;

    const reference = generateReference('INS');
    const finalPrice = priceHT || session.formation.priceHT;

    const inscription = await prisma.inscription.create({
      data: {
        reference,
        contactId,
        sessionId,
        status: isWaitingList ? 'WAITING_LIST' : 'PENDING',
        financingType: financingType || 'COMPANY',
        financingDetails,
        priceHT: finalPrice,
        vatRate: vatRate || session.formation.vatRate,
        notes,
        specialNeeds
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        session: {
          include: {
            formation: { select: { id: true, title: true } }
          }
        }
      }
    });

    // Mettre à jour le statut du contact si nécessaire
    if (contact.status === 'PROSPECT') {
      await prisma.contact.update({
        where: { id: contactId },
        data: { status: 'APPRENANT' }
      });
    }

    res.status(201).json(inscription);
  } catch (error) {
    console.error('Erreur création inscription:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'inscription' });
  }
});

// Mettre à jour une inscription
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      financingType,
      financingDetails,
      priceHT,
      vatRate,
      notes,
      specialNeeds
    } = req.body;

    const existingInscription = await prisma.inscription.findUnique({ where: { id } });
    if (!existingInscription) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    const updateData: any = {
      financingType,
      financingDetails,
      priceHT,
      vatRate,
      notes,
      specialNeeds
    };

    // Gérer les changements de statut
    if (status && status !== existingInscription.status) {
      updateData.status = status;

      if (status === 'CONFIRMED' && !existingInscription.confirmationDate) {
        updateData.confirmationDate = new Date();
      }

      if (status === 'CANCELLED' && !existingInscription.cancellationDate) {
        updateData.cancellationDate = new Date();
      }
    }

    const inscription = await prisma.inscription.update({
      where: { id },
      data: updateData,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        session: {
          include: {
            formation: { select: { id: true, title: true } }
          }
        }
      }
    });

    res.json(inscription);
  } catch (error) {
    console.error('Erreur mise à jour inscription:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'inscription' });
  }
});

// Confirmer une inscription
router.post('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;

    const inscription = await prisma.inscription.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmationDate: new Date()
      },
      include: {
        contact: { select: { firstName: true, lastName: true, email: true } },
        session: { include: { formation: { select: { title: true } } } }
      }
    });

    res.json(inscription);
  } catch (error) {
    console.error('Erreur confirmation inscription:', error);
    res.status(500).json({ error: 'Erreur lors de la confirmation de l\'inscription' });
  }
});

// Annuler une inscription
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existingInscription = await prisma.inscription.findUnique({ where: { id } });
    if (!existingInscription) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    const inscription = await prisma.inscription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationDate: new Date(),
        notes: reason
          ? `${existingInscription.notes || ''}\n[ANNULATION] ${reason}`
          : existingInscription.notes
      }
    });

    res.json(inscription);
  } catch (error) {
    console.error('Erreur annulation inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de l\'inscription' });
  }
});

// Enregistrer une présence
router.post('/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, status, arrivalTime, departureTime, notes } = req.body;

    const inscription = await prisma.inscription.findUnique({
      where: { id },
      include: { session: true }
    });

    if (!inscription) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        inscriptionId_date: {
          inscriptionId: id,
          date: new Date(date)
        }
      },
      create: {
        inscriptionId: id,
        sessionId: inscription.sessionId,
        date: new Date(date),
        status: status || 'PRESENT',
        arrivalTime: arrivalTime ? new Date(arrivalTime) : undefined,
        departureTime: departureTime ? new Date(departureTime) : undefined,
        notes
      },
      update: {
        status,
        arrivalTime: arrivalTime ? new Date(arrivalTime) : undefined,
        departureTime: departureTime ? new Date(departureTime) : undefined,
        notes
      }
    });

    res.json(attendance);
  } catch (error) {
    console.error('Erreur enregistrement présence:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la présence' });
  }
});

// Ajouter une évaluation
router.post('/:id/evaluation', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, globalScore, scores, comments, strengths, improvements } = req.body;

    const inscription = await prisma.inscription.findUnique({ where: { id } });
    if (!inscription) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        inscriptionId: id,
        type: type || 'SATISFACTION',
        globalScore,
        scores: scores ? JSON.stringify(scores) : undefined,
        comments,
        strengths,
        improvements
      }
    });

    res.status(201).json(evaluation);
  } catch (error) {
    console.error('Erreur ajout évaluation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'évaluation' });
  }
});

// Générer un certificat
router.post('/:id/certificate', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, description } = req.body;

    const inscription = await prisma.inscription.findUnique({
      where: { id },
      include: {
        contact: true,
        session: { include: { formation: true } }
      }
    });

    if (!inscription) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    const reference = generateReference('CERT');

    const certificate = await prisma.certificate.create({
      data: {
        inscriptionId: id,
        type: type || 'COMPLETION',
        reference,
        title: title || `Attestation de formation - ${inscription.session.formation.title}`,
        description
      }
    });

    res.status(201).json(certificate);
  } catch (error) {
    console.error('Erreur génération certificat:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du certificat' });
  }
});

// Supprimer une inscription
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingInscription = await prisma.inscription.findUnique({ where: { id } });
    if (!existingInscription) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    // Supprimer les dépendances
    await Promise.all([
      prisma.attendance.deleteMany({ where: { inscriptionId: id } }),
      prisma.evaluation.deleteMany({ where: { inscriptionId: id } }),
      prisma.certificate.deleteMany({ where: { inscriptionId: id } })
    ]);

    await prisma.inscription.delete({ where: { id } });

    res.json({ message: 'Inscription supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression inscription:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'inscription' });
  }
});

export default router;
