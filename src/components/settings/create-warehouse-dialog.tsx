"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useTRPC } from "@/app/trpc/client";
import { Button } from "@/components/ui/button";
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

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  addressLine1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "ZIP is required"),
});

type FormValues = z.infer<typeof schema>;

export function CreateWarehouseDialog(
  props: Readonly<{ onSuccess?: () => void }>,
) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      code: "",
      addressLine1: "",
      city: "",
      state: "",
      zip: "",
    },
  });

  const createMutation = useMutation(
    trpc.warehouse.create.mutationOptions({
      onSuccess: () => {
        toast.success("Warehouse created");
        form.reset();
        setOpen(false);
        props.onSuccess?.();
      },
      onError: (e) => toast.error(e.message ?? "Could not create warehouse"),
    }),
  );

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>Add warehouse</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add warehouse</DialogTitle>
          <DialogDescription>
            Create a fulfillment site for inventory, orders, and team
            assignments.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            createMutation.mutate(values),
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wh-name">Name</Label>
              <Input
                id="wh-name"
                {...form.register("name")}
                placeholder="Main DC"
              />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-code">Code</Label>
              <Input
                id="wh-code"
                {...form.register("code")}
                placeholder="MAIN"
              />
              {form.formState.errors.code ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.code.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-address">Address</Label>
            <Input
              id="wh-address"
              {...form.register("addressLine1")}
              placeholder="123 Warehouse Blvd"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="wh-city">City</Label>
              <Input id="wh-city" {...form.register("city")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-state">State</Label>
              <Input id="wh-state" {...form.register("state")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-zip">ZIP</Label>
              <Input id="wh-zip" {...form.register("zip")} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={createMutation.isPending} type="submit">
              Create warehouse
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
