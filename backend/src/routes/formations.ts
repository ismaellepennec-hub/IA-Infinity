import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, paginatedResponse, generateReference } from '../utils/helpers';

const router = Router();

router.use(authenticate);

// Lister les formations
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, categoryId, modality, level, isActive, isCertifying } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { reference: { contains: search as string } },
        { description: { contains: search as string } }
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (modality) {
      where.modality = modality;
    }

    if (level) {
      where.level = level;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (isCertifying !== undefined) {
      where.isCertifying = isCertifying === 'true';
    }

    const [formations, total] = await Promise.all([
      prisma.formation.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true } },
          _count: { select: { sessions: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.formation.count({ where })
    ]);

    res.json(paginatedResponse(formations, total, page, limit));
  } catch (error) {
    console.error('Erreur liste formations:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des formations' });
  }
});

// Obtenir une formation par ID
router.get('/:id', async (req, res) => {
  try {
    const formation = await prisma.formation.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        sessions: {
          include: {
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
          orderBy: { startDate: 'desc' }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    if (!formation) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    res.json(formation);
  } catch (error) {
    console.error('Erreur récupération formation:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la formation' });
  }
});

// Créer une formation
router.post('/', async (req, res) => {
  try {
    const {
      title,
      shortDescription,
      description,
      categoryId,
      duration,
      modality,
      level,
      objectives,
      prerequisites,
      program,
      targetAudience,
      priceHT,
      priceIntra,
      vatRate,
      isCertifying,
      certificationName,
      rncp
    } = req.body;

    if (!title || !duration || !priceHT) {
      return res.status(400).json({ error: 'Titre, durée et prix HT sont requis' });
    }

    // Générer une référence unique
    const reference = generateReference('FOR');

    const formation = await prisma.formation.create({
      data: {
        reference,
        title,
        shortDescription,
        description,
        categoryId,
        duration,
        modality: modality || 'PRESENTIAL',
        level: level || 'BEGINNER',
        objectives,
        prerequisites,
        program,
        targetAudience,
        priceHT,
        priceIntra,
        vatRate: vatRate || 20,
        isCertifying: isCertifying || false,
        certificationName,
        rncp,
        createdById: req.user!.id
      },
      include: {
        category: { select: { id: true, name: true, color: true } }
      }
    });

    res.status(201).json(formation);
  } catch (error) {
    console.error('Erreur création formation:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la formation' });
  }
});

// Mettre à jour une formation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      shortDescription,
      description,
      categoryId,
      duration,
      modality,
      level,
      objectives,
      prerequisites,
      program,
      targetAudience,
      priceHT,
      priceIntra,
      vatRate,
      isCertifying,
      certificationName,
      rncp,
      isActive
    } = req.body;

    const existingFormation = await prisma.formation.findUnique({ where: { id } });
    if (!existingFormation) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    const formation = await prisma.formation.update({
      where: { id },
      data: {
        title,
        shortDescription,
        description,
        categoryId,
        duration,
        modality,
        level,
        objectives,
        prerequisites,
        program,
        targetAudience,
        priceHT,
        priceIntra,
        vatRate,
        isCertifying,
        certificationName,
        rncp,
        isActive
      },
      include: {
        category: { select: { id: true, name: true, color: true } }
      }
    });

    res.json(formation);
  } catch (error) {
    console.error('Erreur mise à jour formation:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la formation' });
  }
});

// Dupliquer une formation
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;

    const sourceFormation = await prisma.formation.findUnique({ where: { id } });
    if (!sourceFormation) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    const reference = generateReference('FOR');

    const newFormation = await prisma.formation.create({
      data: {
        reference,
        title: `${sourceFormation.title} (copie)`,
        shortDescription: sourceFormation.shortDescription,
        description: sourceFormation.description,
        categoryId: sourceFormation.categoryId,
        duration: sourceFormation.duration,
        modality: sourceFormation.modality,
        level: sourceFormation.level,
        objectives: sourceFormation.objectives,
        prerequisites: sourceFormation.prerequisites,
        program: sourceFormation.program,
        targetAudience: sourceFormation.targetAudience,
        priceHT: sourceFormation.priceHT,
        priceIntra: sourceFormation.priceIntra,
        vatRate: sourceFormation.vatRate,
        isCertifying: sourceFormation.isCertifying,
        certificationName: sourceFormation.certificationName,
        rncp: sourceFormation.rncp,
        isActive: false, // Nouvelle formation en brouillon
        createdById: req.user!.id
      },
      include: {
        category: { select: { id: true, name: true, color: true } }
      }
    });

    res.status(201).json(newFormation);
  } catch (error) {
    console.error('Erreur duplication formation:', error);
    res.status(500).json({ error: 'Erreur lors de la duplication de la formation' });
  }
});

// Supprimer une formation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingFormation = await prisma.formation.findUnique({ where: { id } });
    if (!existingFormation) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    // Vérifier les sessions associées
    const sessionsCount = await prisma.session.count({
      where: { formationId: id }
    });

    if (sessionsCount > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer cette formation car elle a des sessions associées'
      });
    }

    await prisma.formation.delete({ where: { id } });

    res.json({ message: 'Formation supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression formation:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la formation' });
  }
});

export default router;
