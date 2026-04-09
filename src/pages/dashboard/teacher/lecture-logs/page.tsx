import { motion, useReducedMotion } from "framer-motion";
import LectureLogsTab from "@/features/teacher/components/LectureLogsTab";

export default function TeacherLectureLogsPage() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={reduce ? {} : { opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl pb-10"
    >
      <LectureLogsTab />
    </motion.div>
  );
}
