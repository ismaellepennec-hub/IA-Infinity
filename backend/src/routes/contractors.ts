import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, paginatedResponse } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// Lister les sous-traitants
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, status, skill } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search as string } },
        { lastName: { contains: search as string } },
        { email: { contains: search as string } },
        { specialty: { contains: search as string } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (skill) {
      where.skills = { contains: skill as string };
    }

    const [contractors, total] = await Promise.all([
      prisma.contractor.findMany({
        where,
        include: {
          _count: { select: { assignments: true, tasks: true } },
          availabilities: {
            where: {
              startDate: { gte: new Date() }
            },
            take: 5,
            orderBy: { startDate: 'asc' }
          }
        },
        orderBy: { lastName: 'asc' },
        skip,
        take: limit
      }),
      prisma.contractor.count({ where })
    ]);

    res.json(paginatedResponse(contractors, total, page, limit));
  } catch (error) {
    console.error('Erreur liste sous-traitants:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// Obtenir un sous-traitant
router.get('/:id', async (req, res) => {
  try {
    const contractor = await prisma.contractor.findUnique({
      where: { id: req.params.id },
      include: {
        availabilities: {
          orderBy: { startDate: 'desc' }
        },
        assignments: {
          include: {
            project: {
              select: { id: true, name: true, reference: true, status: true, client: { select: { name: true } } }
            }
          }
        },
        tasks: {
          where: { status: { not: 'COMPLETED' } },
          include: {
            project: { select: { id: true, name: true } }
          },
          take: 10
        }
      }
    });

    if (!contractor) {
      return res.status(404).json({ error: 'Sous-traitant non trouvé' });
    }

    res.json(contractor);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Créer un sous-traitant
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, company, siret, skills, specialty, hourlyRate, dailyRate, address, city, postalCode, notes } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Prénom, nom et email requis' });
    }

    const contractor = await prisma.contractor.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
        siret,
        skills,
        specialty,
        hourlyRate,
        dailyRate,
        address,
        city,
        postalCode,
        notes
      }
    });

    res.status(201).json(contractor);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Cet email existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

// Mettre à jour un sous-traitant
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, company, siret, skills, specialty, hourlyRate, dailyRate, address, city, postalCode, notes, status } = req.body;

    const contractor = await prisma.contractor.update({
      where: { id },
      data: { firstName, lastName, email, phone, company, siret, skills, specialty, hourlyRate, dailyRate, address, city, postalCode, notes, status }
    });

    res.json(contractor);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// Gérer les disponibilités
router.post('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, type, notes } = req.body;

    const availability = await prisma.availability.create({
      data: {
        contractorId: id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: type || 'AVAILABLE',
        notes
      }
    });

    res.status(201).json(availability);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Obtenir les disponibilités
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const where: any = { contractorId: id };

    if (startDate) {
      where.startDate = { gte: new Date(startDate as string) };
    }
    if (endDate) {
      where.endDate = { lte: new Date(endDate as string) };
    }

    const availabilities = await prisma.availability.findMany({
      where,
      orderBy: { startDate: 'asc' }
    });

    res.json(availabilities);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Supprimer une disponibilité
router.delete('/availability/:availabilityId', async (req, res) => {
  try {
    await prisma.availability.delete({ where: { id: req.params.availabilityId } });
    res.json({ message: 'Disponibilité supprimée' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Supprimer un sous-traitant
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const assignmentsCount = await prisma.projectAssignment.count({ where: { contractorId: id } });
    if (assignmentsCount > 0) {
      return res.status(400).json({ error: 'Ce sous-traitant est assigné à des projets' });
    }

    await prisma.contractor.delete({ where: { id } });
    res.json({ message: 'Sous-traitant supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
