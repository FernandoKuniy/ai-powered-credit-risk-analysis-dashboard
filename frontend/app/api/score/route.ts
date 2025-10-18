export async function POST(req: Request) {
    const body = await req.json();
  
    const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
    const res = await fetch(`${baseUrl}/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.API_KEY!, // stays server-side
      },
      body: JSON.stringify(body),
    });
  
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.status });
  }