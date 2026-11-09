import mongoose from "mongoose";

/** Returns true if value is a valid MongoDB ObjectId string. */
export const isId = (v) => mongoose.isValidObjectId(String(v));

/** Returns true if n is an integer in the inclusive range [min, max]. */
export const intBetween = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
