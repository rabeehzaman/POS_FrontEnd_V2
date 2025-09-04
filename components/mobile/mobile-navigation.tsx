'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  ShoppingCart, 
  Users, 
  History, 
  Settings,
  Search
} from 'lucide-react';
import { useMobileViewport } from '@/hooks/use-mobile-viewport';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

interface NavigationTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  action?: () => void;
}

interface MobileNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  cartItemCount?: number;
  className?: string;
}

const navigationTabs: NavigationTab[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    path: '/'
  },
  {
    id: 'cart',
    label: 'Cart',
    icon: ShoppingCart
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    path: '/customers'
  },
  {
    id: 'history',
    label: 'History',
    icon: History,
    path: '/history'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings'
  }
];

export function MobileNavigation({ 
  activeTab, 
  onTabChange, 
  cartItemCount = 0,
  className 
}: MobileNavigationProps) {
  const { isMobile, isMobileViewport } = useMobileViewport();
  const { triggerHaptic } = useHapticFeedback();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide navigation on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    if (isMobile) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [lastScrollY, isMobile]);

  // Don't render on desktop
  if (!isMobile && !isMobileViewport) {
    return null;
  }

  const handleTabPress = (tab: NavigationTab) => {
    triggerHaptic('selection');
    
    if (tab.action) {
      tab.action();
    }
    
    onTabChange(tab.id);
  };

  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : 100 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white/95 backdrop-blur-lg border-t border-gray-200',
        'safe-area-bottom',
        className
      )}
    >
      {/* Main Navigation */}
      <div className="flex items-center justify-around px-4 py-2">
        {navigationTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const showBadge = tab.id === 'cart' && cartItemCount > 0;

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabPress(tab)}
              className={cn(
                'flex flex-col items-center justify-center',
                'min-h-[48px] px-2 py-1 rounded-lg',
                'transition-colors duration-200',
                'touch-manipulation',
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              )}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="relative">
                <Icon 
                  className={cn(
                    'w-5 h-5 mb-1',
                    isActive ? 'text-blue-600' : 'text-gray-600'
                  )} 
                />
                
                {/* Cart Badge */}
                {showBadge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      'absolute -top-1 -right-1',
                      'bg-red-500 text-white',
                      'text-xs font-bold',
                      'w-5 h-5 rounded-full',
                      'flex items-center justify-center',
                      'min-w-[20px]'
                    )}
                  >
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </motion.div>
                )}
              </div>
              
              <span 
                className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-blue-600' : 'text-gray-600'
                )}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Search Quick Access */}
      <div className="px-4 pb-2">
        <motion.button
          onClick={() => {
            triggerHaptic('selection');
            onTabChange('search');
          }}
          className={cn(
            'w-full flex items-center justify-center',
            'h-10 bg-gray-100 rounded-lg',
            'text-gray-600 text-sm',
            'transition-colors duration-200',
            'touch-manipulation',
            'hover:bg-gray-200'
          )}
          whileTap={{ scale: 0.98 }}
        >
          <Search className="w-4 h-4 mr-2" />
          Search products...
        </motion.button>
      </div>
    </motion.div>
  );
}

export default MobileNavigation;