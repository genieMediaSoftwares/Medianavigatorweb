import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Clock, 
  Sparkles,
  Instagram,
  Facebook,
  Youtube,
  Linkedin
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { api } from '../services/api';
import { PlannedContent, PlatformType } from '../types';

export const ContentPlanner: React.FC = () => {
  const { connections } = useMedia();
  const [plans, setPlans] = useState<PlannedContent[]>([]);
  const [, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDay, setNewDay] = useState<PlannedContent['day']>('Tuesday');
  const [newTime, setNewTime] = useState('7:00 PM');
  const [newType, setNewType] = useState('Reel');
  const [newPlatform, setNewPlatform] = useState<PlatformType>('instagram');

  useEffect(() => {
    setLoading(true);
    api.getPlanner()
      .then((data: PlannedContent[]) => {
        setPlans(data || []);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error(err);
        setLoading(false);
      });
  }, [connections]);

  const days: PlannedContent['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    try {
      const created = await api.addPlannerItem({
        title: newTitle,
        day: newDay,
        time: newTime,
        contentType: newType,
        platform: newPlatform,
        status: 'draft',
      });
      setPlans((prev) => [...prev, created]);
      setShowAddModal(false);
      setNewTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePlannerItem(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-3.5 h-3.5 text-pink-600" />;
      case 'facebook': return <Facebook className="w-3.5 h-3.5 text-blue-600" />;
      case 'youtube': return <Youtube className="w-3.5 h-3.5 text-red-600" />;
      case 'linkedin': return <Linkedin className="w-3.5 h-3.5 text-sky-700" />;
    }
  };

  return (
    <div id="planner-page" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0B132B] tracking-tight">
            Publishing Strategy &amp; Schedule
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Coordinate upcoming content aligned directly with your optimal posting windows.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="py-2 px-4 rounded-xl text-xs font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white transition-colors inline-flex items-center gap-1.5 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Content</span>
        </button>
      </div>

      {/* Highlighted AI Recommended Slot Banner */}
      <section className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xs flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0284C7] uppercase tracking-wider">
              Recommended Publishing Window
            </span>
            <span className="text-[11px] font-semibold text-[#0B132B]">
              Tuesday — 7:00 PM
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            <strong className="text-[#0B132B]">Educational Reel: </strong>
            Why: Matches your historical performance pattern with peak evening viewer retention and engagement rate.
          </p>
        </div>
      </section>

      {/* Minimal Calendar Grid (Monday - Sunday) */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((day) => {
          const dayPlans = plans.filter((p) => p.day === day);
          const isOptimalDay = day === 'Tuesday';

          return (
            <div
              key={day}
              className={`p-3 rounded-2xl bg-white border transition-colors min-h-[220px] flex flex-col justify-between shadow-2xs ${
                isOptimalDay
                  ? 'border-[#0284C7]/50 ring-1 ring-[#0284C7]/20'
                  : 'border-[#E2E8F0]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2E8F0]">
                  <span className={`text-xs font-bold ${isOptimalDay ? 'text-[#0284C7]' : 'text-[#0B132B]'}`}>
                    {day}
                  </span>
                  {isOptimalDay && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                      Peak
                    </span>
                  )}
                </div>

                {/* Scheduled Items for this day */}
                <div className="space-y-2">
                  {dayPlans.map((item) => {
                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all relative group ${
                          item.isRecommended
                            ? 'bg-sky-50/50 border-[#0284C7]/30 shadow-2xs'
                            : 'bg-[#F8FAFC] border-[#E2E8F0]'
                        }`}
                      >
                        {item.isRecommended && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-[#0284C7] mb-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Recommended</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 mb-1">
                          {getPlatformIcon(item.platform)}
                          <span className="font-bold text-[#0B132B] truncate text-xs">
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {item.time}
                          </span>
                          <span className="uppercase text-[9px] font-semibold bg-white px-1 py-0.5 rounded border border-[#E2E8F0]">
                            {item.contentType}
                          </span>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 text-[#64748B] hover:text-rose-600 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add button in slot */}
              <button
                onClick={() => {
                  setNewDay(day);
                  setShowAddModal(true);
                }}
                className="w-full mt-2 py-1 text-[11px] font-medium text-[#64748B] hover:text-[#0B132B] hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xl space-y-4 font-sans">
            <h3 className="text-base font-bold text-[#0B132B]">
              Schedule Content for {newDay}
            </h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#64748B] mb-1">
                  Content Title / Topic
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 3 Video Hook Principles"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0B132B] focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">
                    Platform
                  </label>
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value as PlatformType)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0B132B]"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0B132B]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#64748B] mb-1">
                  Format
                </label>
                <input
                  type="text"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0B132B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#64748B] hover:text-[#0B132B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white"
                >
                  Save to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
