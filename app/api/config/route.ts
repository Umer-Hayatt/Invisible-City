import { aiProvider } from "@/lib/ai";

export async function GET() {
  return Response.json({ aiMode: aiProvider() });
}
