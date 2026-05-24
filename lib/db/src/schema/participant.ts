import { pgTable, text, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tifoServersTable } from "./tifoServer";

export const participantsTable = pgTable("participants", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => tifoServersTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  pixelNumber: integer("pixel_number").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  color: text("color").notNull(), // hex color e.g. #ff0000
  displayName: text("display_name").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("participants_server_user").on(table.serverId, table.userId),
  unique("participants_server_position").on(table.serverId, table.x, table.y),
]);

export const insertParticipantSchema = createInsertSchema(participantsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participantsTable.$inferSelect;
