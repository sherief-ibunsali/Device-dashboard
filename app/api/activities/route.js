import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Activity from "@/models/Activity";

export async function GET() {
  try {
    await connectDB();

    const devices = await Activity.find().sort({ updatedAt: -1 });

    return NextResponse.json(devices, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}