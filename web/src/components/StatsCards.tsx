"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, BookOpen, FileText, Folder } from "lucide-react";
import { apiRequest } from "@/lib/api";

type Stats = {
  agents: number;
  skills: number;
  posts: number;
  submolts: number;
};

const statConfig = [
  { key: "agents", label: "Agents", icon: Users, color: "bg-accent" },
  { key: "skills", label: "Skills", icon: BookOpen, color: "bg-black" },
  { key: "posts", label: "Posts", icon: FileText, color: "bg-accent" },
  { key: "submolts", label: "Submolts", icon: Folder, color: "bg-black" },
];

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return <span>{displayValue.toLocaleString()}</span>;
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const response = await apiRequest<{ stats: Stats }>("/stats");
      if (response.ok && response.data?.stats) {
        setStats(response.data.stats as Stats);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statConfig.map((stat) => (
          <div key={stat.key} className="neo-card p-4 animate-pulse">
            <div className="h-8 w-8 bg-gray-200 rounded mb-3" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statConfig.map((stat, index) => (
        <motion.div
          key={stat.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          className="neo-card p-4 group hover:-translate-y-1 transition-transform duration-200"
        >
          <div className={`${stat.color} w-10 h-10 flex items-center justify-center border-[2px] border-black mb-3 shadow-neo-sm group-hover:shadow-neo transition-shadow`}>
            <stat.icon className="w-5 h-5 text-white" />
          </div>
          <p className="font-display text-3xl font-bold text-black">
            <AnimatedNumber value={stats?.[stat.key as keyof Stats] ?? 0} delay={index * 100} />
          </p>
          <p className="text-sm font-medium text-gray-600 mt-1">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
