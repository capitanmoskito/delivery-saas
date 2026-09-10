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

  const bytes =
    await file.arrayBuffer();

  const buffer =
    Buffer.from(bytes);

  const optimizedImage =
  await sharp(buffer)

    .resize(800, 600, {
      fit: "cover"
    })

    .webp({
      quality: 85
    })

    .toBuffer();

  const fileName =
    `${Date.now()}-${file.name}`;

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

if (
  file.size >
  5 * 1024 * 1024
) {

  return NextResponse.json(
    {
      success: false,
      message:
        "La imagen excede 5 MB"
    },
    {
      status: 400
    }
  );
}

  return NextResponse.json({
    success: true,
    url:
      `/uploads/${fileName}`
  });
}