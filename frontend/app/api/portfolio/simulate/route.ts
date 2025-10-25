export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threshold = searchParams.get("threshold") || "0.25";
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
  const res = await fetch(`${baseUrl}/portfolio/simulate?threshold=${threshold}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.API_KEY!,
    },
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), { status: res.status });
}
