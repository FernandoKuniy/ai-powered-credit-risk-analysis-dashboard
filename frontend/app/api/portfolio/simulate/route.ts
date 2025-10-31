export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Validate server-side environment variable (this route runs server-side only)
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error: API_KEY not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { searchParams } = new URL(req.url);
  const threshold = searchParams.get("threshold") || "0.25";
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
  
  // Extract Authorization header from incoming request
  const authHeader = req.headers.get("Authorization");
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey, // Server-side only - never exposed to client
  };
  
  // Forward the Authorization header if present
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  
  const res = await fetch(`${baseUrl}/portfolio/simulate?threshold=${threshold}`, {
    method: "GET",
    headers,
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), { status: res.status });
}
