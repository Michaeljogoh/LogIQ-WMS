import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  const colKeys = Array.from({ length: columns }, (_, i) => `col-${i}`);
  const rowKeys = Array.from({ length: rows }, (_, i) => `row-${i}`);

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {colKeys.map((k) => (
            <TableHead key={k}>
              <Skeleton className="h-4 w-20 rounded" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rowKeys.map((rk, ri) => (
          <TableRow key={rk} className="hover:bg-transparent">
            {colKeys.map((ck, ci) => (
              <TableCell key={ck}>
                <Skeleton
                  className="h-4 rounded"
                  style={{ width: `${60 + ((ri * ci + ci * 3) % 4) * 20}px` }}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
