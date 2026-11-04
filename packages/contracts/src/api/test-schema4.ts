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
  user: z.object({
    _id: branded("UserId"),
    username: nonEmptyString,
    firstName: nonEmptyString,
    lastName: nonEmptyString,
  }),
  comments: z.array(z.object({
    id: branded("CommentId"),
    content: nonEmptyString,
    createdAt: isoTimestamp,
    user: z.object({
      _id: branded("UserId"),
      username: nonEmptyString,
      firstName: nonEmptyString,
      lastName: nonEmptyString,
    }),
  }).optional()),
  count: z.number().int().nonnegative(),
});

type Test = z.infer<typeof TestSchema>;
