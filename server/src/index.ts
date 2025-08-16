import express from "express";
import cors from "cors";
import helmet from "helmet";
import {logger} from "./logger";


const app = express();
app.use(helmet());
app.use(cors({origin: "http://localhost:3000", credentials: true}));
app.get("/api/health", (_, res) => res.json({ok: true, service: "server"}));
app.get("/api/health", (_, res) => {
    logger.info("health-check");
    res.json({ok: true});
});
app.listen(4000, () => console.log("API listening on :4000"));
