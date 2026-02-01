import { Fragment, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  FolderIcon,
  UsersIcon,
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: HomeIcon },
  { name: 'Projets', href: '/projects', icon: FolderIcon },
  { name: 'Clients', href: '/clients', icon: UsersIcon },
  { name: 'Sous-traitants', href: '/contractors', icon: UserGroupIcon },
  { name: 'Tâches', href: '/tasks', icon: ClipboardDocumentListIcon },
  { name: 'Calendrier', href: '/calendar', icon: CalendarIcon },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child as={Fragment} enter="transition-opacity ease-linear duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="transition-opacity ease-linear duration-300" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 flex">
            <Transition.Child as={Fragment} enter="transition ease-in-out duration-300 transform" enterFrom="-translate-x-full" enterTo="translate-x-0" leave="transition ease-in-out duration-300 transform" leaveFrom="translate-x-0" leaveTo="-translate-x-full">
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button onClick={() => setSidebarOpen(false)} className="text-gray-400"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-dark-800 px-6 pb-4 border-r border-dark-700">
                  <div className="flex h-16 shrink-0 items-center gap-2">
                    <SparklesIcon className="h-8 w-8 text-primary-500" />
                    <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">IA Infinity</span>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul className="flex flex-1 flex-col gap-y-2">
                      {navigation.map((item) => (
                        <li key={item.name}>
                          <Link to={item.href} onClick={() => setSidebarOpen(false)} className={location.pathname === item.href ? 'sidebar-link-active' : 'sidebar-link-inactive'}>
                            <item.icon className="h-5 w-5" />{item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-dark-800/50 backdrop-blur-xl px-6 pb-4 border-r border-dark-700/50">
          <div className="flex h-16 shrink-0 items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">IA Infinity</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-1">
              <li><p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Menu</p></li>
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link to={item.href} className={location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href)) ? 'sidebar-link-active' : 'sidebar-link-inactive'}>
                    <item.icon className="h-5 w-5" />{item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-4 border-t border-dark-700/50">
              <div className="flex items-center gap-x-3 p-3 rounded-lg bg-dark-700/30">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button onClick={logout} className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-600 rounded-lg transition-colors" title="Déconnexion">
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </nav>
        </div>
      </div>

      <div className="lg:pl-72">
        {/* Top bar mobile */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 bg-dark-800/80 backdrop-blur-xl px-4 border-b border-dark-700/50 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-gray-200"><Bars3Icon className="h-6 w-6" /></button>
          <div className="flex-1 flex items-center justify-center gap-2">
            <SparklesIcon className="h-6 w-6 text-primary-500" />
            <span className="text-lg font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">IA Infinity</span>
          </div>
        </div>
        {/* Main content */}
        <main className="py-8"><div className="px-4 sm:px-6 lg:px-8">{children}</div></main>
      </div>
    </div>
  );
}
