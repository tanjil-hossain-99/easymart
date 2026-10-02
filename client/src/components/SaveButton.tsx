import { useSavedProducts, useSaveProduct, useUnsaveProduct } from "@/hooks/useSavedProducts"
import { useRequireLogin } from "@/hooks/useRequireLogin"

type Props = {
  productId: string
  compact?: boolean
}

export function SaveButton({ productId, compact = false }: Props) {
  const { data } = useSavedProducts()
  const save = useSaveProduct()
  const unsave = useUnsaveProduct()
  const requireLogin = useRequireLogin()

  const isSaved = data?.data.some((p) => p.id === productId) ?? false
  const isPending = save.isPending || unsave.isPending

  function toggle() {
    if (!requireLogin()) return
    if (isSaved) {
      unsave.mutate(productId)
    } else {
      save.mutate(productId)
    }
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={isPending}
        aria-label={isSaved ? "Remove from saved" : "Save for later"}
        title={isSaved ? "Remove from saved" : "Save for later"}
        className="text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {isSaved ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5 text-brand">
            <path d="M3.172 5.172a4 4 0 0 1 5.656 0L12 8.344l3.172-3.172a4 4 0 1 1 5.656 5.656L12 21 3.172 10.828a4 4 0 0 1 0-5.656z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="flex items-center gap-2 text-sm text-brand-text hover:underline disabled:opacity-50"
    >
      {isSaved ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4 text-brand">
            <path d="M3.172 5.172a4 4 0 0 1 5.656 0L12 8.344l3.172-3.172a4 4 0 1 1 5.656 5.656L12 21 3.172 10.828a4 4 0 0 1 0-5.656z" />
          </svg>
          Saved
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          Save for later
        </>
      )}
    </button>
  )
}
