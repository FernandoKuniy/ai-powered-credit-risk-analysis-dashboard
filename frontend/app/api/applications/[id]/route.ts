export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  // Validate server-side environment variable
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error: API_KEY not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const applicationId = params.id;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
  
  // Extract Authorization header (required for this endpoint)
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    "Authorization": authHeader,
  };
  
  const res = await fetch(`${baseUrl}/applications/${applicationId}`, {
    method: "GET",
    headers,
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), { status: res.status });
}

