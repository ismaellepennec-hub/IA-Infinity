// Génération de références uniques
export function generateReference(prefix: string): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}-${random}`;
}

// Pagination helper
export function getPaginationParams(query: any) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

// Réponse paginée
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
}

// Formater un montant en euros
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

// Calculer TTC à partir de HT
export function calculateTTC(ht: number, vatRate: number = 20): number {
  return ht * (1 + vatRate / 100);
}

// Calculer HT à partir de TTC
export function calculateHT(ttc: number, vatRate: number = 20): number {
  return ttc / (1 + vatRate / 100);
}

// Calculer la TVA
export function calculateVAT(ht: number, vatRate: number = 20): number {
  return ht * (vatRate / 100);
}

// Parser les filtres de recherche
export function parseSearchFilters(query: any) {
  const filters: any = {};

  if (query.search) {
    filters.search = query.search.trim();
  }

  if (query.status) {
    filters.status = query.status;
  }

  if (query.startDate) {
    filters.startDate = new Date(query.startDate);
  }

  if (query.endDate) {
    filters.endDate = new Date(query.endDate);
  }

  if (query.sortBy) {
    filters.sortBy = query.sortBy;
  }

  if (query.sortOrder) {
    filters.sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  }

  return filters;
}

// Valider un email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Nettoyer les données d'entrée
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Formater une date en français
export function formatDateFR(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

// Formater une date avec heure
export function formatDateTimeFR(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
