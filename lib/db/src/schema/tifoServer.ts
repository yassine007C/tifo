import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tifoServersTable = pgTable("tifo_servers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accessCode: text("access_code").notNull().unique(),
  pixelData: text("pixel_data").notNull(), // JSON array of hex color strings
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  totalPixels: integer("total_pixels").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  creatorId: text("creator_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTifoServerSchema = createInsertSchema(tifoServersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTifoServer = z.infer<typeof insertTifoServerSchema>;
export type TifoServer = typeof tifoServersTable.$inferSelect;
