import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, paginatedResponse, generateReference } from '../utils/helpers';

const router = Router();

router.use(authenticate);

// Lister les sessions
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, formationId, status, startDate, endDate } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { reference: { contains: search as string } },
        { formation: { title: { contains: search as string } } },
        { location: { contains: search as string } }
      ];
    }

    if (formationId) {
      where.formationId = formationId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate) {
      where.startDate = { gte: new Date(startDate as string) };
    }

    if (endDate) {
      where.endDate = { lte: new Date(endDate as string) };
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          formation: {
            select: { id: true, title: true, reference: true, duration: true }
          },
          formateurs: {
            include: {
              formateur: {
                include: {
                  contact: { select: { firstName: true, lastName: true } }
                }
              }
            }
          },
          _count: { select: { inscriptions: true } }
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.session.count({ where })
    ]);

    res.json(paginatedResponse(sessions, total, page, limit));
  } catch (error) {
    console.error('Erreur liste sessions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des sessions' });
  }
});

// Calendrier des sessions
router.get('/calendar', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Dates de début et fin requises' });
    }

    const sessions = await prisma.session.findMany({
      where: {
        startDate: { gte: new Date(startDate as string) },
        endDate: { lte: new Date(endDate as string) },
        status: { not: 'CANCELLED' }
      },
      include: {
        formation: {
          select: { id: true, title: true, reference: true }
        },
        formateurs: {
          include: {
            formateur: {
              include: {
                contact: { select: { firstName: true, lastName: true } }
              }
            }
          }
        },
        _count: { select: { inscriptions: true } }
      },
      orderBy: { startDate: 'asc' }
    });

    res.json(sessions);
  } catch (error) {
    console.error('Erreur calendrier sessions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du calendrier' });
  }
});

// Obtenir une session par ID
router.get('/:id', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        formation: true,
        formateurs: {
          include: {
            formateur: {
              include: { contact: true }
            }
          }
        },
        inscriptions: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                company: { select: { id: true, name: true } }
              }
            }
          }
        },
        attendances: true,
        conventions: {
          include: {
            company: { select: { id: true, name: true } }
          }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    res.json(session);
  } catch (error) {
    console.error('Erreur récupération session:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la session' });
  }
});

// Créer une session
router.post('/', async (req, res) => {
  try {
    const {
      formationId,
      startDate,
      endDate,
      location,
      room,
      address,
      city,
      isRemote,
      meetingLink,
      minParticipants,
      maxParticipants,
      notes,
      formateurIds
    } = req.body;

    if (!formationId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Formation, date de début et date de fin sont requis' });
    }

    // Vérifier que la formation existe
    const formation = await prisma.formation.findUnique({ where: { id: formationId } });
    if (!formation) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    const reference = generateReference('SES');

    const session = await prisma.session.create({
      data: {
        reference,
        formationId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        room,
        address,
        city,
        isRemote: isRemote || false,
        meetingLink,
        minParticipants: minParticipants || 4,
        maxParticipants: maxParticipants || 12,
        notes,
        createdById: req.user!.id,
        // Ajouter les formateurs si fournis
        ...(formateurIds && formateurIds.length > 0 && {
          formateurs: {
            create: formateurIds.map((formateurId: string, index: number) => ({
              formateurId,
              isPrimary: index === 0
            }))
          }
        })
      },
      include: {
        formation: { select: { id: true, title: true, reference: true } },
        formateurs: {
          include: {
            formateur: {
              include: {
                contact: { select: { firstName: true, lastName: true } }
              }
            }
          }
        }
      }
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Erreur création session:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la session' });
  }
});

// Mettre à jour une session
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      startDate,
      endDate,
      location,
      room,
      address,
      city,
      isRemote,
      meetingLink,
      minParticipants,
      maxParticipants,
      status,
      notes
    } = req.body;

    const existingSession = await prisma.session.findUnique({ where: { id } });
    if (!existingSession) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const session = await prisma.session.update({
      where: { id },
      data: {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        location,
        room,
        address,
        city,
        isRemote,
        meetingLink,
        minParticipants,
        maxParticipants,
        status,
        notes
      },
      include: {
        formation: { select: { id: true, title: true, reference: true } },
        formateurs: {
          include: {
            formateur: {
              include: {
                contact: { select: { firstName: true, lastName: true } }
              }
            }
          }
        },
        _count: { select: { inscriptions: true } }
      }
    });

    res.json(session);
  } catch (error) {
    console.error('Erreur mise à jour session:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la session' });
  }
});

// Ajouter/modifier les formateurs d'une session
router.put('/:id/formateurs', async (req, res) => {
  try {
    const { id } = req.params;
    const { formateurIds } = req.body;

    const existingSession = await prisma.session.findUnique({ where: { id } });
    if (!existingSession) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    // Supprimer les anciens formateurs
    await prisma.sessionFormateur.deleteMany({ where: { sessionId: id } });

    // Ajouter les nouveaux formateurs
    if (formateurIds && formateurIds.length > 0) {
      await prisma.sessionFormateur.createMany({
        data: formateurIds.map((formateurId: string, index: number) => ({
          sessionId: id,
          formateurId,
          isPrimary: index === 0
        }))
      });
    }

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        formateurs: {
          include: {
            formateur: {
              include: {
                contact: { select: { firstName: true, lastName: true } }
              }
            }
          }
        }
      }
    });

    res.json(session);
  } catch (error) {
    console.error('Erreur mise à jour formateurs session:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des formateurs' });
  }
});

// Annuler une session
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existingSession = await prisma.session.findUnique({ where: { id } });
    if (!existingSession) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const session = await prisma.session.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${existingSession.notes || ''}\n[ANNULATION] ${reason}` : existingSession.notes
      }
    });

    // Annuler toutes les inscriptions
    await prisma.inscription.updateMany({
      where: { sessionId: id, status: { in: ['PENDING', 'CONFIRMED'] } },
      data: { status: 'CANCELLED', cancellationDate: new Date() }
    });

    res.json(session);
  } catch (error) {
    console.error('Erreur annulation session:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la session' });
  }
});

// Supprimer une session
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingSession = await prisma.session.findUnique({ where: { id } });
    if (!existingSession) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    // Vérifier les inscriptions
    const inscriptionsCount = await prisma.inscription.count({
      where: { sessionId: id }
    });

    if (inscriptionsCount > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer cette session car elle a des inscriptions. Annulez-la plutôt.'
      });
    }

    // Supprimer les formateurs associés
    await prisma.sessionFormateur.deleteMany({ where: { sessionId: id } });

    await prisma.session.delete({ where: { id } });

    res.json({ message: 'Session supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression session:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la session' });
  }
});

export default router;
