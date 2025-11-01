export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Validate server-side environment variable (this route runs server-side only)
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error: API_KEY not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();

  const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
  
  // Extract Authorization header from incoming request (required for this endpoint)
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey, // Server-side only - never exposed to client
    "Authorization": authHeader, // Forward the Authorization header
  };
  
  const res = await fetch(`${baseUrl}/applications/save`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), { status: res.status });
}

