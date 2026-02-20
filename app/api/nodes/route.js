import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Node from "@/models/Node";

export async function GET() {
  try {
    await connectDB();

    const nodes = await Node.find().sort({ updatedAt: -1 });

    return NextResponse.json(nodes);
  } catch (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
