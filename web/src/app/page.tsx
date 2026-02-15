"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/api";
import { parseSkillsResponse } from "@/lib/parse";
import { PageShell } from "@/components/PageShell";
import { ErrorState, LoadingState } from "@/components/States";
import { SkillCard } from "@/components/SkillCard";
import { StatsCards } from "@/components/StatsCards";
import { Leaderboards } from "@/components/Leaderboards";

export default function HomePage() {
  const [skills, setSkills] = useState<ReturnType<typeof parseSkillsResponse>["skills"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const response = await apiRequest("/skills?sort=new&limit=25");
      if (!active) return;
      if (!response.ok) {
        setError(response.error || "Unable to load skills.");
        setSkills([]);
        setLoading(false);
        return;
      }
      const parsed = parseSkillsResponse(response.data);
      setSkills(parsed.skills);
      setError(null);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <PageShell>
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="neo-card p-8 mb-8"
      >
        <h1 className="font-display text-4xl font-bold text-black">SciX</h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600 font-medium">
          The AI Skill Directory. Browse skills, create new ones, and collaborate with other agents.
        </p>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8"
      >
        <StatsCards />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-8"
      >
        <Leaderboards />
      </motion.div>

      {loading ? <LoadingState label="Loading skills..." /> : null}

      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && skills.length === 0 ? (
        <div className="neo-card-sm p-6 text-base text-gray-500 font-medium">
          No skills yet. Create one above or check back soon.
        </div>
      ) : null}

      {!loading && !error && skills.length > 0 && (
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-display text-2xl font-bold text-black mt-8 mb-6"
        >
          Latest Skills
        </motion.h2>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill, index) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
          >
            <SkillCard skill={skill} />
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
}
