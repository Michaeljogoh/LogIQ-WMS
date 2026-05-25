"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email(),
    systemRole: z.enum(["WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"]),
    warehouseIds: z.array(z.string()).min(1, "Select at least one warehouse"),
    pick: z.boolean(),
    pack: z.boolean(),
    receive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      data.systemRole === "WAREHOUSE_STAFF" &&
      !data.pick &&
      !data.pack &&
      !data.receive
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one permission.",
        path: ["pick"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function FieldGroup({
  label,
  error,
  children,
}: Readonly<{
  label: string;
  error?: string;
  children: import("react").ReactNode;
}>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function InviteTeamMemberForm(props: Readonly<{ onSuccess?: () => void }>) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const warehousesQuery = useQuery(trpc.warehouse.list.queryOptions());

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      systemRole: "WAREHOUSE_STAFF",
      warehouseIds: [],
      pick: true,
      pack: true,
      receive: false,
    },
  });

  const systemRole = form.watch("systemRole");
  const selectedWarehouses = form.watch("warehouseIds");

  const inviteMutation = useMutation(
    trpc.accountUser.invite.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation sent with login details.");
        form.reset();
        setOpen(false);
        props.onSuccess?.();
      },
      onError: (e) => toast.error(e.message ?? "Could not send invitation"),
    }),
  );

  function toggleWarehouse(id: string, checked: boolean) {
    const current = form.getValues("warehouseIds");
    if (checked) {
      form.setValue("warehouseIds", [...current, id], { shouldValidate: true });
    } else {
      form.setValue(
        "warehouseIds",
        current.filter((w) => w !== id),
        { shouldValidate: true },
      );
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>Invite team member</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Assign a role and warehouse access. We will email a temporary password
            and sign-in instructions.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            const permissions: ("PICK" | "PACK" | "RECEIVE")[] = [];
            if (values.pick) permissions.push("PICK");
            if (values.pack) permissions.push("PACK");
            if (values.receive) permissions.push("RECEIVE");
            inviteMutation.mutate({
              name: values.name,
              email: values.email,
              systemRole: values.systemRole,
              warehouseIds: values.warehouseIds,
              permissions,
            });
          })}
        >
          <FieldGroup error={form.formState.errors.name?.message} label="Full name">
            <Input id="invite-name" {...form.register("name")} placeholder="Jane Smith" />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.email?.message} label="Work email">
            <Input
              autoComplete="off"
              id="invite-email"
              type="email"
              {...form.register("email")}
              placeholder="jane@company.com"
            />
          </FieldGroup>
          <FieldGroup label="Role">
            <Select
              onValueChange={(v) =>
                form.setValue("systemRole", v as FormValues["systemRole"], {
                  shouldValidate: true,
                })
              }
              value={systemRole}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WAREHOUSE_MANAGER">Warehouse Manager</SelectItem>
                <SelectItem value="WAREHOUSE_STAFF">Warehouse Staff</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup
            error={form.formState.errors.warehouseIds?.message}
            label="Warehouses"
          >
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
              {warehousesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading warehouses…</p>
              ) : null}
              {warehousesQuery.data?.map((w) => {
                const checked = selectedWarehouses.includes(w.id);
                return (
                  <label
                    className="flex cursor-pointer items-center gap-2 text-sm"
                    htmlFor={`wh-${w.id}`}
                    key={w.id}
                  >
                    <Checkbox
                      checked={checked}
                      id={`wh-${w.id}`}
                      onCheckedChange={(c) => toggleWarehouse(w.id, c === true)}
                    />
                    <span>
                      {w.name}{" "}
                      <span className="text-muted-foreground">({w.code})</span>
                    </span>
                  </label>
                );
              })}
              {warehousesQuery.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create a warehouse in Settings before inviting staff.
                </p>
              ) : null}
            </div>
          </FieldGroup>
          {systemRole === "WAREHOUSE_STAFF" ? (
            <FieldGroup
              error={form.formState.errors.pick?.message}
              label="Permissions"
            >
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.watch("pick")}
                    onCheckedChange={(c) =>
                      form.setValue("pick", c === true, { shouldValidate: true })
                    }
                  />
                  Pick
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.watch("pack")}
                    onCheckedChange={(c) =>
                      form.setValue("pack", c === true, { shouldValidate: true })
                    }
                  />
                  Pack
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.watch("receive")}
                    onCheckedChange={(c) =>
                      form.setValue("receive", c === true, { shouldValidate: true })
                    }
                  />
                  Receive
                </label>
              </div>
            </FieldGroup>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={inviteMutation.isPending} type="submit">
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
