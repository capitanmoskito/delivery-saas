import { writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path"
import sharp from "sharp";

export async function POST(
  request: Request
) {

  const data =
    await request.formData();

  const file =
    data.get("file") as File;

  if (!file) {

    return NextResponse.json(
      {
        success: false
      },
      {
        status: 400
      }
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      {
        success: false,
        message: "La imagen excede 5 MB"
      },
      {
        status: 400
      }
    );
  }

  const kind =
    data.get("kind") === "banner"
      ? "banner"
      : data.get("kind") === "logo"
        ? "logo"
        : data.get("kind") === "gallery"
          ? "gallery"
          : "product";

  const dimensions =
    kind === "banner"
      ? [1600, 900]
      : kind === "logo"
        ? [500, 500]
        : kind === "gallery"
          ? [800, 600]
          : [800, 600];

  const bytes =
    await file.arrayBuffer();

  const buffer =
    Buffer.from(bytes);

  const optimizedImage =
  await sharp(buffer)

    .resize(dimensions[0], dimensions[1], {
      fit: "cover"
    })

    .webp({
      quality: 85
    })

    .toBuffer();

  const fileName =
    `${Date.now()}-${kind}.webp`;

  const uploadPath =
    path.join(
      process.cwd(),
      "public",
      "uploads",
      fileName
    );

  await writeFile(
  uploadPath,
  optimizedImage
);

  return NextResponse.json({
    success: true,
    url:
      `/uploads/${fileName}`
  });
}