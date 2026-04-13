import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlus2, UserX2 } from 'lucide-react';
import type { ClassTeacherMappingRow } from '../types';

interface ClassTeacherMappingTableProps {
  rows: ClassTeacherMappingRow[];
  onAssign: (row: ClassTeacherMappingRow) => void;
  onRemove: (row: ClassTeacherMappingRow) => void;
  isRemoving: boolean;
}

export function ClassTeacherMappingTable({
  rows,
  onAssign,
  onRemove,
  isRemoving,
}: ClassTeacherMappingTableProps) {
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class</TableHead>
            <TableHead>Section</TableHead>
            <TableHead>Class Teacher</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                No sections match the applied filters.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.sectionId}>
                <TableCell className="font-medium">{row.className}</TableCell>
                <TableCell>{row.sectionName}</TableCell>
                <TableCell>
                  {row.classTeacherName ? (
                    <Badge variant="secondary">{row.classTeacherName}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => onAssign(row)}
                    >
                      <UserPlus2 className="w-3.5 h-3.5" />
                      {row.classTeacherUuid ? 'Change' : 'Assign'}
                    </Button>
                    {row.classTeacherUuid ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => onRemove(row)}
                        disabled={isRemoving}
                      >
                        <UserX2 className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
