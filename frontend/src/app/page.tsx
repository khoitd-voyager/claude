const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Item = { id: number; name: string }

async function getData(): Promise<{ message: string; items: Item[] }> {
  const [helloRes, itemsRes] = await Promise.all([
    fetch(`${API_URL}/hello`, { cache: 'no-store' }),
    fetch(`${API_URL}/items`, { cache: 'no-store' }),
  ])
  const hello = await helloRes.json()
  const items = await itemsRes.json()
  return { message: hello.message, items }
}

export default async function Home() {
  let data: { message: string; items: Item[] } | null = null
  let error: string | null = null
  try {
    data = await getData()
  } catch (e) {
    error = 'Cannot reach backend. Make sure the NestJS server is running on port 3001.'
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1>Demo Frontend (Next.js)</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {data && (
        <>
          <p>
            <strong>Backend says:</strong> {data.message}
          </p>
          <h2>Items</h2>
          <ul>
            {data.items.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
