import { z } from "zod";

const NonNegativeInt = z.number().int().nonnegative();

const TestSchema = z.object({
  id: z.string(),
  count: NonNegativeInt,
});

type Test = z.infer<typeof TestSchema>;
