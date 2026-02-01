import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, paginatedResponse } from '../utils/helpers';

const router = Router();

router.use(authenticate);

// Lister les formateurs
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, status } = req.query;

    const where: any = {};

    if (search) {
      where.contact = {
        OR: [
          { firstName: { contains: search as string } },
          { lastName: { contains: search as string } },
          { email: { contains: search as string } }
        ]
      };
    }

    if (status) {
      where.status = status;
    }

    const [formateurs, total] = await Promise.all([
      prisma.formateur.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              mobile: true
            }
          },
          _count: {
            select: { sessions: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.formateur.count({ where })
    ]);

    res.json(paginatedResponse(formateurs, total, page, limit));
  } catch (error) {
    console.error('Erreur liste formateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des formateurs' });
  }
});

// Obtenir un formateur par ID
router.get('/:id', async (req, res) => {
  try {
    const formateur = await prisma.formateur.findUnique({
      where: { id: req.params.id },
      include: {
        contact: true,
        sessions: {
          include: {
            session: {
              include: {
                formation: { select: { id: true, title: true, reference: true } }
              }
            }
          },
          orderBy: { session: { startDate: 'desc' } }
        }
      }
    });

    if (!formateur) {
      return res.status(404).json({ error: 'Formateur non trouvé' });
    }

    res.json(formateur);
  } catch (error) {
    console.error('Erreur récupération formateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du formateur' });
  }
});

// Créer un formateur (à partir d'un contact existant ou nouveau)
router.post('/', async (req, res) => {
  try {
    const {
      contactId,
      // Si pas de contactId, créer un nouveau contact
      firstName,
      lastName,
      email,
      phone,
      mobile,
      // Infos formateur
      specialties,
      bio,
      hourlyRate,
      dailyRate,
      contractType,
      cvUrl
    } = req.body;

    let finalContactId = contactId;

    // Si pas de contactId, créer un nouveau contact
    if (!contactId) {
      if (!firstName || !lastName) {
        return res.status(400).json({ error: 'Prénom et nom sont requis pour créer un nouveau formateur' });
      }

      const newContact = await prisma.contact.create({
        data: {
          type: 'PROFESSIONAL',
          status: 'CLIENT',
          firstName,
          lastName,
          email,
          phone,
          mobile,
          createdById: req.user!.id
        }
      });

      finalContactId = newContact.id;
    }

    // Vérifier que le contact n'est pas déjà formateur
    const existingFormateur = await prisma.formateur.findUnique({
      where: { contactId: finalContactId }
    });

    if (existingFormateur) {
      return res.status(400).json({ error: 'Ce contact est déjà enregistré comme formateur' });
    }

    const formateur = await prisma.formateur.create({
      data: {
        contactId: finalContactId,
        specialties,
        bio,
        hourlyRate,
        dailyRate,
        contractType,
        cvUrl
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    res.status(201).json(formateur);
  } catch (error) {
    console.error('Erreur création formateur:', error);
    res.status(500).json({ error: 'Erreur lors de la création du formateur' });
  }
});

// Mettre à jour un formateur
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      specialties,
      bio,
      hourlyRate,
      dailyRate,
      status,
      contractType,
      cvUrl
    } = req.body;

    const existingFormateur = await prisma.formateur.findUnique({ where: { id } });
    if (!existingFormateur) {
      return res.status(404).json({ error: 'Formateur non trouvé' });
    }

    const formateur = await prisma.formateur.update({
      where: { id },
      data: {
        specialties,
        bio,
        hourlyRate,
        dailyRate,
        status,
        contractType,
        cvUrl
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json(formateur);
  } catch (error) {
    console.error('Erreur mise à jour formateur:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du formateur' });
  }
});

// Obtenir les disponibilités d'un formateur (sessions planifiées)
router.get('/:id/disponibilites', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const where: any = {
      formateurId: id
    };

    if (startDate || endDate) {
      where.session = {
        ...(startDate && { startDate: { gte: new Date(startDate as string) } }),
        ...(endDate && { endDate: { lte: new Date(endDate as string) } })
      };
    }

    const sessions = await prisma.sessionFormateur.findMany({
      where,
      include: {
        session: {
          include: {
            formation: { select: { id: true, title: true } }
          }
        }
      },
      orderBy: { session: { startDate: 'asc' } }
    });

    res.json(sessions);
  } catch (error) {
    console.error('Erreur disponibilités formateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités' });
  }
});

// Supprimer un formateur
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingFormateur = await prisma.formateur.findUnique({ where: { id } });
    if (!existingFormateur) {
      return res.status(404).json({ error: 'Formateur non trouvé' });
    }

    // Vérifier les sessions associées
    const sessionsCount = await prisma.sessionFormateur.count({
      where: { formateurId: id }
    });

    if (sessionsCount > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer ce formateur car il a des sessions associées'
      });
    }

    await prisma.formateur.delete({ where: { id } });

    res.json({ message: 'Formateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression formateur:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du formateur' });
  }
});

export default router;
