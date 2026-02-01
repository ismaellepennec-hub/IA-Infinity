import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, paginatedResponse } from '../utils/helpers';

const router = Router();

router.use(authenticate);

// Lister les entreprises
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { siret: { contains: search as string } },
        { city: { contains: search as string } }
      ];
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          _count: {
            select: { contacts: true, invoices: true }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      prisma.company.count({ where })
    ]);

    res.json(paginatedResponse(companies, total, page, limit));
  } catch (error) {
    console.error('Erreur liste entreprises:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des entreprises' });
  }
});

// Obtenir une entreprise par ID
router.get('/:id', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            status: true
          }
        },
        invoices: {
          select: {
            id: true,
            reference: true,
            totalTTC: true,
            status: true,
            issueDate: true
          },
          orderBy: { issueDate: 'desc' },
          take: 10
        },
        conventions: {
          include: {
            session: {
              include: {
                formation: { select: { id: true, title: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    res.json(company);
  } catch (error) {
    console.error('Erreur récupération entreprise:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'entreprise' });
  }
});

// Créer une entreprise
router.post('/', async (req, res) => {
  try {
    const {
      name,
      siret,
      vatNumber,
      address,
      city,
      postalCode,
      country,
      phone,
      email,
      website,
      legalForm,
      capital,
      opcoName,
      opcoCode,
      notes
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom de l\'entreprise est requis' });
    }

    const company = await prisma.company.create({
      data: {
        name,
        siret,
        vatNumber,
        address,
        city,
        postalCode,
        country: country || 'France',
        phone,
        email,
        website,
        legalForm,
        capital,
        opcoName,
        opcoCode,
        notes
      }
    });

    res.status(201).json(company);
  } catch (error) {
    console.error('Erreur création entreprise:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'entreprise' });
  }
});

// Mettre à jour une entreprise
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      siret,
      vatNumber,
      address,
      city,
      postalCode,
      country,
      phone,
      email,
      website,
      legalForm,
      capital,
      opcoName,
      opcoCode,
      notes
    } = req.body;

    const existingCompany = await prisma.company.findUnique({ where: { id } });
    if (!existingCompany) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        name,
        siret,
        vatNumber,
        address,
        city,
        postalCode,
        country,
        phone,
        email,
        website,
        legalForm,
        capital,
        opcoName,
        opcoCode,
        notes
      }
    });

    res.json(company);
  } catch (error) {
    console.error('Erreur mise à jour entreprise:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'entreprise' });
  }
});

// Supprimer une entreprise
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingCompany = await prisma.company.findUnique({ where: { id } });
    if (!existingCompany) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Vérifier les dépendances
    const [contactsCount, invoicesCount] = await Promise.all([
      prisma.contact.count({ where: { companyId: id } }),
      prisma.invoice.count({ where: { companyId: id } })
    ]);

    if (contactsCount > 0 || invoicesCount > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer cette entreprise car elle a des contacts ou factures associés'
      });
    }

    await prisma.company.delete({ where: { id } });

    res.json({ message: 'Entreprise supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression entreprise:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'entreprise' });
  }
});

export default router;
