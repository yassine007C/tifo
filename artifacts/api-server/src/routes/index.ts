import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import serversRouter from "./servers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(serversRouter);

export default router;
