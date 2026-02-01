import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Lister toutes les catégories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { formations: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(categories);
  } catch (error) {
    console.error('Erreur liste catégories:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des catégories' });
  }
});

// Obtenir une catégorie par ID
router.get('/:id', async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        formations: {
          where: { isActive: true },
          select: {
            id: true,
            reference: true,
            title: true,
            duration: true,
            priceHT: true,
            modality: true,
            level: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    res.json(category);
  } catch (error) {
    console.error('Erreur récupération catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la catégorie' });
  }
});

// Créer une catégorie
router.post('/', async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom de la catégorie est requis' });
    }

    // Vérifier que le nom n'existe pas déjà
    const existingCategory = await prisma.category.findUnique({ where: { name } });
    if (existingCategory) {
      return res.status(400).json({ error: 'Une catégorie avec ce nom existe déjà' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        color: color || '#3B82F6' // Bleu par défaut
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Erreur création catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la catégorie' });
  }
});

// Mettre à jour une catégorie
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    const existingCategory = await prisma.category.findUnique({ where: { id } });
    if (!existingCategory) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Vérifier que le nouveau nom n'existe pas déjà
    if (name && name !== existingCategory.name) {
      const duplicateName = await prisma.category.findUnique({ where: { name } });
      if (duplicateName) {
        return res.status(400).json({ error: 'Une catégorie avec ce nom existe déjà' });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name, description, color }
    });

    res.json(category);
  } catch (error) {
    console.error('Erreur mise à jour catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la catégorie' });
  }
});

// Supprimer une catégorie
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingCategory = await prisma.category.findUnique({ where: { id } });
    if (!existingCategory) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Vérifier les formations associées
    const formationsCount = await prisma.formation.count({
      where: { categoryId: id }
    });

    if (formationsCount > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer cette catégorie car elle contient des formations'
      });
    }

    await prisma.category.delete({ where: { id } });

    res.json({ message: 'Catégorie supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la catégorie' });
  }
});

export default router;
