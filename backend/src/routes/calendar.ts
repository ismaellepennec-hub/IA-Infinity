import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Obtenir les événements du calendrier
router.get('/events', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Dates requises' });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Récupérer les événements, les deadlines de projets, les jalons et les disponibilités
    const [events, projectDeadlines, milestones, taskDeadlines, availabilities] = await Promise.all([
      // Événements manuels
      prisma.event.findMany({
        where: {
          startDate: { gte: start },
          endDate: { lte: end }
        }
      }),

      // Deadlines des projets
      prisma.project.findMany({
        where: {
          deadline: { gte: start, lte: end },
          status: { not: 'COMPLETED' }
        },
        select: { id: true, name: true, reference: true, deadline: true, client: { select: { name: true } } }
      }),

      // Jalons
      prisma.milestone.findMany({
        where: {
          dueDate: { gte: start, lte: end },
          status: { not: 'COMPLETED' }
        },
        include: {
          project: { select: { id: true, name: true } }
        }
      }),

      // Échéances des tâches
      prisma.task.findMany({
        where: {
          dueDate: { gte: start, lte: end },
          status: { not: 'COMPLETED' }
        },
        include: {
          project: { select: { id: true, name: true } }
        }
      }),

      // Disponibilités des sous-traitants
      prisma.availability.findMany({
        where: {
          startDate: { lte: end },
          endDate: { gte: start }
        },
        include: {
          contractor: { select: { id: true, firstName: true, lastName: true } }
        }
      })
    ]);

    // Formater tous les événements
    const calendarEvents = [
      // Événements manuels
      ...events.map(e => ({
        id: e.id,
        title: e.title,
        start: e.startDate,
        end: e.endDate,
        type: e.type,
        color: e.color || getEventColor(e.type),
        allDay: e.allDay,
        description: e.description
      })),

      // Deadlines projets
      ...projectDeadlines.map(p => ({
        id: `project-${p.id}`,
        title: `📅 Deadline: ${p.name}`,
        start: p.deadline,
        end: p.deadline,
        type: 'DEADLINE',
        color: '#EF4444',
        allDay: true,
        projectId: p.id,
        clientName: p.client.name
      })),

      // Jalons
      ...milestones.map(m => ({
        id: `milestone-${m.id}`,
        title: `🎯 ${m.name}`,
        start: m.dueDate,
        end: m.dueDate,
        type: 'MILESTONE',
        color: '#8B5CF6',
        allDay: true,
        projectId: m.project.id,
        projectName: m.project.name
      })),

      // Tâches
      ...taskDeadlines.map(t => ({
        id: `task-${t.id}`,
        title: `✓ ${t.title}`,
        start: t.dueDate,
        end: t.dueDate,
        type: 'TASK',
        color: getPriorityColor(t.priority),
        allDay: true,
        projectId: t.project.id,
        projectName: t.project.name
      })),

      // Disponibilités
      ...availabilities.map(a => ({
        id: `availability-${a.id}`,
        title: `${getAvailabilityIcon(a.type)} ${a.contractor.firstName} ${a.contractor.lastName}`,
        start: a.startDate,
        end: a.endDate,
        type: 'AVAILABILITY',
        color: getAvailabilityColor(a.type),
        allDay: true,
        contractorId: a.contractor.id
      }))
    ];

    res.json(calendarEvents);
  } catch (error) {
    console.error('Erreur calendrier:', error);
    res.status(500).json({ error: 'Erreur' });
  }
});

// Créer un événement
router.post('/events', async (req, res) => {
  try {
    const { title, description, startDate, endDate, allDay, type, color, projectRef } = req.body;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        allDay: allDay || false,
        type: type || 'OTHER',
        color,
        projectRef
      }
    });

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Mettre à jour un événement
router.put('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, startDate, endDate, allDay, type, color } = req.body;

    const event = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        allDay,
        type,
        color
      }
    });

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Supprimer un événement
router.delete('/events/:id', async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ message: 'Événement supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Helpers
function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    MEETING: '#3B82F6',
    DEADLINE: '#EF4444',
    MILESTONE: '#8B5CF6',
    REMINDER: '#F59E0B',
    OTHER: '#6B7280'
  };
  return colors[type] || colors.OTHER;
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    URGENT: '#DC2626',
    HIGH: '#F97316',
    MEDIUM: '#3B82F6',
    LOW: '#6B7280'
  };
  return colors[priority] || colors.MEDIUM;
}

function getAvailabilityColor(type: string): string {
  const colors: Record<string, string> = {
    AVAILABLE: '#10B981',
    UNAVAILABLE: '#EF4444',
    PARTIAL: '#F59E0B',
    HOLIDAY: '#8B5CF6'
  };
  return colors[type] || '#6B7280';
}

function getAvailabilityIcon(type: string): string {
  const icons: Record<string, string> = {
    AVAILABLE: '✅',
    UNAVAILABLE: '❌',
    PARTIAL: '⚠️',
    HOLIDAY: '🏖️'
  };
  return icons[type] || '';
}

export default router;
