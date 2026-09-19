import { NextResponse } from "next/server";

import { AuthService }
  from "@/src/modules/auth/auth.service";

import { sanitizeInput} from "@/src/lib/input-sanitizer";

export async function POST(
  request: Request
) {

  try {

    const body =
      await request.json();
      
      body.email =
        sanitizeInput(
          body.email
      );

      body.password =
        sanitizeInput(
          body.password
      );

    const authService =
      new AuthService();

    const user =
      await authService.login(body);

    const response =
      NextResponse.json({

        success: true,

        user
      });

    response.cookies.set(
      "saas_user",
      JSON.stringify(user),
      {
        httpOnly: true,
        path: "/"
      }
    );

    return response;

  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error"
      },
      {
        status: 401
      }
    );
  }
}