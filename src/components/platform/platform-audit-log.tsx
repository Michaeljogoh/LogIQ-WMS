"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTRPC } from "@/app/trpc/client";
import {
  AUDIT_EVENT_SOURCES,
  AUDIT_ROLE_LABELS,
  AUDIT_ROLE_OPTIONS,
} from "@/lib/audit";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 50;

const SOURCE_LABELS: Record<(typeof AUDIT_EVENT_SOURCES)[number], string> = {
  TRPC: "API",
  SUPPORT: "Support",
  AUTH: "Auth",
  SYSTEM: "System",
};

function formatActionLabel(action: string): string {
  return action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PlatformAuditLog() {
  const trpc = useTRPC();
  const [page, setPage] = useState(0);
  const [accountId, setAccountId] = useState<string>("all");
  const [systemRole, setSystemRole] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const accountsQuery = useQuery(
    trpc.platformAudit.listAccountsForFilter.queryOptions(),
  );
  const actionsQuery = useQuery(trpc.platformAudit.listActions.queryOptions());
  const roleCountsQuery = useQuery(
    trpc.platformAudit.listRoleCounts.queryOptions(),
  );

  const filters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      accountId: accountId === "all" ? undefined : accountId,
      systemRole:
        systemRole === "all"
          ? undefined
          : (systemRole as (typeof AUDIT_ROLE_OPTIONS)[number]["value"]),
      source:
        source === "all"
          ? undefined
          : (source as (typeof AUDIT_EVENT_SOURCES)[number]),
      action: action === "all" ? undefined : action,
      search: debouncedSearch.trim() || undefined,
    }),
    [page, accountId, systemRole, source, action, debouncedSearch],
  );

  const logsQuery = useQuery(trpc.platformAudit.listEvents.queryOptions(filters));

  const data = logsQuery.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  function resetFilters() {
    setAccountId("all");
    setSystemRole("all");
    setSource("all");
    setAction("all");
    setSearch("");
    setPage(0);
  }

  return (
    <div className="space-y-4">
      {roleCountsQuery.data && roleCountsQuery.data.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {roleCountsQuery.data.map((row) => (
            <Badge
              className="cursor-pointer"
              key={row.systemRole ?? "unknown"}
              onClick={() => {
                if (row.systemRole) {
                  setSystemRole(row.systemRole);
                  setPage(0);
                }
              }}
              variant={
                systemRole === row.systemRole ? "default" : "secondary"
              }
            >
              {row.systemRoleLabel}: {row.count}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label htmlFor="audit-search">Search</Label>
          <Input
            id="audit-search"
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Action, path, user, reason…"
            value={search}
          />
        </div>
        <div className="min-w-[160px] space-y-1">
          <Label>Role</Label>
          <Select
            onValueChange={(v) => {
              setSystemRole(v);
              setPage(0);
            }}
            value={systemRole}
          >
            <SelectTrigger>
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {AUDIT_ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[140px] space-y-1">
          <Label>Source</Label>
          <Select
            onValueChange={(v) => {
              setSource(v);
              setPage(0);
            }}
            value={source}
          >
            <SelectTrigger>
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {AUDIT_EVENT_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px] space-y-1">
          <Label>Tenant</Label>
          <Select
            onValueChange={(v) => {
              setAccountId(v);
              setPage(0);
            }}
            value={accountId}
          >
            <SelectTrigger>
              <SelectValue placeholder="All tenants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {(accountsQuery.data ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px] space-y-1">
          <Label>Action</Label>
          <Select
            onValueChange={(v) => {
              setAction(v);
              setPage(0);
            }}
            value={action}
          >
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {(actionsQuery.data ?? []).map((a) => (
                <SelectItem key={a} value={a}>
                  {formatActionLabel(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={resetFilters} type="button" variant="outline">
          Clear filters
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          {logsQuery.isLoading
            ? "Loading…"
            : `${data?.total ?? 0} log ${data?.total === 1 ? "entry" : "entries"}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            disabled={page <= 0 || logsQuery.isLoading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            size="sm"
            type="button"
            variant="outline"
          >
            Previous
          </Button>
          <span className="tabular-nums">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            disabled={
              logsQuery.isLoading ||
              !data ||
              (page + 1) * PAGE_SIZE >= data.total
            }
            onClick={() => setPage((p) => p + 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            Next
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsQuery.isLoading ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={7}>
                  Loading audit log…
                </TableCell>
              </TableRow>
            ) : null}
            {(data?.items ?? []).map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {log.systemRole ? (
                    <Badge variant="outline">
                      {log.systemRoleLabel ??
                        AUDIT_ROLE_LABELS[log.systemRole]}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">
                      {log.actorName ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.actorEmail ?? log.actorUserId ?? "—"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge className="font-mono text-xs" variant="secondary">
                      {log.action}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {SOURCE_LABELS[log.source]}
                      {log.procedurePath ? ` · ${log.procedurePath}` : ""}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>
                    {log.accountName ? (
                      <p>{log.accountName}</p>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                    {log.merchantName ? (
                      <p className="text-xs text-muted-foreground">
                        {log.merchantName}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                  {log.reason ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {log.ipAddress ?? "—"}
                </TableCell>
              </TableRow>
            ))}
            {!logsQuery.isLoading && (data?.items.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell
                  className="text-center text-sm text-muted-foreground"
                  colSpan={7}
                >
                  No audit entries match your filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
