import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, paginatedResponse } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// Lister les clients
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, status } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
        { company: { contains: search as string } }
      ];
    }

    if (status) {
      where.status = status;
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          _count: { select: { projects: true, contacts: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.client.count({ where })
    ]);

    res.json(paginatedResponse(clients, total, page, limit));
  } catch (error) {
    console.error('Erreur liste clients:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des clients' });
  }
});

// Obtenir un client
router.get('/:id', async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        contacts: true,
        projects: {
          include: {
            _count: { select: { tasks: true, milestones: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Créer un client
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, address, city, postalCode, website, notes, contacts } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        company,
        address,
        city,
        postalCode,
        website,
        notes,
        contacts: contacts ? {
          create: contacts.map((c: any, i: number) => ({
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            jobTitle: c.jobTitle,
            isPrimary: i === 0
          }))
        } : undefined
      },
      include: { contacts: true }
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('Erreur création client:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

// Mettre à jour un client
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, address, city, postalCode, website, notes, status } = req.body;

    const client = await prisma.client.update({
      where: { id },
      data: { name, email, phone, company, address, city, postalCode, website, notes, status },
      include: { contacts: true }
    });

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// Supprimer un client
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const projectsCount = await prisma.project.count({ where: { clientId: id } });
    if (projectsCount > 0) {
      return res.status(400).json({ error: 'Impossible de supprimer ce client car il a des projets' });
    }

    await prisma.client.delete({ where: { id } });
    res.json({ message: 'Client supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

export default router;
