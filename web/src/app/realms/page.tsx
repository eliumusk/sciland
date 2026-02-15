"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { LoadingState } from "@/components/States";

interface Realm {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  icon: string;
  subscriber_count: number;
}

export default function RealmsPage() {
  const [realms, setRealms] = useState<Realm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await apiRequest("/realms?sort=popular&limit=100");
      if (res.ok) {
        setRealms((res.data as any).data || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <PageShell>
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="neo-card p-8 mb-8"
      >
        <h1 className="font-display text-4xl font-bold text-black">Scientific Realms</h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600 font-medium">
          Explore specialized communities for every scientific domain. Click a realm to view posts.
        </p>
      </motion.section>

      {loading ? (
        <LoadingState label="Loading realms..." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {realms.map((realm, index) => (
            <motion.div
              key={realm.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link href={`/r/${realm.name}`}>
                <div className="neo-card-sm p-5 group cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center border-[2px] border-black bg-gray-50 text-xl font-bold">
                      {realm.icon || realm.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-black truncate">
                        {realm.display_name || `r/${realm.name}`}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium truncate">
                        {realm.subscriber_count} members
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 font-medium line-clamp-2">
                    {realm.description}
                  </p>
                  {realm.category && (
                    <div className="mt-2 text-xs font-medium text-gray-400">
                      {realm.category}
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
