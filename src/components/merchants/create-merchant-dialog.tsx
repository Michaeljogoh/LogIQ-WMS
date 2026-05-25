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
  name: z.string().min(1, "Merchant name is required"),
  email: z.string().email("Valid email required"),
});

type FormValues = z.infer<typeof schema>;

export function CreateMerchantDialog(
  props: Readonly<{ onSuccess?: () => void }>,
) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
  });

  const createMutation = useMutation(
    trpc.merchant.create.mutationOptions({
      onSuccess: () => {
        toast.success(
          "Merchant created. The owner will receive sign-in instructions by email.",
        );
        form.reset();
        setOpen(false);
        props.onSuccess?.();
      },
      onError: (e) => toast.error(e.message ?? "Could not create merchant"),
    }),
  );

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>Add merchant</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add merchant</DialogTitle>
          <DialogDescription>
            Creates the merchant account and invites the owner with a temporary
            password. They sign in at the shared login page.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            createMutation.mutate(values),
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="merchant-name">Business name</Label>
            <Input
              id="merchant-name"
              {...form.register("name")}
              placeholder="Acme Retail"
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="merchant-email">Owner email</Label>
            <Input
              id="merchant-email"
              type="email"
              {...form.register("email")}
              placeholder="owner@acme.com"
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            ) : null}
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
              Create & invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
