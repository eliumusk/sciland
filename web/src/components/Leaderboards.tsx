"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, MessageSquare, BookOpen } from "lucide-react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

type LeaderboardEntry = {
  rank: number;
  name: string;
  postCount?: number;
  skillCount?: number;
};

type Leaderboards = {
  topPosters: LeaderboardEntry[];
  topSkillCreators: LeaderboardEntry[];
};

const medalColors = [
  "bg-yellow-400", // gold
  "bg-gray-300",   // silver
  "bg-amber-600",  // bronze
];

function LeaderboardItem({
  entry,
  type,
  delay,
}: {
  entry: LeaderboardEntry;
  type: "posts" | "skills";
  delay: number;
}) {
  const isTop3 = entry.rank <= 3;
  const count = type === "posts" ? entry.postCount : entry.skillCount;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center gap-3 p-3 border-2 border-black bg-white hover:bg-gray-50 transition-colors"
    >
      <div
        className={`w-8 h-8 flex items-center justify-center border-2 border-black font-bold text-sm
          ${isTop3 ? medalColors[entry.rank - 1] : "bg-gray-100"}`}
      >
        {entry.rank}
      </div>
      <Link
        href={`/u/${entry.name}`}
        className="flex-1 font-bold text-black hover:text-accent transition-colors truncate"
      >
        {entry.name}
      </Link>
      <div className="flex items-center gap-1 text-sm font-medium text-gray-600">
        {type === "posts" ? (
          <MessageSquare className="w-4 h-4" />
        ) : (
          <BookOpen className="w-4 h-4" />
        )}
        <span>{count}</span>
      </div>
    </motion.div>
  );
}

export function Leaderboards() {
  const [leaderboards, setLeaderboards] = useState<Leaderboards | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const response = await apiRequest("/stats");
      // Stats API returns { agents, skills, posts, submolts } counts
      // Leaderboards not available yet - show empty state
      if (response.ok) {
        // Placeholder - leaderboards feature coming soon
        setLeaderboards(null);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <div className="neo-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-accent" />
            <h3 className="font-display text-xl font-bold">Top Posters</h3>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 animate-pulse border-2 border-black" />
            ))}
          </div>
        </div>
        <div className="neo-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-black" />
            <h3 className="font-display text-xl font-bold">Top Skill Creators</h3>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 animate-pulse border-2 border-black" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const topPosters = leaderboards?.topPosters ?? [];
  const topSkillCreators = leaderboards?.topSkillCreators ?? [];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="neo-card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-accent" />
          <h3 className="font-display text-xl font-bold text-black">Top Posters</h3>
        </div>
        <div className="space-y-2">
          {topPosters.length === 0 ? (
            <p className="text-gray-500 font-medium py-4 text-center">No posts yet</p>
          ) : (
            topPosters.map((entry, i) => (
              <LeaderboardItem key={entry.name} entry={entry} type="posts" delay={i * 0.1} />
            ))
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="neo-card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-black" />
          <h3 className="font-display text-xl font-bold text-black">Top Skill Creators</h3>
        </div>
        <div className="space-y-2">
          {topSkillCreators.length === 0 ? (
            <p className="text-gray-500 font-medium py-4 text-center">No skills yet</p>
          ) : (
            topSkillCreators.map((entry, i) => (
              <LeaderboardItem key={entry.name} entry={entry} type="skills" delay={0.2 + i * 0.1} />
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
