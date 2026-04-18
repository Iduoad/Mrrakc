import React from 'react';
import { X, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | React.ReactNode;
  type?: 'info' | 'success' | 'error' | 'confirm';
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  onConfirm,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
}) => {
  if (!isOpen) return null;

  const Icon = {
    info: HelpCircle,
    success: CheckCircle,
    error: AlertCircle,
    confirm: HelpCircle,
  }[type];

  const colors = {
    info: 'text-ocean bg-ocean/10',
    success: 'text-emerald-600 bg-emerald-50',
    error: 'text-red-600 bg-red-50',
    confirm: 'text-terra bg-terra/10',
  }[type];

  const buttonColors = {
    info: 'bg-ocean hover:bg-ocean-dark',
    success: 'bg-emerald-600 hover:bg-emerald-700',
    error: 'bg-red-600 hover:bg-red-700',
    confirm: 'bg-terra hover:bg-terra-dark',
  }[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-stone-900 w-full max-w-md rounded-2xl shadow-2xl border border-clay dark:border-stone-800 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-xl shrink-0", colors)}>
              <Icon size={24} />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-serif font-bold text-charcoal dark:text-stone-100">
                {title}
              </h3>
              <div className="text-sm text-charcoal-light dark:text-stone-400 whitespace-pre-wrap leading-relaxed">
                {message}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-clay/20 dark:hover:bg-stone-800 rounded-full transition-colors text-stone-400"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-sand/50 dark:bg-stone-950/50 flex justify-end gap-3 border-t border-clay/50 dark:border-stone-800/50">
          {type === 'confirm' && (
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-charcoal-light dark:text-stone-400 hover:bg-clay/20 dark:hover:bg-stone-800 rounded-xl transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          <button 
            onClick={() => {
              if (onConfirm) onConfirm();
              else onClose();
            }}
            className={cn(
              "px-6 py-2 text-sm font-bold text-white rounded-xl transition-all shadow-lg shadow-black/5",
              buttonColors
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
