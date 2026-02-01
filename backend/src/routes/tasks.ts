import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, paginatedResponse } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// Lister les tâches
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, status, projectId, contractorId, priority } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (contractorId) {
      where.contractorId = contractorId;
    }

    if (priority) {
      where.priority = priority;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, reference: true } },
          milestone: { select: { id: true, name: true } },
          contractor: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        skip,
        take: limit
      }),
      prisma.task.count({ where })
    ]);

    res.json(paginatedResponse(tasks, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Mes tâches (assignées à l'utilisateur courant ou aux projets dont il est manager)
router.get('/my-tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { assigneeId: req.user!.id },
          { project: { managerId: req.user!.id } }
        ],
        status: { not: 'COMPLETED' }
      },
      include: {
        project: { select: { id: true, name: true, reference: true } },
        milestone: { select: { id: true, name: true } },
        contractor: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 50
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Obtenir une tâche
router.get('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true, reference: true, clientId: true, client: { select: { name: true } } } },
        milestone: true,
        contractor: true,
        assignee: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        timeEntries: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Créer une tâche
router.post('/', async (req, res) => {
  try {
    const { projectId, milestoneId, title, description, assigneeId, contractorId, startDate, dueDate, priority, estimatedHours } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ error: 'Projet et titre requis' });
    }

    const lastTask = await prisma.task.findFirst({
      where: { projectId, milestoneId: milestoneId || null },
      orderBy: { position: 'desc' }
    });

    const task = await prisma.task.create({
      data: {
        projectId,
        milestoneId,
        title,
        description,
        assigneeId,
        contractorId,
        startDate: startDate ? new Date(startDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority: priority || 'MEDIUM',
        estimatedHours,
        position: (lastTask?.position || 0) + 1
      },
      include: {
        project: { select: { id: true, name: true } },
        contractor: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Erreur création tâche:', error);
    res.status(500).json({ error: 'Erreur' });
  }
});

// Mettre à jour une tâche
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, milestoneId, assigneeId, contractorId, startDate, dueDate, status, priority, estimatedHours, actualHours, position } = req.body;

    const updateData: any = {
      title,
      description,
      milestoneId,
      assigneeId,
      contractorId,
      startDate: startDate ? new Date(startDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority,
      estimatedHours,
      actualHours,
      position
    };

    // Si le statut passe à COMPLETED
    if (status === 'COMPLETED') {
      updateData.status = status;
      updateData.completedAt = new Date();
    } else if (status) {
      updateData.status = status;
      updateData.completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        contractor: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    // Mettre à jour la progression du projet
    await updateProjectProgress(task.projectId);

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Ajouter un commentaire sur une tâche
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await prisma.comment.create({
      data: {
        taskId: id,
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

// Ajouter une entrée de temps
router.post('/:id/time', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, hours, description } = req.body;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        taskId: id,
        projectId: task.projectId,
        date: new Date(date),
        hours,
        description
      }
    });

    // Mettre à jour les heures réelles de la tâche
    const totalHours = await prisma.timeEntry.aggregate({
      where: { taskId: id },
      _sum: { hours: true }
    });

    await prisma.task.update({
      where: { id },
      data: { actualHours: totalHours._sum.hours || 0 }
    });

    res.status(201).json(timeEntry);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Supprimer une tâche
router.delete('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    await prisma.task.delete({ where: { id: req.params.id } });

    // Mettre à jour la progression du projet
    await updateProjectProgress(task.projectId);

    res.json({ message: 'Tâche supprimée' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Fonction helper pour mettre à jour la progression d'un projet
async function updateProjectProgress(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: { status: true }
  });

  if (tasks.length === 0) return;

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const progress = Math.round((completedTasks / tasks.length) * 100);

  await prisma.project.update({
    where: { id: projectId },
    data: { progress }
  });
}

export default router;
