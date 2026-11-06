import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

interface Props {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  logoUrl?: string | null;
  categoryName?: string;
}

export default function StoreCard({
  id,
  name,
  description,
  imageUrl,
  logoUrl,
  categoryName,
}: Props) {
  return (
    <Link
      href={`/store/${id}`}
      className="group block h-full overflow-hidden rounded-lg border border-stone-200/80 bg-white shadow-[0_12px_36px_-28px_rgba(43,33,24,0.28)] transition duration-300 hover:-translate-y-1 hover:border-[#e7b6a4] hover:shadow-[0_22px_46px_-30px_rgba(43,33,24,0.3)]"
    >
      <article className="flex h-full flex-col">
        <div className="relative aspect-[1.65] overflow-hidden bg-[#f7e9df]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#b3472b]">
              <Store size={34} strokeWidth={1.5} aria-hidden="true" />
            </div>
          )}
          {logoUrl && (
            <span className="absolute bottom-3 left-3 h-12 w-12 overflow-hidden rounded-lg border-2 border-white bg-white shadow-md">
              <Image src={logoUrl} alt="" fill unoptimized className="object-cover" />
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          {categoryName && (
            <span className="mb-2 w-fit rounded-full bg-[#f7e9df] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#a94327]">
              {categoryName}
            </span>
          )}
          <h3 className="text-lg font-extrabold tracking-tight text-[#2b2118]">{name}</h3>
          {description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-stone-500">{description}</p>}
          <span className="mt-auto flex items-center gap-1 pt-4 text-xs font-bold text-[#a94327]">
            Ver negocio
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </span>
        </div>
      </article>
    </Link>
  );
}