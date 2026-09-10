import Link from "next/link";
import Image from "next/image";

interface Props {

  id: string;

  name: string;

  imageUrl?: string;
}

export default function StoreCard({
  id,
  name,
  imageUrl,
}: Props) {

  return (

    <Link href={`/store/${id}`}>

      <div
        className="
          overflow-hidden
          rounded-3xl
          bg-white
          shadow-sm
          transition-all
          hover:shadow-lg
        "
      >

        {imageUrl ? (

          <div className="relative h-52">
            <Image
              src={imageUrl}
              alt={name}
              fill
              unoptimized
              className="object-cover"
            />
          </div>

        ) : (

          <div
            className="
              h-52
              bg-slate-100
            "
          />

        )}

        <div className="p-4">

          <h2 className="
        text-xl
        font-extrabold
        tracking-tight
        "
        >
            {name}
          </h2>

          <div
            className="
              mt-2
              flex
              items-center
              gap-2
            "
          >

            <span>
              ⭐ 4.8
            </span>

            <span>
              •
            </span>

            <span>
              20-30 min
            </span>

          </div>

          <p
            className="
                mt-1
                text-sm
                font-medium
              text-gray-500
            "
          >
            Mexicana
          </p>

        </div>

      </div>

    </Link>
  );
}