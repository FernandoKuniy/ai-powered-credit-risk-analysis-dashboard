export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable caching completely

export async function GET(req: Request) {
  // Validate server-side environment variable (this route runs server-side only)
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error: API_KEY not set" }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        } 
      }
    );
  }

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
  
  // Add cache-busting query parameter and no-cache headers for backend fetch
  const timestamp = Date.now();
  const res = await fetch(`${baseUrl}/portfolio?t=${timestamp}`, {
    method: "GET",
    headers: {
      ...headers,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
    cache: "no-store", // Explicitly disable caching
  });

  const data = await res.json();
  
  // Return response with no-cache headers to prevent Next.js/proxy caching
  return new Response(JSON.stringify(data), { 
    status: res.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Request-ID": `${timestamp}`, // For debugging
    }
  });
}
