import { z } from "zod";
import {
  isoTimestamp,
  nonEmptyString,
  branded,
} from "../zod";

/** Post */
export const PostSchema = z.object({
  id: branded("PostId"),
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

export type Post = z.infer<typeof PostSchema>;