import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // Créer un utilisateur admin
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ia-infinity.com' },
    update: {},
    create: {
      email: 'admin@ia-infinity.com',
      password: hashedPassword,
      firstName: 'Ismaël',
      lastName: 'Le Pennec',
      role: 'ADMIN'
    }
  });
  console.log('✅ Utilisateur admin créé');

  // Créer des clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'TechStartup SAS',
        email: 'contact@techstartup.fr',
        phone: '01 23 45 67 89',
        website: 'https://techstartup.fr',
        address: '15 rue de l\'Innovation',
        city: 'Paris',
        postalCode: '75002',
        status: 'ACTIVE',
        notes: 'Client principal - Projet de refonte site web',
        contacts: {
          create: [
            { firstName: 'Marie', lastName: 'Dubois', email: 'marie@techstartup.fr', phone: '06 12 34 56 78', jobTitle: 'CEO', isPrimary: true },
            { firstName: 'Thomas', lastName: 'Martin', email: 'thomas@techstartup.fr', jobTitle: 'CTO' }
          ]
        }
      }
    }),
    prisma.client.create({
      data: {
        name: 'Cabinet Conseil Plus',
        email: 'info@conseilplus.fr',
        phone: '04 56 78 90 12',
        address: '42 avenue des Champs-Élysées',
        city: 'Paris',
        postalCode: '75008',
        status: 'ACTIVE',
        contacts: {
          create: [
            { firstName: 'Sophie', lastName: 'Bernard', email: 'sophie@conseilplus.fr', phone: '06 98 76 54 32', jobTitle: 'Directrice', isPrimary: true }
          ]
        }
      }
    }),
    prisma.client.create({
      data: {
        name: 'E-commerce Pro',
        email: 'contact@ecommercepro.fr',
        phone: '05 67 89 01 23',
        website: 'https://ecommercepro.fr',
        city: 'Bordeaux',
        postalCode: '33000',
        status: 'PROSPECT',
        notes: 'Prospect intéressé par développement d\'une marketplace'
      }
    }),
    prisma.client.create({
      data: {
        name: 'Digital Factory',
        email: 'hello@digitalfactory.io',
        phone: '03 45 67 89 01',
        website: 'https://digitalfactory.io',
        city: 'Lyon',
        postalCode: '69001',
        status: 'ACTIVE'
      }
    })
  ]);
  console.log('✅ Clients créés');

  // Créer des sous-traitants
  const contractors = await Promise.all([
    prisma.contractor.create({
      data: {
        firstName: 'Lucas',
        lastName: 'Moreau',
        email: 'lucas.moreau@dev.fr',
        phone: '06 11 22 33 44',
        specialty: 'Développeur Frontend',
        skills: 'React, Vue.js, TypeScript, Tailwind CSS',
        hourlyRate: 65,
        dailyRate: 500,
        status: 'ACTIVE',
        city: 'Paris'
      }
    }),
    prisma.contractor.create({
      data: {
        firstName: 'Emma',
        lastName: 'Petit',
        email: 'emma.petit@design.fr',
        phone: '06 22 33 44 55',
        specialty: 'Designer UI/UX',
        skills: 'Figma, Adobe XD, Illustrator, Design System',
        hourlyRate: 70,
        dailyRate: 550,
        status: 'ACTIVE',
        city: 'Lyon'
      }
    }),
    prisma.contractor.create({
      data: {
        firstName: 'Hugo',
        lastName: 'Leroy',
        email: 'hugo.leroy@backend.fr',
        phone: '06 33 44 55 66',
        specialty: 'Développeur Backend',
        skills: 'Node.js, Python, PostgreSQL, AWS',
        hourlyRate: 75,
        dailyRate: 580,
        status: 'ACTIVE',
        city: 'Nantes'
      }
    }),
    prisma.contractor.create({
      data: {
        firstName: 'Camille',
        lastName: 'Girard',
        email: 'camille.girard@mobile.fr',
        phone: '06 44 55 66 77',
        specialty: 'Développeur Mobile',
        skills: 'React Native, Flutter, iOS, Android',
        hourlyRate: 70,
        dailyRate: 540,
        status: 'ACTIVE',
        city: 'Bordeaux'
      }
    }),
    prisma.contractor.create({
      data: {
        firstName: 'Antoine',
        lastName: 'Roux',
        email: 'antoine.roux@devops.fr',
        phone: '06 55 66 77 88',
        specialty: 'DevOps',
        skills: 'Docker, Kubernetes, CI/CD, AWS, GCP',
        hourlyRate: 80,
        dailyRate: 620,
        status: 'INACTIVE',
        notes: 'En congé jusqu\'à fin février'
      }
    })
  ]);
  console.log('✅ Sous-traitants créés');

  // Créer des disponibilités
  const now = new Date();
  await Promise.all([
    // Lucas disponible les 2 prochaines semaines
    prisma.availability.create({
      data: {
        contractorId: contractors[0].id,
        startDate: now,
        endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        type: 'AVAILABLE',
        notes: 'Disponible pour nouveaux projets'
      }
    }),
    // Emma partiellement disponible
    prisma.availability.create({
      data: {
        contractorId: contractors[1].id,
        startDate: now,
        endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        type: 'PARTIAL',
        notes: 'Disponible 3 jours/semaine'
      }
    }),
    // Hugo en congés la semaine prochaine
    prisma.availability.create({
      data: {
        contractorId: contractors[2].id,
        startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        type: 'HOLIDAY',
        notes: 'Vacances'
      }
    }),
    // Camille disponible
    prisma.availability.create({
      data: {
        contractorId: contractors[3].id,
        startDate: now,
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        type: 'AVAILABLE'
      }
    })
  ]);
  console.log('✅ Disponibilités créées');

  // Créer des projets
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        reference: 'PRJ-2025-001',
        name: 'Refonte Site Web TechStartup',
        description: 'Refonte complète du site vitrine avec intégration d\'un blog et d\'un espace client',
        clientId: clients[0].id,
        managerId: admin.id,
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        budget: 25000,
        estimatedHours: 200,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        progress: 45
      }
    }),
    prisma.project.create({
      data: {
        reference: 'PRJ-2025-002',
        name: 'Application Mobile Conseil Plus',
        description: 'Développement d\'une application mobile iOS/Android pour les clients du cabinet',
        clientId: clients[1].id,
        managerId: admin.id,
        startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        budget: 45000,
        estimatedHours: 400,
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        progress: 20
      }
    }),
    prisma.project.create({
      data: {
        reference: 'PRJ-2025-003',
        name: 'Marketplace E-commerce',
        description: 'Étude et conception d\'une marketplace B2B',
        clientId: clients[2].id,
        startDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        budget: 75000,
        status: 'PENDING',
        priority: 'MEDIUM',
        progress: 0
      }
    }),
    prisma.project.create({
      data: {
        reference: 'PRJ-2025-004',
        name: 'Infrastructure Cloud Digital Factory',
        description: 'Migration et optimisation de l\'infrastructure cloud',
        clientId: clients[3].id,
        managerId: admin.id,
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        budget: 15000,
        estimatedHours: 100,
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        progress: 65
      }
    })
  ]);
  console.log('✅ Projets créés');

  // Créer des jalons (Roadmap)
  await Promise.all([
    // Jalons projet 1
    prisma.milestone.create({
      data: {
        projectId: projects[0].id,
        name: 'Design & Maquettes',
        description: 'Validation des maquettes et du design system',
        dueDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
        position: 1
      }
    }),
    prisma.milestone.create({
      data: {
        projectId: projects[0].id,
        name: 'Développement Frontend',
        description: 'Intégration des pages et composants',
        dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        status: 'IN_PROGRESS',
        position: 2
      }
    }),
    prisma.milestone.create({
      data: {
        projectId: projects[0].id,
        name: 'Développement Backend',
        description: 'API et back-office',
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        position: 3
      }
    }),
    prisma.milestone.create({
      data: {
        projectId: projects[0].id,
        name: 'Mise en production',
        description: 'Déploiement et mise en ligne',
        dueDate: new Date(now.getTime() + 55 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        position: 4
      }
    }),
    // Jalons projet 2
    prisma.milestone.create({
      data: {
        projectId: projects[1].id,
        name: 'Spécifications techniques',
        description: 'Définition des fonctionnalités et architecture',
        dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
        position: 1
      }
    }),
    prisma.milestone.create({
      data: {
        projectId: projects[1].id,
        name: 'MVP iOS',
        description: 'Première version iOS',
        dueDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        status: 'IN_PROGRESS',
        position: 2
      }
    }),
    prisma.milestone.create({
      data: {
        projectId: projects[1].id,
        name: 'MVP Android',
        description: 'Première version Android',
        dueDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        position: 3
      }
    })
  ]);
  console.log('✅ Jalons créés');

  // Assigner des sous-traitants aux projets
  await Promise.all([
    // Projet 1 : Lucas (Frontend) et Emma (Design)
    prisma.projectAssignment.create({
      data: {
        projectId: projects[0].id,
        contractorId: contractors[0].id,
        role: 'Développeur Frontend Lead',
        hourlyRate: 65,
        hoursAllocated: 120
      }
    }),
    prisma.projectAssignment.create({
      data: {
        projectId: projects[0].id,
        contractorId: contractors[1].id,
        role: 'Designer UI/UX',
        hourlyRate: 70,
        hoursAllocated: 40
      }
    }),
    // Projet 2 : Camille (Mobile) et Hugo (Backend)
    prisma.projectAssignment.create({
      data: {
        projectId: projects[1].id,
        contractorId: contractors[3].id,
        role: 'Développeur Mobile Lead',
        hourlyRate: 70,
        hoursAllocated: 200
      }
    }),
    prisma.projectAssignment.create({
      data: {
        projectId: projects[1].id,
        contractorId: contractors[2].id,
        role: 'Développeur Backend',
        hourlyRate: 75,
        hoursAllocated: 150
      }
    }),
    // Projet 4 : Hugo (Backend/DevOps)
    prisma.projectAssignment.create({
      data: {
        projectId: projects[3].id,
        contractorId: contractors[2].id,
        role: 'Architecte Cloud',
        hourlyRate: 80,
        hoursAllocated: 80
      }
    })
  ]);
  console.log('✅ Affectations créées');

  // Créer des tâches
  await Promise.all([
    // Tâches projet 1
    prisma.task.create({
      data: {
        projectId: projects[0].id,
        title: 'Intégration page d\'accueil',
        description: 'Intégrer la maquette de la page d\'accueil',
        contractorId: contractors[0].id,
        status: 'COMPLETED',
        priority: 'HIGH',
        estimatedHours: 16,
        actualHours: 14,
        dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000)
      }
    }),
    prisma.task.create({
      data: {
        projectId: projects[0].id,
        title: 'Intégration pages services',
        description: 'Intégrer les pages de présentation des services',
        contractorId: contractors[0].id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        estimatedHours: 24,
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
      }
    }),
    prisma.task.create({
      data: {
        projectId: projects[0].id,
        title: 'Composants formulaires',
        description: 'Créer les composants réutilisables pour les formulaires',
        contractorId: contractors[0].id,
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedHours: 8,
        dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)
      }
    }),
    prisma.task.create({
      data: {
        projectId: projects[0].id,
        title: 'Révision Design System',
        description: 'Mise à jour du design system avec les retours client',
        contractorId: contractors[1].id,
        status: 'REVIEW',
        priority: 'MEDIUM',
        estimatedHours: 6,
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
      }
    }),
    // Tâches projet 2
    prisma.task.create({
      data: {
        projectId: projects[1].id,
        title: 'Setup projet React Native',
        description: 'Initialisation du projet et configuration',
        contractorId: contractors[3].id,
        status: 'COMPLETED',
        priority: 'HIGH',
        estimatedHours: 8,
        actualHours: 6,
        completedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
      }
    }),
    prisma.task.create({
      data: {
        projectId: projects[1].id,
        title: 'Écran de connexion',
        description: 'Développer l\'écran de connexion avec authentification',
        contractorId: contractors[3].id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        estimatedHours: 16,
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      }
    }),
    prisma.task.create({
      data: {
        projectId: projects[1].id,
        title: 'API authentification',
        description: 'Développer les endpoints d\'authentification',
        contractorId: contractors[2].id,
        status: 'TODO',
        priority: 'URGENT',
        estimatedHours: 12,
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
      }
    }),
    // Tâches projet 4
    prisma.task.create({
      data: {
        projectId: projects[3].id,
        title: 'Audit infrastructure actuelle',
        description: 'Analyser l\'infrastructure existante',
        contractorId: contractors[2].id,
        status: 'COMPLETED',
        priority: 'HIGH',
        estimatedHours: 8,
        actualHours: 10,
        completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      }
    }),
    prisma.task.create({
      data: {
        projectId: projects[3].id,
        title: 'Configuration Kubernetes',
        description: 'Mise en place du cluster Kubernetes',
        contractorId: contractors[2].id,
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        estimatedHours: 24,
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    }),
    prisma.task.create({
      data: {
        projectId: projects[3].id,
        title: 'Pipeline CI/CD',
        description: 'Configurer les pipelines de déploiement',
        status: 'TODO',
        priority: 'HIGH',
        estimatedHours: 16,
        dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      }
    })
  ]);
  console.log('✅ Tâches créées');

  // Créer des événements
  await Promise.all([
    prisma.event.create({
      data: {
        title: 'Réunion client TechStartup',
        description: 'Point d\'avancement sur la refonte du site',
        startDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        type: 'MEETING',
        projectRef: projects[0].id
      }
    }),
    prisma.event.create({
      data: {
        title: 'Deadline maquettes Mobile',
        description: 'Livraison des maquettes finales',
        startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        type: 'DEADLINE',
        projectRef: projects[1].id
      }
    }),
    prisma.event.create({
      data: {
        title: 'Review sprint',
        description: 'Revue de sprint avec l\'équipe',
        startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        type: 'MEETING',
        projectRef: projects[0].id
      }
    })
  ]);
  console.log('✅ Événements créés');

  console.log('🎉 Seeding terminé avec succès !');
  console.log('\n📝 Identifiants de connexion :');
  console.log('   Email: admin@ia-infinity.com');
  console.log('   Mot de passe: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
