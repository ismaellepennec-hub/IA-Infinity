import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

// CRM Gestion de Projets - Types
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  siret?: string;
  notes?: string;
  status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  contacts?: ClientContact[];
  projects?: Project[];
  _count?: { projects: number; contacts: number };
  createdAt: string;
  updatedAt: string;
}

export interface ClientContact {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  isPrimary: boolean;
}

export interface Contractor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specialty: string;
  skills?: string;
  hourlyRate?: number;
  dailyRate?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  notes?: string;
  availabilities?: Availability[];
  assignments?: ProjectAssignment[];
  tasks?: Task[];
  _count?: { assignments: number; tasks: number };
  createdAt: string;
}

export interface Availability {
  id: string;
  contractorId: string;
  startDate: string;
  endDate: string;
  type: 'AVAILABLE' | 'BUSY' | 'VACATION' | 'SICK' | 'OTHER';
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  reference: string;
  description?: string;
  clientId: string;
  client?: Client;
  status: 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  budget?: number;
  progress: number;
  milestones?: Milestone[];
  tasks?: Task[];
  assignments?: ProjectAssignment[];
  _count?: { tasks: number; milestones: number; assignments: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  contractorId: string;
  project?: Project;
  contractor?: Contractor;
  role?: string;
  startDate?: string;
  endDate?: string;
  allocatedHours?: number;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  order: number;
}

export interface Task {
  id: string;
  projectId: string;
  project?: Project;
  contractorId?: string;
  contractor?: Contractor;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  contractorId: string;
  date: string;
  hours: number;
  description?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: 'MEETING' | 'DEADLINE' | 'MILESTONE' | 'OTHER';
  projectId?: string;
  project?: Project;
}

export interface DashboardData {
  projects: {
    total: number;
    active: number;
    byStatus: Record<string, number>;
  };
  clients: {
    total: number;
    active: number;
  };
  contractors: {
    total: number;
    active: number;
  };
  tasks: {
    total: number;
    pending: number;
    overdue: number;
  };
  recentProjects: Project[];
  urgentTasks: Task[];
}
