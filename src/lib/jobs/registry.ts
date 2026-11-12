import { greenhouse } from "./adapters/greenhouse";
import { lever } from "./adapters/lever";
import { usajobs } from "./adapters/usajobs";
import { adzuna } from "./adapters/adzuna";
import { employerFeeds } from "./adapters/employer-feed";
import { indeedPartner, linkedinPartner } from "./adapters/partners";
import { demo } from "./adapters/demo";
import { themuse } from "./adapters/themuse";
import { remotive } from "./adapters/remotive";
import type { JobAdapter } from "./types";

/** Add a new source: implement JobAdapter in ./adapters and register it here. */
export const ADAPTERS: JobAdapter[] = [themuse, remotive, greenhouse, lever, usajobs, adzuna, employerFeeds, indeedPartner, linkedinPartner, demo];
export const getAdapter = (id: string) => ADAPTERS.find((a) => a.id === id);
export const DAILY_TARGET = Number(process.env.JOB_DAILY_TARGET ?? 50);
