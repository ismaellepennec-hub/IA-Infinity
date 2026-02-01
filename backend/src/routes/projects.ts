import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, paginatedResponse, generateReference } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// Lister les projets
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, status, clientId, priority } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { reference: { contains: search as string } },
        { client: { name: { contains: search as string } } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (priority) {
      where.priority = priority;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { tasks: true, milestones: true, assignments: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.project.count({ where })
    ]);

    res.json(paginatedResponse(projects, total, page, limit));
  } catch (error) {
    console.error('Erreur liste projets:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des projets' });
  }
});

// Obtenir un projet avec détails
router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        milestones: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              include: {
                contractor: { select: { id: true, firstName: true, lastName: true } }
              }
            }
          }
        },
        tasks: {
          where: { milestoneId: null },
          include: {
            contractor: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { position: 'asc' }
        },
        assignments: {
          include: {
            contractor: { select: { id: true, firstName: true, lastName: true, email: true, specialty: true } }
          }
        },
        comments: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Créer un projet
router.post('/', async (req, res) => {
  try {
    const { name, description, clientId, managerId, startDate, endDate, deadline, budget, estimatedHours, priority, notes } = req.body;

    if (!name || !clientId) {
      return res.status(400).json({ error: 'Nom et client requis' });
    }

    const reference = generateReference('PRJ');

    const project = await prisma.project.create({
      data: {
        reference,
        name,
        description,
        clientId,
        managerId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        budget,
        estimatedHours,
        priority: priority || 'MEDIUM',
        notes
      },
      include: {
        client: { select: { id: true, name: true } },
        manager: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Erreur création projet:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

// Mettre à jour un projet
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, managerId, startDate, endDate, deadline, budget, estimatedHours, status, priority, progress, notes } = req.body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        managerId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        budget,
        estimatedHours,
        status,
        priority,
        progress,
        notes
      },
      include: {
        client: { select: { id: true, name: true } },
        manager: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// Ajouter un jalon (milestone)
router.post('/:id/milestones', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, dueDate } = req.body;

    const lastMilestone = await prisma.milestone.findFirst({
      where: { projectId: id },
      orderBy: { position: 'desc' }
    });

    const milestone = await prisma.milestone.create({
      data: {
        projectId: id,
        name,
        description,
        dueDate: new Date(dueDate),
        position: (lastMilestone?.position || 0) + 1
      }
    });

    res.status(201).json(milestone);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Mettre à jour un jalon
router.put('/milestones/:milestoneId', async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { name, description, dueDate, status, position } = req.body;

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: { name, description, dueDate: dueDate ? new Date(dueDate) : undefined, status, position }
    });

    res.json(milestone);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Supprimer un jalon
router.delete('/milestones/:milestoneId', async (req, res) => {
  try {
    await prisma.milestone.delete({ where: { id: req.params.milestoneId } });
    res.json({ message: 'Jalon supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Assigner un sous-traitant
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { contractorId, role, startDate, endDate, hoursAllocated, hourlyRate } = req.body;

    const assignment = await prisma.projectAssignment.create({
      data: {
        projectId: id,
        contractorId,
        role,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        hoursAllocated,
        hourlyRate
      },
      include: {
        contractor: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    res.status(201).json(assignment);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ce sous-traitant est déjà assigné au projet' });
    }
    res.status(500).json({ error: 'Erreur' });
  }
});

// Retirer une assignation
router.delete('/assignments/:assignmentId', async (req, res) => {
  try {
    await prisma.projectAssignment.delete({ where: { id: req.params.assignmentId } });
    res.json({ message: 'Assignation retirée' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Ajouter un commentaire
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await prisma.comment.create({
      data: {
        projectId: id,
        content,
        authorId: req.user!.id
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Supprimer un projet
router.delete('/:id', async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Projet supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
