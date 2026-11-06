"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Utensils } from "lucide-react";
import StoreCard from "@/src/components/store-card";

type Store = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string;
  logoUrl?: string;
};

type CategoryGroup = {
  id: string;
  name: string;
  stores: Store[];
};

export default function MarketplaceCategories({ groups }: { groups: CategoryGroup[] }) {
  const reduceMotion = useReducedMotion();

  if (groups.length === 0) {
    return (
      <section id="categorias" className="mx-auto max-w-7xl px-5 pb-20 pt-6 sm:px-8">
        <div className="rounded-lg border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#f7e9df] text-[#a94327]">
            <Utensils size={22} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-bold">Pronto habrá algo delicioso</h2>
          <p className="mt-2 text-sm text-stone-500">Estamos preparando nuevos negocios para ti.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="categorias" className="pb-16 sm:pb-24">
      <div className="sticky top-16 z-30 border-y border-stone-200/80 bg-[#faf9f6]/90 backdrop-blur-xl">
        <nav
          aria-label="Categorías de comida"
          className="mx-auto flex max-w-7xl snap-x gap-2 overflow-x-auto px-5 py-3 sm:px-8"
        >
          {groups.map((group) => (
            <a
              key={group.id}
              href={`#${group.id}`}
              className="flex shrink-0 snap-start items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-stone-700 transition duration-200 hover:border-[#e7b6a4] hover:text-[#a94327]"
            >
              <Utensils size={15} className="text-[#d95d39]" aria-hidden="true" />
              {group.name}
            </a>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {groups.map((group) => (
          <section key={group.id} id={group.id} className="scroll-mt-36 pt-12 sm:pt-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a94327]">Encuentra tu favorito</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#2b2118] sm:text-3xl">
                  {group.name}
                </h2>
              </div>
              <span className="shrink-0 text-xs font-medium text-stone-500">
                {group.stores.length} {group.stores.length === 1 ? "negocio" : "negocios"}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.stores.map((store, index) => (
                <motion.div
                  key={store.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.16) }}
                >
                  <StoreCard
                    id={store.id}
                    name={store.name}
                    description={store.description}
                    imageUrl={store.imageUrl}
                    logoUrl={store.logoUrl}
                    categoryName={group.name}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}