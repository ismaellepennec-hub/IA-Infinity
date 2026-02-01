import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Tableau de bord principal
router.get('/', async (req, res) => {
  try {
    const now = new Date();

    const [
      totalProjects, activeProjects, projectsByStatus,
      totalClients, activeClients,
      totalContractors, activeContractors,
      totalTasks, pendingTasks, overdueTasks,
      recentProjects, urgentTasks
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.client.count(),
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.contractor.count(),
      prisma.contractor.count({ where: { status: 'ACTIVE' } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS'] } } }),
      prisma.task.count({ where: { status: { not: 'COMPLETED' }, dueDate: { lt: now } } }),
      prisma.project.findMany({
        where: { status: { in: ['IN_PROGRESS', 'PENDING'] } },
        include: { client: { select: { name: true } }, _count: { select: { tasks: true } } },
        orderBy: { updatedAt: 'desc' }, take: 5
      }),
      prisma.task.findMany({
        where: { status: { not: 'COMPLETED' }, priority: { in: ['HIGH', 'URGENT'] } },
        include: { project: { select: { id: true, name: true } }, contractor: { select: { firstName: true, lastName: true } } },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }], take: 10
      })
    ]);

    res.json({
      projects: { total: totalProjects, active: activeProjects, byStatus: projectsByStatus.reduce((a: any, i) => { a[i.status] = i._count.id; return a; }, {}) },
      clients: { total: totalClients, active: activeClients },
      contractors: { total: totalContractors, active: activeContractors },
      tasks: { total: totalTasks, pending: pendingTasks, overdue: overdueTasks },
      recentProjects, urgentTasks
    });
  } catch (error) {
    console.error('Erreur dashboard:', error);
    res.status(500).json({ error: 'Erreur' });
  }
});

// Stats projets par mois
router.get('/project-stats', async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

    const projects = await prisma.project.findMany({
      where: { createdAt: { gte: startOfYear, lte: endOfYear } },
      select: { createdAt: true, status: true }
    });

    const monthlyProjects = Array(12).fill(0);
    const monthlyCompleted = Array(12).fill(0);
    projects.forEach(p => {
      const month = new Date(p.createdAt).getMonth();
      monthlyProjects[month]++;
      if (p.status === 'COMPLETED') monthlyCompleted[month]++;
    });

    res.json({ year: targetYear, created: monthlyProjects, completed: monthlyCompleted, months: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'] });
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Charge de travail des sous-traitants
router.get('/contractor-workload', async (req, res) => {
  try {
    const contractors = await prisma.contractor.findMany({
      where: { status: 'ACTIVE' },
      include: {
        assignments: { where: { project: { status: 'IN_PROGRESS' } }, include: { project: { select: { name: true } } } },
        tasks: { where: { status: { not: 'COMPLETED' } } },
        availabilities: { where: { startDate: { lte: new Date() }, endDate: { gte: new Date() } } }
      }
    });

    res.json(contractors.map(c => ({
      id: c.id, name: `${c.firstName} ${c.lastName}`, specialty: c.specialty,
      activeProjects: c.assignments.length, pendingTasks: c.tasks.length,
      isAvailable: c.availabilities.some(a => a.type === 'AVAILABLE') || c.availabilities.length === 0
    })));
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Timeline des projets
router.get('/timeline', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: { in: ['IN_PROGRESS', 'PENDING', 'ON_HOLD'] } },
      include: { client: { select: { name: true } }, milestones: { orderBy: { dueDate: 'asc' } } },
      orderBy: { startDate: 'asc' }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
