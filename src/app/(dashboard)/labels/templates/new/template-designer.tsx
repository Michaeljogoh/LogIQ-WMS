"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultFieldsForLabelType,
  LABEL_TOKEN_HELP,
} from "@/lib/label-default-fields";
import type { LabelFieldConfig } from "@/lib/label-field-config";
import { cn } from "@/lib/utils";

const LABEL_TYPES = [
  "PRODUCT_BARCODE",
  "BIN_LOCATION",
  "PALLET",
  "SHIPPING_OUTER",
] as const;

type LabelType = (typeof LABEL_TYPES)[number];

function defaultNameForType(t: LabelType): string {
  if (t === "PRODUCT_BARCODE") {
    return "Standard product (4×6)";
  }
  return `${t.replace(/_/g, " ").toLowerCase()} template`;
}

function useLabelTypeFromUrl(): LabelType {
  const search = useSearchParams();
  const raw = search.get("type");
  if (
    raw === "PRODUCT_BARCODE" ||
    raw === "BIN_LOCATION" ||
    raw === "PALLET" ||
    raw === "SHIPPING_OUTER"
  ) {
    return raw;
  }
  return "PRODUCT_BARCODE";
}

export function TemplateDesigner() {
  const trpc = useTRPC();
  const router = useRouter();
  const initialType = useLabelTypeFromUrl();
  const [name, setName] = useState(() => defaultNameForType(initialType));
  const [type, setType] = useState<LabelType>(initialType);
  const [widthMm, setWidthMm] = useState("101.6");
  const [heightMm, setHeightMm] = useState("152.4");
  const [logoUrl, setLogoUrl] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [fields, setFields] = useState<LabelFieldConfig[]>(() =>
    defaultFieldsForLabelType(initialType),
  );
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const initial = defaultFieldsForLabelType(initialType);
    return initial[0]?.id ?? null;
  });

  useEffect(() => {
    const next = defaultFieldsForLabelType(initialType);
    setFields(next);
    setType(initialType);
    setName(defaultNameForType(initialType));
    setSelectedId(next[0]?.id ?? null);
  }, [initialType]);

  const selected = useMemo(
    () => fields.find((f) => f.id === selectedId) ?? null,
    [fields, selectedId],
  );

  const canvasScale = 0.35;
  const pageWpt =
    Number.parseFloat(widthMm || "101.6") * 2.834645669 * canvasScale;
  const pageHpt =
    Number.parseFloat(heightMm || "152.4") * 2.834645669 * canvasScale;

  const updateField = useCallback(
    (id: string, patch: Partial<LabelFieldConfig>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      );
    },
    [],
  );

  const createMutation = useMutation(
    trpc.labelTemplate.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Template saved");
        await router.push("/labels/templates");
      },
      onError: (err: { message?: string }) => {
        toast.error(err.message ?? "Failed to save template");
      },
    }),
  );

  const tokenList = LABEL_TOKEN_HELP[type];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            New label template
          </h1>
          <p className="text-sm text-muted-foreground">
            Responsive canvas preview with numeric placement. Positions are in
            points from the top-left of the label.
          </p>
        </div>
        <Button variant="outline" asChild className="min-h-11">
          <Link href="/labels/templates">Cancel</Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Canvas preview</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div
              className="relative mx-auto border border-dashed bg-muted/30"
              style={{
                width: pageWpt,
                height: pageHpt,
                minWidth: pageWpt,
                minHeight: pageHpt,
              }}
            >
              {fields.map((field) => {
                const left = field.x * canvasScale;
                const top = field.y * canvasScale;
                const w = Math.max(field.width * canvasScale, 8);
                const h = Math.max(field.height * canvasScale, 8);
                return (
                  <button
                    key={field.id}
                    type="button"
                    className={cn(
                      "absolute flex items-center justify-center rounded border text-[10px] leading-none touch-manipulation",
                      selectedId === field.id
                        ? "border-primary bg-primary/15"
                        : "border-border bg-background/80",
                    )}
                    style={{
                      left,
                      top,
                      width: w,
                      height: h,
                    }}
                    onClick={() => setSelectedId(field.id)}
                  >
                    {field.type}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="lt-name">Name</Label>
                <Input
                  id="lt-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => {
                    const next = v as LabelType;
                    setType(next);
                    const nf = defaultFieldsForLabelType(next);
                    setFields(nf);
                    setSelectedId(nf[0]?.id ?? null);
                  }}
                >
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LABEL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="wmm">Width (mm)</Label>
                  <Input
                    id="wmm"
                    value={widthMm}
                    onChange={(e) => setWidthMm(e.target.value)}
                    inputMode="decimal"
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hmm">Height (mm)</Label>
                  <Input
                    id="hmm"
                    value={heightMm}
                    onChange={(e) => setHeightMm(e.target.value)}
                    inputMode="decimal"
                    className="min-h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL (optional)</Label>
                <Input
                  id="logo"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://…"
                  className="min-h-11"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="def"
                  checked={isDefault}
                  onCheckedChange={(c) => setIsDefault(Boolean(c))}
                />
                <Label htmlFor="def">Default for this label type</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-11"
                  onClick={() => {
                    const id = crypto.randomUUID();
                    const next: LabelFieldConfig = {
                      id,
                      type: "text",
                      content: "{{sku}}",
                      x: 24,
                      y: 120,
                      width: 200,
                      height: 20,
                      fontSize: 10,
                    };
                    setFields((p) => [...p, next]);
                    setSelectedId(id);
                  }}
                >
                  Add text
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-11"
                  onClick={() => {
                    const id = crypto.randomUUID();
                    const next: LabelFieldConfig = {
                      id,
                      type: "barcode",
                      content: "{{sku}}",
                      x: 24,
                      y: 140,
                      width: 240,
                      height: 64,
                      barcodeFormat: "code128",
                    };
                    setFields((p) => [...p, next]);
                    setSelectedId(id);
                  }}
                >
                  Add barcode
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-11"
                  onClick={() => {
                    const id = crypto.randomUUID();
                    const next: LabelFieldConfig = {
                      id,
                      type: "qr",
                      content: "{{sku}}",
                      x: 24,
                      y: 160,
                      width: 100,
                      height: 100,
                      barcodeFormat: "qrcode",
                    };
                    setFields((p) => [...p, next]);
                    setSelectedId(id);
                  }}
                >
                  Add QR
                </Button>
              </div>

              {selected ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Selected field</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">X</Label>
                      <Input
                        type="number"
                        value={selected.x}
                        onChange={(e) =>
                          updateField(selected.id, {
                            x: Number.parseFloat(e.target.value) || 0,
                          })
                        }
                        className="min-h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Y</Label>
                      <Input
                        type="number"
                        value={selected.y}
                        onChange={(e) =>
                          updateField(selected.id, {
                            y: Number.parseFloat(e.target.value) || 0,
                          })
                        }
                        className="min-h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Width</Label>
                      <Input
                        type="number"
                        value={selected.width}
                        onChange={(e) =>
                          updateField(selected.id, {
                            width: Number.parseFloat(e.target.value) || 0,
                          })
                        }
                        className="min-h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Height</Label>
                      <Input
                        type="number"
                        value={selected.height}
                        onChange={(e) =>
                          updateField(selected.id, {
                            height: Number.parseFloat(e.target.value) || 0,
                          })
                        }
                        className="min-h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Content / tokens</Label>
                    <Textarea
                      value={selected.content}
                      onChange={(e) =>
                        updateField(selected.id, { content: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  {(selected.type === "barcode" || selected.type === "qr") && (
                    <div className="space-y-1">
                      <Label className="text-xs">Barcode format (bcid)</Label>
                      <Input
                        value={selected.barcodeFormat ?? ""}
                        onChange={(e) =>
                          updateField(selected.id, {
                            barcodeFormat: e.target.value || undefined,
                          })
                        }
                        placeholder="code128, qrcode, ean13"
                        className="min-h-10"
                      />
                    </div>
                  )}
                  {selected.type === "text" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Font size</Label>
                      <Input
                        type="number"
                        value={selected.fontSize ?? 10}
                        onChange={(e) =>
                          updateField(selected.id, {
                            fontSize: Number.parseFloat(e.target.value) || 10,
                          })
                        }
                        className="min-h-10"
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setFields((p) => p.filter((f) => f.id !== selected.id));
                      setSelectedId(null);
                    }}
                  >
                    Remove field
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a field on the canvas or add one.
                </p>
              )}

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Token picker
                </p>
                <div className="flex flex-wrap gap-1">
                  {tokenList.map((tok) => (
                    <Button
                      key={tok}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        if (!selected) {
                          return;
                        }
                        updateField(selected.id, {
                          content: `${selected.content}{{${tok}}}`,
                        });
                      }}
                    >
                      {`{{${tok}}}`}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full min-h-11"
            disabled={createMutation.isPending || !name.trim()}
            onClick={() => {
              const w = Number.parseFloat(widthMm);
              const h = Number.parseFloat(heightMm);
              if (!Number.isFinite(w) || !Number.isFinite(h)) {
                toast.error("Enter valid dimensions in mm.");
                return;
              }
              createMutation.mutate({
                name: name.trim(),
                type,
                widthMm: w,
                heightMm: h,
                fields,
                logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
                isDefault,
              });
            }}
          >
            {createMutation.isPending ? "Saving…" : "Save template"}
          </Button>
        </div>
      </div>
    </div>
  );
}
