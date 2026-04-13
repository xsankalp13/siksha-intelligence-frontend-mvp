import { Home } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeacherMyClassesResponseDto } from "@/services/types/teacher";

type Props = {
  value?: string;
  onChange: (next: string) => void;
  classes: TeacherMyClassesResponseDto[];
};

export default function ClassSelector({ value, onChange, classes }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="Select Class" />
      </SelectTrigger>
      <SelectContent>
        {classes.map((c) => {
          const key = `${c.classUuid}:${c.sectionUuid}`;
          return (
            <SelectItem key={key} value={key}>
              <span className="inline-flex items-center gap-1.5">
                {c.classTeacher ? <Home className="h-3.5 w-3.5" /> : null}
                {c.className}-{c.sectionName}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
