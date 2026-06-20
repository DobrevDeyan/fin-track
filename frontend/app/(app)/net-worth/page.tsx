"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { useMoney } from "@/contexts/CurrencyContext"
import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  type Asset,
  type AssetType,
  type CreateAssetInput,
} from "@/lib/firestore-networth"
import { BASE_CURRENCY, SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/constants/currency.constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus, Building2, Car, Landmark, PiggyBank, LayoutGrid } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const ASSET_TYPE_ICONS: Record<AssetType, React.ElementType> = {
  bank: PiggyBank,
  investment: TrendingUp,
  property: Building2,
  vehicle: Car,
  other: LayoutGrid,
}

const EMPTY_FORM: CreateAssetInput = {
  name: "",
  type: "bank",
  value: 0,
  currency: "EUR",
  isLiability: false,
  notes: "",
}

export default function NetWorthPage() {
  const t = useTranslations("netWorth")
  const tCommon = useTranslations("common")
  const { user, loading: authLoading } = useAuth()
  const { format, toBase, fromBase, currency: userCurrency } = useMoney()

  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreateAssetInput>({ ...EMPTY_FORM, currency: userCurrency })

  const load = useCallback(async () => {
    if (!user) return
    try {
      setIsLoading(true)
      setAssets(await getAssets(user.uid))
    } catch {
      toast.error(t("error"))
    } finally {
      setIsLoading(false)
    }
  }, [user, t])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  // ── Computed totals ────────────────────────────────────────────────────────
  const totalAssets = assets.filter((a) => !a.isLiability).reduce((s, a) => s + a.value, 0)
  const totalLiabilities = assets.filter((a) => a.isLiability).reduce((s, a) => s + a.value, 0)
  const netWorth = totalAssets - totalLiabilities

  // ── Dialog helpers ─────────────────────────────────────────────────────────
  const openAdd = (isLiability = false) => {
    setEditingAsset(null)
    setForm({ ...EMPTY_FORM, currency: userCurrency, isLiability })
    setDialogOpen(true)
  }

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset)
    setForm({
      name: asset.name,
      type: asset.type,
      value: fromBase(asset.value),
      currency: userCurrency,
      isLiability: asset.isLiability,
      notes: asset.notes ?? "",
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || submitting) return
    try {
      setSubmitting(true)
      const formToSave = { ...form, value: toBase(form.value, form.currency as SupportedCurrency), currency: BASE_CURRENCY }
      if (editingAsset) {
        await updateAsset(editingAsset.id, formToSave)
        toast.success(t("updateSuccess"))
      } else {
        await createAsset(user.uid, formToSave)
        toast.success(t("createSuccess"))
      }
      setDialogOpen(false)
      await load()
    } catch {
      toast.error(t("error"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteAsset(deleteId)
      toast.success(t("deleteSuccess"))
      setDeleteId(null)
      await load()
    } catch {
      toast.error(t("error"))
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (authLoading || isLoading) {
    return (
      <div className="container py-8 px-4 sm:px-6">
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-72 mb-8" />
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  const assetList = assets.filter((a) => !a.isLiability)
  const liabilityList = assets.filter((a) => a.isLiability)

  return (
    <div className="container py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className={cn("border-2", netWorth >= 0 ? "border-green-500/30" : "border-red-500/30")}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{t("totalNetWorth")}</p>
            <p className={cn("text-2xl font-bold", netWorth >= 0 ? "text-green-600" : "text-red-600")}>
              {format(netWorth)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {netWorth >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-green-500" /> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
              <span className="text-xs text-muted-foreground">Assets − Liabilities</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{t("totalAssets")}</p>
            <p className="text-2xl font-bold text-green-600">{format(totalAssets)}</p>
            <p className="text-xs text-muted-foreground mt-1">{assetList.length} items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{t("totalLiabilities")}</p>
            <p className="text-2xl font-bold text-red-600">{format(totalLiabilities)}</p>
            <p className="text-xs text-muted-foreground mt-1">{liabilityList.length} items</p>
          </CardContent>
        </Card>
      </div>

      {assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Landmark className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold mb-1">{t("noAssets")}</h2>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">{t("noAssetsDescription")}</p>
          <div className="flex gap-3">
            <Button onClick={() => openAdd(false)}>
              <Plus className="h-4 w-4 mr-2" />{t("addAsset")}
            </Button>
            <Button variant="outline" onClick={() => openAdd(true)}>
              <Minus className="h-4 w-4 mr-2" />{t("addLiability")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Assets section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">{t("assets")}</h2>
              <Button size="sm" onClick={() => openAdd(false)}>
                <Plus className="h-4 w-4 mr-1" />{t("addAsset")}
              </Button>
            </div>
            {assetList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">{t("noAssets")}</p>
            ) : (
              <div className="space-y-2">
                {assetList.map((asset) => (
                  <AssetRow key={asset.id} asset={asset} userCurrency={userCurrency} t={t} onEdit={openEdit} onDelete={setDeleteId} />
                ))}
              </div>
            )}
          </div>

          {/* Liabilities section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">{t("liabilities")}</h2>
              <Button size="sm" variant="outline" onClick={() => openAdd(true)}>
                <Plus className="h-4 w-4 mr-1" />{t("addLiability")}
              </Button>
            </div>
            {liabilityList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">No liabilities added</p>
            ) : (
              <div className="space-y-2">
                {liabilityList.map((asset) => (
                  <AssetRow key={asset.id} asset={asset} userCurrency={userCurrency} t={t} onEdit={openEdit} onDelete={setDeleteId} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAsset ? t("editAsset") : form.isLiability ? t("addLiability") : t("addAsset")}</DialogTitle>
            <DialogDescription>
              {form.isLiability ? "Track a debt or liability" : "Track an asset you own"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("assetName")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("assetNamePlaceholder")}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("assetType")}</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as AssetType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">{t("typeBank")}</SelectItem>
                  <SelectItem value="investment">{t("typeInvestment")}</SelectItem>
                  <SelectItem value="property">{t("typeProperty")}</SelectItem>
                  <SelectItem value="vehicle">{t("typeVehicle")}</SelectItem>
                  <SelectItem value="other">{t("typeOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("assetValue")}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value || ""}
                  onChange={(e) => setForm((f) => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>{tCommon("currency")}</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("assetNotes")}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t("assetNotesPlaceholder")}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isLiability"
                checked={form.isLiability}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isLiability: Boolean(v) }))}
              />
              <Label htmlFor="isLiability" className="cursor-pointer">{t("isLiability")}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>{tCommon("cancel")}</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? tCommon("loading") : editingAsset ? tCommon("save") : tCommon("add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon("delete")}</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this entry from your net worth tracking.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── AssetRow ──────────────────────────────────────────────────────────────────

function AssetRow({
  asset,
  t,
  onEdit,
  onDelete,
}: {
  asset: Asset
  userCurrency?: string
  t: ReturnType<typeof useTranslations>
  onEdit: (a: Asset) => void
  onDelete: (id: string) => void
}) {
  const { format } = useMoney()
  const Icon = ASSET_TYPE_ICONS[asset.type]
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className={cn("p-2 rounded-md", asset.isLiability ? "bg-red-100 dark:bg-red-950" : "bg-green-100 dark:bg-green-950")}>
        <Icon className={cn("h-4 w-4", asset.isLiability ? "text-red-600" : "text-green-600")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{asset.name}</p>
        {asset.notes && <p className="text-xs text-muted-foreground truncate">{asset.notes}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn("font-semibold text-sm", asset.isLiability ? "text-red-600" : "text-green-600")}>
          {asset.isLiability ? "−" : "+"}{format(asset.value)}
        </p>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5">{asset.type}</Badge>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(asset)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(asset.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
