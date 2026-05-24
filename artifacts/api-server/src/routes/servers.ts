import { Router, type IRouter } from "express";
import { eq, and, count, sql } from "drizzle-orm";
import { db, tifoServersTable, participantsTable } from "@workspace/db";
import {
  CreateServerBody,
  JoinServerBody,
  GetServerParams,
  DeleteServerParams,
  ActivateServerParams,
  DeactivateServerParams,
  GetServerStatusParams,
  GetServerPixelsParams,
  ListParticipantsParams,
  GetMyAssignmentParams,
  UpdateMyPositionParams,
  UpdateMyPositionBody,
} from "@workspace/api-zod";
import { processImage, generateAccessCode, indexToCoords, coordsToIndex } from "../lib/imageProcessor";

const router: IRouter = Router();

// Helper to build server response with participant count
async function getServerWithCount(id: number) {
  const [server] = await db.select().from(tifoServersTable).where(eq(tifoServersTable.id, id));
  if (!server) return null;

  const [{ value }] = await db
    .select({ value: count() })
    .from(participantsTable)
    .where(eq(participantsTable.serverId, id));

  return {
    id: server.id,
    name: server.name,
    accessCode: server.accessCode,
    width: server.width,
    height: server.height,
    totalPixels: server.totalPixels,
    isActive: server.isActive,
    creatorId: server.creatorId,
    participantCount: Number(value),
    createdAt: server.createdAt.toISOString(),
  };
}

// GET /servers — list servers the user created or joined
router.get("/servers", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user.id;

  // Servers user created
  const created = await db.select().from(tifoServersTable).where(eq(tifoServersTable.creatorId, userId));

  // Servers user joined (as participant)
  const joined = await db
    .select({ serverId: participantsTable.serverId })
    .from(participantsTable)
    .where(eq(participantsTable.userId, userId));
  const joinedIds = joined.map((j) => j.serverId).filter((id) => !created.find((s) => s.id === id));

  const allServerIds = [
    ...created.map((s) => s.id),
    ...joinedIds,
  ];

  const results = await Promise.all(allServerIds.map((id) => getServerWithCount(id)));
  res.json(results.filter(Boolean));
});

// POST /servers — create a new Tifo server
router.post("/servers", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateServerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, imageData, targetWidth = 50, targetHeight = 30 } = parsed.data;

  let processed;
  try {
    processed = await processImage(imageData, targetWidth, targetHeight);
  } catch (err) {
    req.log.error({ err }, "Failed to process image");
    res.status(400).json({ error: "Failed to process image. Please upload a valid JPEG or PNG." });
    return;
  }

  // Generate a unique access code
  let accessCode = generateAccessCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db.select().from(tifoServersTable).where(eq(tifoServersTable.accessCode, accessCode));
    if (existing.length === 0) break;
    accessCode = generateAccessCode();
    attempts++;
  }

  const [server] = await db
    .insert(tifoServersTable)
    .values({
      name,
      accessCode,
      pixelData: JSON.stringify(processed.pixels),
      width: processed.width,
      height: processed.height,
      totalPixels: processed.width * processed.height,
      isActive: false,
      creatorId: req.user.id,
    })
    .returning();

  // Auto-join creator as participant at pixel 0
  const firstPixel = processed.pixels[0] ?? "#000000";
  await db.insert(participantsTable).values({
    serverId: server.id,
    userId: req.user.id,
    pixelNumber: 0,
    x: 0,
    y: 0,
    color: firstPixel,
    displayName: req.user.firstName ?? req.user.email ?? "Creator",
  });

  const result = await getServerWithCount(server.id);
  res.status(201).json(result);
});

// POST /servers/join — join a server with access code
router.post("/servers/join", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = JoinServerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { accessCode } = parsed.data;
  const [server] = await db
    .select()
    .from(tifoServersTable)
    .where(eq(tifoServersTable.accessCode, accessCode.toUpperCase().trim()));

  if (!server) {
    res.status(404).json({ error: "No server found with that access code." });
    return;
  }

  // Check if already a participant
  const existing = await db
    .select()
    .from(participantsTable)
    .where(and(eq(participantsTable.serverId, server.id), eq(participantsTable.userId, req.user.id)));

  if (existing.length > 0) {
    // Already joined — return existing assignment
    const s = await getServerWithCount(server.id);
    res.json({
      server: s,
      assignment: {
        id: existing[0].id,
        serverId: existing[0].serverId,
        userId: existing[0].userId,
        pixelNumber: existing[0].pixelNumber,
        x: existing[0].x,
        y: existing[0].y,
        color: existing[0].color,
        displayName: existing[0].displayName,
      },
    });
    return;
  }

  const pixels: string[] = JSON.parse(server.pixelData);

  // Find next free pixel
  const taken = await db
    .select({ pixelNumber: participantsTable.pixelNumber })
    .from(participantsTable)
    .where(eq(participantsTable.serverId, server.id));
  const takenSet = new Set(taken.map((t) => t.pixelNumber));

  let nextPixel = 0;
  while (nextPixel < server.totalPixels && takenSet.has(nextPixel)) {
    nextPixel++;
  }

  if (nextPixel >= server.totalPixels) {
    res.status(400).json({ error: "This Tifo server is full — all pixels are taken." });
    return;
  }

  const { x, y } = indexToCoords(nextPixel, server.width);
  const color = pixels[nextPixel] ?? "#000000";

  const [participant] = await db
    .insert(participantsTable)
    .values({
      serverId: server.id,
      userId: req.user.id,
      pixelNumber: nextPixel,
      x,
      y,
      color,
      displayName: req.user.firstName ?? req.user.email ?? "Fan",
    })
    .returning();

  const s = await getServerWithCount(server.id);
  res.json({
    server: s,
    assignment: {
      id: participant.id,
      serverId: participant.serverId,
      userId: participant.userId,
      pixelNumber: participant.pixelNumber,
      x: participant.x,
      y: participant.y,
      color: participant.color,
      displayName: participant.displayName,
    },
  });
});

// GET /servers/:serverId — get server details
router.get("/servers/:serverId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetServerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getServerWithCount(params.data.serverId);
  if (!result) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  res.json(result);
});

// DELETE /servers/:serverId — delete server (creator only)
router.delete("/servers/:serverId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = DeleteServerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [server] = await db.select().from(tifoServersTable).where(eq(tifoServersTable.id, params.data.serverId));
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  if (server.creatorId !== req.user.id) {
    res.status(403).json({ error: "Only the creator can delete this server" });
    return;
  }

  await db.delete(tifoServersTable).where(eq(tifoServersTable.id, params.data.serverId));
  res.sendStatus(204);
});

// POST /servers/:serverId/activate
router.post("/servers/:serverId/activate", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = ActivateServerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [server] = await db.select().from(tifoServersTable).where(eq(tifoServersTable.id, params.data.serverId));
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  if (server.creatorId !== req.user.id) {
    res.status(403).json({ error: "Only the creator can activate the display" });
    return;
  }

  await db.update(tifoServersTable).set({ isActive: true }).where(eq(tifoServersTable.id, params.data.serverId));
  const result = await getServerWithCount(params.data.serverId);
  res.json(result);
});

// POST /servers/:serverId/deactivate
router.post("/servers/:serverId/deactivate", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = DeactivateServerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [server] = await db.select().from(tifoServersTable).where(eq(tifoServersTable.id, params.data.serverId));
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  if (server.creatorId !== req.user.id) {
    res.status(403).json({ error: "Only the creator can deactivate the display" });
    return;
  }

  await db.update(tifoServersTable).set({ isActive: false }).where(eq(tifoServersTable.id, params.data.serverId));
  const result = await getServerWithCount(params.data.serverId);
  res.json(result);
});

// GET /servers/:serverId/pixels — return full pixel color array
router.get("/servers/:serverId/pixels", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetServerPixelsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [server] = await db.select().from(tifoServersTable).where(eq(tifoServersTable.id, params.data.serverId));
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  const pixels: string[] = JSON.parse(server.pixelData);
  res.json({ pixels, width: server.width, height: server.height });
});

// GET /servers/:serverId/status — poll for activation + your color
router.get("/servers/:serverId/status", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetServerStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [server] = await db.select().from(tifoServersTable).where(eq(tifoServersTable.id, params.data.serverId));
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  let myColor: string | null = null;
  if (server.isActive) {
    const [participant] = await db
      .select()
      .from(participantsTable)
      .where(and(eq(participantsTable.serverId, params.data.serverId), eq(participantsTable.userId, req.user.id)));
    myColor = participant?.color ?? null;
  }

  res.json({ serverId: server.id, isActive: server.isActive, myColor });
});

// GET /servers/:serverId/participants
router.get("/servers/:serverId/participants", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = ListParticipantsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const participants = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.serverId, params.data.serverId));

  res.json(participants.map((p) => ({
    id: p.id,
    serverId: p.serverId,
    userId: p.userId,
    pixelNumber: p.pixelNumber,
    x: p.x,
    y: p.y,
    color: p.color,
    displayName: p.displayName,
  })));
});

// GET /servers/:serverId/my-assignment
router.get("/servers/:serverId/my-assignment", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetMyAssignmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(and(eq(participantsTable.serverId, params.data.serverId), eq(participantsTable.userId, req.user.id)));

  if (!participant) {
    res.status(404).json({ error: "You are not a participant in this server" });
    return;
  }

  res.json({
    id: participant.id,
    serverId: participant.serverId,
    userId: participant.userId,
    pixelNumber: participant.pixelNumber,
    x: participant.x,
    y: participant.y,
    color: participant.color,
    displayName: participant.displayName,
  });
});

// PATCH /servers/:serverId/my-position — manually pick X/Y
router.patch("/servers/:serverId/my-position", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdateMyPositionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateMyPositionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { x, y } = body.data;

  const [server] = await db.select().from(tifoServersTable).where(eq(tifoServersTable.id, params.data.serverId));
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  if (x < 0 || x >= server.width || y < 0 || y >= server.height) {
    res.status(400).json({ error: `Coordinates out of bounds. Valid range: x 0–${server.width - 1}, y 0–${server.height - 1}` });
    return;
  }

  const [myParticipant] = await db
    .select()
    .from(participantsTable)
    .where(and(eq(participantsTable.serverId, params.data.serverId), eq(participantsTable.userId, req.user.id)));

  if (!myParticipant) {
    res.status(404).json({ error: "You are not a participant in this server" });
    return;
  }

  // Check if target position is taken by someone else
  const [taken] = await db
    .select()
    .from(participantsTable)
    .where(and(
      eq(participantsTable.serverId, params.data.serverId),
      eq(participantsTable.x, x),
      eq(participantsTable.y, y),
    ));

  if (taken && taken.userId !== req.user.id) {
    res.status(400).json({ error: "That position is already taken by another participant." });
    return;
  }

  const pixels: string[] = JSON.parse(server.pixelData);
  const newPixelNumber = coordsToIndex(x, y, server.width);
  const newColor = pixels[newPixelNumber] ?? "#000000";

  const [updated] = await db
    .update(participantsTable)
    .set({ x, y, pixelNumber: newPixelNumber, color: newColor })
    .where(eq(participantsTable.id, myParticipant.id))
    .returning();

  res.json({
    id: updated.id,
    serverId: updated.serverId,
    userId: updated.userId,
    pixelNumber: updated.pixelNumber,
    x: updated.x,
    y: updated.y,
    color: updated.color,
    displayName: updated.displayName,
  });
});

export default router;
