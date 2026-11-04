import { z } from "zod";
import {
  isoTimestamp,
  nonEmptyString,
  branded,
} from "../zod";

const TestSchema = z.object({
  id: branded("TestId"),
  content: nonEmptyString,
  createdAt: isoTimestamp,
  count: z.number().int().nonnegative(),
});

type Test = z.infer<typeof TestSchema>;
