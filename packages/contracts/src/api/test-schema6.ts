import { z } from "zod";
import {
  isoTimestamp,
  nonEmptyString,
  branded,
} from "../zod";

const TestSchema = z.object({
  id: branded("TestId"),
  content: nonEmptyString,
  image: z.string().url().nullable().optional(),
  createdAt: isoTimestamp,
  user: z.object({
    _id: branded("UserId"),
    username: nonEmptyString,
    firstName: nonEmptyString,
    lastName: nonEmptyString,
    profilePicture: z.string().url().nullable().optional(),
    verified: z.boolean().default(false),
  }),
  likes: z.array(branded("UserId")),
  comments: z.array(z.object({
    id: branded("CommentId"),
    content: nonEmptyString,
    createdAt: isoTimestamp,
    user: z.object({
      _id: branded("UserId"),
      username: nonEmptyString,
      firstName: nonEmptyString,
      lastName: nonEmptyString,
      profilePicture: z.string().url().nullable().optional(),
      verified: z.boolean().default(false),
    }),
  }).optional()),
  commentCount: z.number().int().nonnegative(),
  reposts: z.array(branded("UserId")),
  repostCount: z.number().int().nonnegative(),
});

type Test = z.infer<typeof TestSchema>;
