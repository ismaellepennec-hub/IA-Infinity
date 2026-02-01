import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { getPaginationParams, paginatedResponse, generateReference, calculateVAT, calculateTTC } from '../utils/helpers';

const router = Router();

router.use(authenticate);

// Lister les devis
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, status, contactId, companyId } = req.query;

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

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true }
          },
          company: {
            select: { id: true, name: true }
          },
          items: { orderBy: { position: 'asc' } }
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.quote.count({ where })
    ]);

    res.json(paginatedResponse(quotes, total, page, limit));
  } catch (error) {
    console.error('Erreur liste devis:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des devis' });
  }
});

// Obtenir un devis par ID
router.get('/:id', async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: req.params.id },
      include: {
        contact: true,
        company: true,
        items: { orderBy: { position: 'asc' } },
        convertedToInvoice: {
          select: { id: true, reference: true, status: true }
        }
      }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    res.json(quote);
  } catch (error) {
    console.error('Erreur récupération devis:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du devis' });
  }
});

// Créer un devis
router.post('/', async (req, res) => {
  try {
    const {
      contactId,
      companyId,
      validUntil,
      items,
      notes,
      terms
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
    const reference = generateReference('DEV');

    // Définir la date de validité (30 jours par défaut)
    const validUntilDate = validUntil
      ? new Date(validUntil)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const quote = await prisma.quote.create({
      data: {
        reference,
        contactId,
        companyId,
        validUntil: validUntilDate,
        totalHT,
        totalVAT,
        totalTTC,
        notes,
        terms,
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

    res.status(201).json(quote);
  } catch (error) {
    console.error('Erreur création devis:', error);
    res.status(500).json({ error: 'Erreur lors de la création du devis' });
  }
});

// Mettre à jour un devis
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contactId,
      companyId,
      validUntil,
      items,
      notes,
      terms,
      status
    } = req.body;

    const existingQuote = await prisma.quote.findUnique({ where: { id } });
    if (!existingQuote) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    // Si des items sont fournis, recalculer les totaux
    let updateData: any = {
      contactId,
      companyId,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      notes,
      terms,
      status
    };

    if (items && items.length > 0) {
      // Supprimer les anciens items
      await prisma.quoteItem.deleteMany({ where: { quoteId: id } });

      let totalHT = 0;
      let totalVAT = 0;

      const processedItems = items.map((item: any, index: number) => {
        const itemTotalHT = item.quantity * item.unitPrice;
        const itemVAT = calculateVAT(itemTotalHT, item.vatRate || 20);
        totalHT += itemTotalHT;
        totalVAT += itemVAT;

        return {
          quoteId: id,
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate || 20,
          totalHT: itemTotalHT,
          position: index
        };
      });

      await prisma.quoteItem.createMany({ data: processedItems });

      updateData.totalHT = totalHT;
      updateData.totalVAT = totalVAT;
      updateData.totalTTC = totalHT + totalVAT;
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        items: { orderBy: { position: 'asc' } }
      }
    });

    res.json(quote);
  } catch (error) {
    console.error('Erreur mise à jour devis:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du devis' });
  }
});

// Marquer comme envoyé
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.update({
      where: { id },
      data: { status: 'SENT' }
    });

    res.json(quote);
  } catch (error) {
    console.error('Erreur envoi devis:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du devis' });
  }
});

// Accepter un devis
router.post('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.update({
      where: { id },
      data: { status: 'ACCEPTED' }
    });

    res.json(quote);
  } catch (error) {
    console.error('Erreur acceptation devis:', error);
    res.status(500).json({ error: 'Erreur lors de l\'acceptation du devis' });
  }
});

// Convertir en facture
router.post('/:id/convert-to-invoice', async (req, res) => {
  try {
    const { id } = req.params;
    const { dueDate } = req.body;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    if (quote.status !== 'ACCEPTED') {
      return res.status(400).json({ error: 'Le devis doit être accepté avant d\'être converti en facture' });
    }

    // Créer la facture
    const invoiceReference = generateReference('FAC');
    const dueDateValue = dueDate
      ? new Date(dueDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await prisma.invoice.create({
      data: {
        reference: invoiceReference,
        contactId: quote.contactId,
        companyId: quote.companyId,
        quoteId: quote.id,
        dueDate: dueDateValue,
        totalHT: quote.totalHT,
        totalVAT: quote.totalVAT,
        totalTTC: quote.totalTTC,
        notes: quote.notes,
        paymentTerms: quote.terms,
        items: {
          create: quote.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            totalHT: item.totalHT,
            position: item.position
          }))
        }
      },
      include: {
        items: true
      }
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Erreur conversion devis:', error);
    res.status(500).json({ error: 'Erreur lors de la conversion du devis en facture' });
  }
});

// Supprimer un devis
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingQuote = await prisma.quote.findUnique({
      where: { id },
      include: { convertedToInvoice: true }
    });

    if (!existingQuote) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    if (existingQuote.convertedToInvoice) {
      return res.status(400).json({
        error: 'Impossible de supprimer ce devis car il a été converti en facture'
      });
    }

    await prisma.quote.delete({ where: { id } });

    res.json({ message: 'Devis supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression devis:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du devis' });
  }
});

export default router;
