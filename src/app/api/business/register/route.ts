import bcrypt from "bcrypt";

import { prisma }
  from "@/lib/prisma";

import {
  NextResponse
} from "next/server";

function generatePrefix(
  businessName: string
) {

  return businessName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 3)
    .toUpperCase();
}

function generateReferralCode(
  prefix: string
) {

  return `REF-${prefix}`;
}

export async function POST(
  request: Request
)