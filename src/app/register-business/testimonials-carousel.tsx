"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Quote, Star, Store } from "lucide-react";

export type BusinessTestimonial = {
  id: string;
  businessName: string;
  category?: string | null;
  city?: string | null;
  rating: number;
  testimonial: string;
  logoUrl?: string | null;
};

type TestimonialsCarouselProps = {
  testimonials: BusinessTestimonial[];
};

export function TestimonialsCarousel({ testimonials }: TestimonialsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (testimonials.length < 2) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % testimonials.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [testimonials.length]);

  if (testimonials.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-3" aria-label="Testimonios en preparación">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-lg border border-stone-200/80 bg-white p-6 shadow-[0_12px_36px_-28px_rgba(43,33,24,0.28)]"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-full bg-stone-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 animate-pulse rounded bg-stone-100" />
                <div className="h-3 w-20 animate-pulse rounded bg-stone-100" />
              </div>
            </div>
            <div className="mt-7 space-y-3">
              <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-stone-100" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-stone-100" />
            </div>
            <div className="mt-7 h-4 w-24 animate-pulse rounded bg-amber-100" />
          </div>
        ))}
      </div>
    );
  }

  const testimonial = testimonials[activeIndex % testimonials.length];

  return (
    <div className="mx-auto max-w-3xl">
      <AnimatePresence mode="wait">
        <motion.article
          key={testimonial.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="rounded-lg border border-stone-200/80 bg-white p-7 shadow-[0_24px_70px_-46px_rgba(43,33,24,0.34)] sm:p-10"
        >
          <div className="flex items-start justify-between">
            <Quote className="h-8 w-8 text-[#d95d39]" aria-hidden="true" />
            <div className="flex gap-1" aria-label={`${testimonial.rating} de 5 estrellas`}>
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  size={16}
                  className={index < Math.round(testimonial.rating) ? "fill-amber-400 text-amber-400" : "text-stone-200"}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
          <p className="mt-6 text-lg leading-8 text-stone-700">“{testimonial.testimonial}”</p>
          <div className="mt-8 flex items-center gap-3 border-t border-stone-100 pt-6">
            {testimonial.logoUrl ? (
              <Image
                src={testimonial.logoUrl}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7e9df] text-[#a94327]">
                <Store size={20} aria-hidden="true" />
              </span>
            )}
            <div>
              <p className="font-semibold text-stone-900">{testimonial.businessName}</p>
              <p className="text-sm text-stone-500">
                {testimonial.category || testimonial.city || "Negocio DELIM"}
              </p>
            </div>
          </div>
        </motion.article>
      </AnimatePresence>
      {testimonials.length > 1 && (
        <div className="mt-5 flex justify-center gap-2" aria-label="Navegación de testimonios">
          {testimonials.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Mostrar testimonio ${index + 1}`}
              aria-current={activeIndex === index}
              className={`h-2 rounded-full transition-all duration-200 ${
                activeIndex === index ? "w-7 bg-[#d95d39]" : "w-2 bg-stone-300 hover:bg-stone-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}