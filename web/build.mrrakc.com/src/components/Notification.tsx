import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface ToastProps {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 w-full max-w-md px-4 pointer-events-none">
      {notifications.map((n) => (
        <ToastItem 
          key={n.id} 
          notification={n} 
          onClose={() => removeNotification(n.id)} 
        />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ notification: Notification; onClose: () => void }> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));
    
    // Auto remove after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400',
    info: 'bg-sand border-clay text-charcoal dark:bg-stone-900 dark:border-stone-800 dark:text-stone-300',
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 pointer-events-auto",
        styles[notification.type],
        isVisible ? "translate-y-0 opacity-100 scale-100" : "-translate-y-4 opacity-0 scale-95"
      )}
    >
      <div className="shrink-0">{icons[notification.type]}</div>
      <p className="flex-1 text-sm font-bold leading-tight">{notification.message}</p>
      <button 
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};
