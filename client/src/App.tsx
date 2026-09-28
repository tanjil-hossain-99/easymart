import { Button } from '@/components/ui/button';
import { useCounterStore } from '@/stores/useCounterStore';
import { useQuery } from '@tanstack/react-query';

type Todo = { id: number; title: string; completed: boolean }

function App() {
  const count = useCounterStore((s) => s.count)
  const increment = useCounterStore((s) => s.increment)
  const reset = useCounterStore((s) => s.reset)

  const { data, isPending, isError } = useQuery({
    queryKey: ['todo', 1],
    queryFn: async (): Promise<Todo> => {
      const res = await fetch('https://jsonplaceholder.typicode.com/todos/1')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })


  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-4xl font-bold tracking-tight">EasyMart</h1>

      <section className="flex items-center gap-3">
        <Button onClick={increment}>Count is {count}</Button>
        <Button variant="outline" onClick={reset}>
          Reset
        </Button>
      </section>

      <section className="w-full rounded-lg border p-4 text-sm">
        <h2 className="mb-2 font-semibold">TanStack Query demo</h2>
        {isPending && <p className="text-muted-foreground">Loading…</p>}
        {isError && <p className="text-destructive">Something went wrong.</p>}
        {data && <p>{data.title}</p>}
      </section>
    </main>
  )
}

export default App
