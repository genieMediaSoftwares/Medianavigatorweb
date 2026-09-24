import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  TrendingDown, 
  RotateCw, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Clock 
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { api } from '../services/api';
import { AlertItem } from '../types';

export const Alerts: React.FC = () => {
  const { setCurrentTab, connections } = useMedia();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getAlerts()
      .then((data) => {
        setAlerts(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [connections]);

  const handleDismiss = async (id: string) => {
    try {
      await api.dismissAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error('Failed to dismiss alert:', e);
    }
  };

  const handleAction = (_alert: AlertItem) => {
    setCurrentTab('content');
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'Engagement change':
        return <TrendingDown className="w-5 h-5 text-rose-600" />;
      case 'Performance spike':
        return <Zap className="w-5 h-5 text-amber-600" />;
      case 'New pattern':
        return <Clock className="w-5 h-5 text-[#0284C7]" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
    }
  };

  const hasConnectedPlatforms = connections.some((c) => c.connected);

  return (
    <div id="alerts-page" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[#0B132B] tracking-tight">
          Executive Alerts
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Flags that require executive attention, triggered strictly by unusual live velocity anomalies.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24 text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
          <RotateCw className="w-5 h-5 animate-spin text-[#0284C7] mr-2" />
          Checking for real performance anomalies...
        </div>
      ) : alerts.length === 0 ? (
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xs text-center space-y-3 max-w-xl mx-auto">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 w-fit mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-[#0B132B]">
              {hasConnectedPlatforms
                ? 'All media performance metrics are stable.'
                : 'Connect your account to monitor for alerts.'}
            </h2>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {hasConnectedPlatforms
                ? 'No sudden engagement anomalies, sudden drops, or out-of-band velocity changes were detected in your recent media.'
                : 'Media Navigator triggers alerts only when real anomalies occur in your actual data.'}
            </p>
            {!hasConnectedPlatforms && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentTab('connections')}
                  className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition-all shadow-2xs"
                >
                  Connect Platforms
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Alerts Stream */
        <div className="space-y-3">
          {alerts.map((item) => {
            return (
              <div
                key={item.id}
                id={`alert-${item.id}`}
                className="p-5 md:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#0284C7]/40 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <span className="p-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] shrink-0 mt-0.5 shadow-2xs">
                    {getAlertIcon(item.type)}
                  </span>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        {item.type}
                      </span>
                      <span className="text-[10px] text-[#94A3B8]">
                        {item.timestamp}
                      </span>
                      {item.severity === 'high' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                          High Priority
                        </span>
                      )}
                    </div>

                    <h2 className="text-sm font-bold text-[#0B132B]">
                      {item.title}
                    </h2>

                    <p className="text-xs text-[#64748B] leading-relaxed">
                      {item.description}
                    </p>

                    <div className="text-[11px] text-[#64748B] pt-1">
                      <span className="font-semibold text-[#0B132B]">Investigation notes: </span>
                      {item.investigationNotes}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleAction(item)}
                    className="py-2 px-3.5 rounded-xl text-xs font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <span>Investigate</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => handleDismiss(item.id)}
                    className="p-2 rounded-xl text-[#64748B] hover:text-[#0B132B] hover:bg-slate-100 transition-colors"
                    title="Dismiss alert"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
