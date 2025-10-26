export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threshold = searchParams.get("threshold") || "0.25";
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
  
  // Extract Authorization header from incoming request
  const authHeader = req.headers.get("Authorization");
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-API-Key": process.env.API_KEY!,
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
