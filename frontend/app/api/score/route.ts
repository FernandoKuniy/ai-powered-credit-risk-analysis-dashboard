export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const body = await req.json();
  
    const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
    
    // Extract Authorization header from incoming request
    const authHeader = req.headers.get("Authorization");
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-API-Key": process.env.API_KEY!, // stays server-side
    };
    
    // Forward the Authorization header if present
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }
    
    const res = await fetch(`${baseUrl}/score`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.status });
  }