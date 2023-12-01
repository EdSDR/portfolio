import path from "path";
import { readFile } from "fs/promises";

export async function GET() {
  const buffer = await readFile(
    path.join(process.cwd(), "public", "resume-edsdr.pdf"),
  );

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", "inline; filename=resume-edsdr.pdf");

  return new Response(buffer, { headers });
}
