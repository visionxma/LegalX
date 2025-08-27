import React from 'react';
import { CalendarEvent, Document } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecentItemsProps {
  title: string;
  items: (CalendarEvent | Document)[];
  type: 'events' | 'documents';
}

export default function RecentItems({ title, items, type }: RecentItemsProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum item encontrado</p>
        ) : (
          items.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex-1">
                {type === 'events' ? (
                  <>
                    <p className="font-medium text-gray-900">{(item as CalendarEvent).title}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate((item as CalendarEvent).date)} às {formatTime((item as CalendarEvent).time)}
                    </p>
                    {(item as CalendarEvent).client && (
                      <p className="text-xs text-gray-400">Cliente: {(item as CalendarEvent).client}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-900">{(item as Document).type}</p>
                    <p className="text-sm text-gray-500">
                      Cliente: {(item as Document).client}
                    </p>
                    <p className="text-xs text-gray-400">
                      Criado em {formatDate((item as Document).createdAt)}
                    </p>
                  </>
                )}
              </div>
              {type === 'events' && (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    (item as CalendarEvent).status === 'Concluído'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {(item as CalendarEvent).status}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}