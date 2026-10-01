import { useState } from "react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { useAddresses, useCreateAddress, useDeleteAddress, useUpdateAddress } from "@/hooks/useAddresses"
import { ROUTES } from "@/lib/constants"
import { useAuthStore } from "@/stores/useAuthStore"
import type { Address, AddressInput } from "@/types/api"

const EMPTY_FORM: AddressInput = {
  full_name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "Bangladesh",
  is_default: false,
}

function AddressForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: AddressInput
  onSave: (data: AddressInput) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<AddressInput>(initial)

  function set(field: keyof AddressInput, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Full name</label>
          <input
            required
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Address line 1</label>
          <input
            required
            value={form.line1}
            onChange={(e) => set("line1", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Address line 2 (optional)</label>
          <input
            value={form.line2 ?? ""}
            onChange={(e) => set("line2", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">City</label>
          <input
            required
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">State / District</label>
          <input
            required
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Postal code</label>
          <input
            required
            value={form.postal_code}
            onChange={(e) => set("postal_code", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Country</label>
          <input
            required
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.is_default}
          onChange={(e) => set("is_default", e.target.checked)}
          className="rounded"
        />
        Set as default address
      </label>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save address"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function AddressCard({ address, onEdit, onDelete }: { address: Address; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${address.is_default ? "border-primary" : ""}`}>
      {address.is_default && (
        <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Default
        </span>
      )}
      <p className="font-medium">{address.full_name}</p>
      <p className="text-sm text-muted-foreground">{address.line1}</p>
      {address.line2 && <p className="text-sm text-muted-foreground">{address.line2}</p>}
      <p className="text-sm text-muted-foreground">
        {address.city}, {address.state} {address.postal_code}
      </p>
      <p className="text-sm text-muted-foreground">{address.country}</p>
      <div className="mt-3 flex gap-3">
        <button onClick={onEdit} className="text-sm text-primary hover:underline">
          Edit
        </button>
        <button onClick={onDelete} className="text-sm text-destructive hover:underline">
          Delete
        </button>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const { data: addresses, isPending } = useAddresses()
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()
  const deleteAddress = useDeleteAddress()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)

  function handleSaveNew(data: AddressInput) {
    createAddress.mutate(data, { onSuccess: () => setShowForm(false) })
  }

  function handleSaveEdit(data: AddressInput) {
    if (!editing) return
    updateAddress.mutate({ id: editing.id, ...data }, { onSuccess: () => setEditing(null) })
  }

  function handleDelete(id: string) {
    if (confirm("Delete this address?")) deleteAddress.mutate(id)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Account info */}
      <section>
        <h1 className="mb-4 text-2xl font-semibold">Your account</h1>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{user?.email}</p>
        </div>
        <div className="mt-3 flex gap-4 text-sm">
          <Link to={ROUTES.orders} className="text-primary hover:underline">
            Your orders
          </Link>
        </div>
      </section>

      {/* Saved addresses */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Saved addresses</h2>
          {!showForm && !editing && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              + Add address
            </Button>
          )}
        </div>

        {showForm && (
          <div className="mb-4">
            <AddressForm
              initial={EMPTY_FORM}
              onSave={handleSaveNew}
              onCancel={() => setShowForm(false)}
              saving={createAddress.isPending}
            />
          </div>
        )}

        {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!isPending && addresses?.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
        )}

        <div className="space-y-3">
          {addresses?.map((addr) =>
            editing?.id === addr.id ? (
              <AddressForm
                key={addr.id}
                initial={addr}
                onSave={handleSaveEdit}
                onCancel={() => setEditing(null)}
                saving={updateAddress.isPending}
              />
            ) : (
              <AddressCard
                key={addr.id}
                address={addr}
                onEdit={() => setEditing(addr)}
                onDelete={() => handleDelete(addr.id)}
              />
            ),
          )}
        </div>
      </section>
    </div>
  )
}
