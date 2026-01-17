'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

export interface SyncHistoryProps {
  connectionId: string;
}

interface SyncLog {
  id: string;
  status: string;
  trades_imported: number;
  trades_skipped: number;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export function SyncHistory({ connectionId }: SyncHistoryProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from('sync_logs')
        .select('*')
        .eq('mt5_connection_id', connectionId)
        .order('started_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [connectionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No sync history yet. Click "Sync Now" to import trades.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-white mb-3">Recent Syncs</h4>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Status Icon */}
              {log.status === 'success' && (
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              )}
              {log.status === 'error' && (
                <XCircle className="h-4 w-4 text-red-400 shrink-0" />
              )}
              {log.status === 'running' && (
                <Loader2 className="h-4 w-4 text-blue-400 animate-spin shrink-0" />
              )}

              {/* Info */}
              <div className="flex flex-col">
                <span className="text-sm text-white">
                  {log.trades_imported} trade{log.trades_imported !== 1 ? 's' : ''} imported
                  {log.trades_skipped > 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({log.trades_skipped} skipped)
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.started_at).toLocaleString()}
                </span>
                {log.error_message && (
                  <span className="text-xs text-red-400 mt-1">
                    {log.error_message}
                  </span>
                )}
              </div>
            </div>

            {/* Duration */}
            {log.duration_ms && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{(log.duration_ms / 1000).toFixed(1)}s</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
