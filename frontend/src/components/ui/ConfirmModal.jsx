import React from 'react';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDestructive = true }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-md animate-slide-up shadow-2xl relative border-0">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                    <X className="w-4 h-4" />
                </button>
                <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-6">
                    <div className={`p-2 rounded-full ${isDestructive ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-xl text-slate-900 dark:text-white">{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        {message}
                    </p>
                    <div className="flex gap-3 justify-end mt-2">
                        <Button variant="ghost" onClick={onCancel}>
                            {cancelText}
                        </Button>
                        <Button variant={isDestructive ? "danger" : "primary"} onClick={onConfirm}>
                            {confirmText}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export { ConfirmModal };
