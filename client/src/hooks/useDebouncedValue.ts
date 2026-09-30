import { useEffect, useState } from "react"

// Returns `value`, but only after it has stopped changing for `delayMs`.
// Typing "chicken" quickly → one update ("chicken") instead of seven.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    // A new keystroke before the timer fires cancels it and starts a fresh one
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
