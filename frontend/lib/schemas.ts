import { z } from "zod";

export const sessionCreateResponseSchema = z.object({
  data: z.object({
    session_id: z.string().startsWith("sess_"),
    status: z.enum(["active", "completed", "expired"]),
    created_at: z.string()
  }),
  meta: z.object({
    fallback_used: z.boolean()
  }).default({ fallback_used: false })
});

export type SessionCreateResponse = z.infer<typeof sessionCreateResponseSchema>;
