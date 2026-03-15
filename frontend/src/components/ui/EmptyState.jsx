import React from 'react';
import { Card, CardContent } from './Card';
import { Button } from './Button';

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => {
    return (
        <Card className="w-full border-dashed border-2 shadow-none bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                {Icon && (
                    <div className="w-16 h-16 rounded-3xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center mb-6 text-blue-500">
                        <Icon className="w-8 h-8 opacity-80" />
                    </div>
                )}
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
                    {description}
                </p>
                {actionLabel && onAction && (
                    <Button onClick={onAction} size="lg" className="shadow-lg shadow-blue-500/20">
                        {actionLabel}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};

export { EmptyState };
