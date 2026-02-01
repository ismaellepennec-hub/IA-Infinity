import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, paginatedResponse } from '../utils/helpers';

const router = Router();

// Appliquer l'authentification à toutes les routes
router.use(authenticate);

// Lister tous les contacts avec pagination et filtres
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, type, status, companyId } = req.query;

    const where: any = {};

    // Filtres
    if (search) {
      where.OR = [
        { firstName: { contains: search as string } },
        { lastName: { contains: search as string } },
        { email: { contains: search as string } },
        { company: { name: { contains: search as string } } }
      ];
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.contact.count({ where })
    ]);

    res.json(paginatedResponse(contacts, total, page, limit));
  } catch (error) {
    console.error('Erreur liste contacts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des contacts' });
  }
});

// Obtenir un contact par ID
router.get('/:id', async (req, res) => {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        formateur: true,
        inscriptions: {
          include: {
            session: {
              include: {
                formation: { select: { id: true, title: true, reference: true } }
              }
            }
          },
          orderBy: { registrationDate: 'desc' }
        },
        opportunities: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact non trouvé' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Erreur récupération contact:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du contact' });
  }
});

// Créer un nouveau contact
router.post('/', async (req, res) => {
  try {
    const {
      type,
      status,
      firstName,
      lastName,
      email,
      phone,
      mobile,
      companyId,
      jobTitle,
      address,
      city,
      postalCode,
      country,
      notes,
      source
    } = req.body;

    if (!firstName || !lastName || !type) {
      return res.status(400).json({ error: 'Prénom, nom et type sont requis' });
    }

    const contact = await prisma.contact.create({
      data: {
        type,
        status: status || 'PROSPECT',
        firstName,
        lastName,
        email,
        phone,
        mobile,
        companyId,
        jobTitle,
        address,
        city,
        postalCode,
        country: country || 'France',
        notes,
        source,
        createdById: req.user!.id
      },
      include: {
        company: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error('Erreur création contact:', error);
    res.status(500).json({ error: 'Erreur lors de la création du contact' });
  }
});

// Mettre à jour un contact
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      status,
      firstName,
      lastName,
      email,
      phone,
      mobile,
      companyId,
      jobTitle,
      address,
      city,
      postalCode,
      country,
      notes,
      source
    } = req.body;

    const existingContact = await prisma.contact.findUnique({ where: { id } });
    if (!existingContact) {
      return res.status(404).json({ error: 'Contact non trouvé' });
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        type,
        status,
        firstName,
        lastName,
        email,
        phone,
        mobile,
        companyId,
        jobTitle,
        address,
        city,
        postalCode,
        country,
        notes,
        source
      },
      include: {
        company: { select: { id: true, name: true } }
      }
    });

    res.json(contact);
  } catch (error) {
    console.error('Erreur mise à jour contact:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du contact' });
  }
});

// Supprimer un contact
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingContact = await prisma.contact.findUnique({ where: { id } });
    if (!existingContact) {
      return res.status(404).json({ error: 'Contact non trouvé' });
    }

    // Vérifier les dépendances
    const inscriptionsCount = await prisma.inscription.count({
      where: { contactId: id }
    });

    if (inscriptionsCount > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer ce contact car il a des inscriptions associées'
      });
    }

    await prisma.contact.delete({ where: { id } });

    res.json({ message: 'Contact supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression contact:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du contact' });
  }
});

// Statistiques des contacts
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      totalContacts,
      prospects,
      clients,
      apprenants,
      byType
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { status: 'PROSPECT' } }),
      prisma.contact.count({ where: { status: 'CLIENT' } }),
      prisma.contact.count({ where: { status: 'APPRENANT' } }),
      prisma.contact.groupBy({
        by: ['type'],
        _count: { id: true }
      })
    ]);

    res.json({
      total: totalContacts,
      byStatus: {
        prospects,
        clients,
        apprenants
      },
      byType: byType.reduce((acc: any, item) => {
        acc[item.type] = item._count.id;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Erreur stats contacts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

export default router;
