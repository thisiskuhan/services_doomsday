"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Eye } from "lucide-react";

interface ZombieWatcher {
  id: string;
  name: string;
  zombiesFound: number;
}

interface ScheduleModalProps {
  watcher: ZombieWatcher;
  onSubmit: (data: {
    scanFrequencyMinutes: number;
    analysisPeriodDays: number;
    forAllServices: boolean;
  }) => void;
  onClose: () => void;
}

export function ScheduleModal({ watcher, onSubmit, onClose }: ScheduleModalProps) {
  const [formData, setFormData] = useState({
    scanFrequencyMinutes: 15,
    analysisPeriodDays: 30,
    forAllServices: true,
  });

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Calendar className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Schedule Observation</h2>
              <p className="text-xs text-zinc-500">{watcher.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg cursor-hover"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Scan Frequency */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Scan Frequency (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="1440"
              value={formData.scanFrequencyMinutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  scanFrequencyMinutes: parseInt(e.target.value) || 15,
                })
              }
              className="w-full bg-zinc-800/50 border border-zinc-700 text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
            <p className="text-xs text-zinc-500 mt-1">
              How often to check observability sources for traffic
            </p>
          </div>

          {/* Analysis Period */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Analysis Period (days)
            </label>
            <input
              type="number"
              min="7"
              max="365"
              value={formData.analysisPeriodDays}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  analysisPeriodDays: parseInt(e.target.value) || 30,
                })
              }
              className="w-full bg-zinc-800/50 border border-zinc-700 text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Endpoints with no traffic in this period are flagged as zombies
            </p>
          </div>

          {/* For All Services Toggle */}
          <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
            <div>
              <p className="text-sm font-medium text-zinc-300">Apply to all services</p>
              <p className="text-xs text-zinc-500 mt-1">
                Use same settings for all {watcher.zombiesFound} endpoints
              </p>
            </div>
            <button
              onClick={() =>
                setFormData({ ...formData, forAllServices: !formData.forAllServices })
              }
              className={`relative w-12 h-6 rounded-full transition-colors cursor-hover ${
                formData.forAllServices ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  formData.forAllServices ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {!formData.forAllServices && (
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-400">
                <Eye size={16} />
                <p className="text-sm font-medium">Per-endpoint settings</p>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                You&apos;ll be able to configure individual settings for each endpoint
                after saving.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-500 hidden sm:block">
            Observation will start after scheduling
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 text-zinc-400 hover:text-white font-medium text-sm transition-colors cursor-hover"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-hover"
            >
              <Calendar size={16} />
              Schedule Observation
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
