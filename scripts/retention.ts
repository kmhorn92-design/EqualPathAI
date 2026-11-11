import { enforceRetention } from "../src/lib/retention";
import { pool } from "../src/db";
enforceRetention().then((r) => console.log(r)).finally(() => pool.end());
