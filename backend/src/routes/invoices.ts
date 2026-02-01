import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, paginatedResponse, generateReference, calculateVAT } from '../utils/helpers';

const router = Router();

router.use(authenticate);

// Lister les factures
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, status, contactId, companyId, startDate, endDate } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { reference: { contains: search as string } },
        { contact: { firstName: { contains: search as string } } },
        { contact: { lastName: { contains: search as string } } },
        { company: { name: { contains: search as string } } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (contactId) {
      where.contactId = contactId;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (startDate) {
      where.issueDate = { ...where.issueDate, gte: new Date(startDate as string) };
    }

    if (endDate) {
      where.issueDate = { ...where.issueDate, lte: new Date(endDate as string) };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true }
          },
          company: {
            select: { id: true, name: true }
          }
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.invoice.count({ where })
    ]);

    res.json(paginatedResponse(invoices, total, page, limit));
  } catch (error) {
    console.error('Erreur liste factures:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des factures' });
  }
});

// Statistiques des factures
router.get('/stats', async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const [
      totalInvoiced,
      totalPaid,
      totalPending,
      totalOverdue,
      byMonth
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          issueDate: { gte: startOfYear, lte: endOfYear },
          status: { not: 'CANCELLED' }
        },
        _sum: { totalTTC: true }
      }),
      prisma.invoice.aggregate({
        where: {
          issueDate: { gte: startOfYear, lte: endOfYear },
          status: 'PAID'
        },
        _sum: { totalTTC: true }
      }),
      prisma.invoice.aggregate({
        where: {
          issueDate: { gte: startOfYear, lte: endOfYear },
          status: { in: ['SENT', 'PARTIAL'] }
        },
        _sum: { totalTTC: true }
      }),
      prisma.invoice.aggregate({
        where: {
          issueDate: { gte: startOfYear, lte: endOfYear },
          status: 'OVERDUE'
        },
        _sum: { totalTTC: true }
      }),
      // CA par mois
      prisma.invoice.groupBy({
        by: ['issueDate'],
        where: {
          issueDate: { gte: startOfYear, lte: endOfYear },
          status: 'PAID'
        },
        _sum: { totalTTC: true }
      })
    ]);

    // Regrouper par mois
    const monthlyRevenue = Array(12).fill(0);
    byMonth.forEach(item => {
      const month = new Date(item.issueDate).getMonth();
      monthlyRevenue[month] += item._sum.totalTTC || 0;
    });

    res.json({
      year: currentYear,
      totalInvoiced: totalInvoiced._sum.totalTTC || 0,
      totalPaid: totalPaid._sum.totalTTC || 0,
      totalPending: totalPending._sum.totalTTC || 0,
      totalOverdue: totalOverdue._sum.totalTTC || 0,
      monthlyRevenue
    });
  } catch (error) {
    console.error('Erreur stats factures:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// Obtenir une facture par ID
router.get('/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        contact: true,
        company: true,
        quote: { select: { id: true, reference: true } },
        items: { orderBy: { position: 'asc' } }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Erreur récupération facture:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la facture' });
  }
});

// Créer une facture
router.post('/', async (req, res) => {
  try {
    const {
      contactId,
      companyId,
      dueDate,
      items,
      notes,
      paymentTerms
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Au moins une ligne est requise' });
    }

    // Calculer les totaux
    let totalHT = 0;
    let totalVAT = 0;

    const processedItems = items.map((item: any, index: number) => {
      const itemTotalHT = item.quantity * item.unitPrice;
      const itemVAT = calculateVAT(itemTotalHT, item.vatRate || 20);
      totalHT += itemTotalHT;
      totalVAT += itemVAT;

      return {
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate || 20,
        totalHT: itemTotalHT,
        position: index
      };
    });

    const totalTTC = totalHT + totalVAT;
    const reference = generateReference('FAC');

    // Date d'échéance (30 jours par défaut)
    const dueDateValue = dueDate
      ? new Date(dueDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await prisma.invoice.create({
      data: {
        reference,
        contactId,
        companyId,
        dueDate: dueDateValue,
        totalHT,
        totalVAT,
        totalTTC,
        notes,
        paymentTerms,
        items: {
          create: processedItems
        }
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        items: { orderBy: { position: 'asc' } }
      }
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Erreur création facture:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la facture' });
  }
});

// Mettre à jour une facture
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contactId,
      companyId,
      dueDate,
      items,
      notes,
      paymentTerms,
      status
    } = req.body;

    const existingInvoice = await prisma.invoice.findUnique({ where: { id } });
    if (!existingInvoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Ne pas permettre la modification d'une facture payée
    if (existingInvoice.status === 'PAID' && status !== 'PAID') {
      return res.status(400).json({ error: 'Impossible de modifier une facture payée' });
    }

    let updateData: any = {
      contactId,
      companyId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
      paymentTerms,
      status
    };

    if (items && items.length > 0 && existingInvoice.status === 'DRAFT') {
      // Supprimer les anciens items
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

      let totalHT = 0;
      let totalVAT = 0;

      const processedItems = items.map((item: any, index: number) => {
        const itemTotalHT = item.quantity * item.unitPrice;
        const itemVAT = calculateVAT(itemTotalHT, item.vatRate || 20);
        totalHT += itemTotalHT;
        totalVAT += itemVAT;

        return {
          invoiceId: id,
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate || 20,
          totalHT: itemTotalHT,
          position: index
        };
      });

      await prisma.invoiceItem.createMany({ data: processedItems });

      updateData.totalHT = totalHT;
      updateData.totalVAT = totalVAT;
      updateData.totalTTC = totalHT + totalVAT;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        items: { orderBy: { position: 'asc' } }
      }
    });

    res.json(invoice);
  } catch (error) {
    console.error('Erreur mise à jour facture:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la facture' });
  }
});

// Marquer comme envoyée
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: 'SENT' }
    });

    res.json(invoice);
  } catch (error) {
    console.error('Erreur envoi facture:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de la facture' });
  }
});

// Enregistrer un paiement
router.post('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const newPaidAmount = invoice.paidAmount + (amount || invoice.totalTTC - invoice.paidAmount);
    const isPaid = newPaidAmount >= invoice.totalTTC;

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status: isPaid ? 'PAID' : 'PARTIAL',
        paidDate: isPaid ? new Date() : undefined
      }
    });

    res.json(updatedInvoice);
  } catch (error) {
    console.error('Erreur paiement facture:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement du paiement' });
  }
});

// Marquer en retard
router.post('/:id/mark-overdue', async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: 'OVERDUE' }
    });

    res.json(invoice);
  } catch (error) {
    console.error('Erreur marquage retard:', error);
    res.status(500).json({ error: 'Erreur lors du marquage en retard' });
  }
});

// Annuler une facture
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ error: 'Impossible d\'annuler une facture payée' });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json(updatedInvoice);
  } catch (error) {
    console.error('Erreur annulation facture:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la facture' });
  }
});

// Supprimer une facture
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingInvoice = await prisma.invoice.findUnique({ where: { id } });
    if (!existingInvoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    if (existingInvoice.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Seules les factures en brouillon peuvent être supprimées'
      });
    }

    await prisma.invoice.delete({ where: { id } });

    res.json({ message: 'Facture supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression facture:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la facture' });
  }
});

export default router;
