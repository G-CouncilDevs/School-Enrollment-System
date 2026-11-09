/**
 * Express centralized error handler.
 * Register last in server.js: app.use(errorHandler)
 * Handlers call next(err) to reach this.
 */
export function errorHandler(err, req, res, _next) {
    const status = err.status ?? (err.name === "ValidationError" || err.name === "CastError" ? 400 : 500);
    console.error(`[${req?.method ?? "ERROR"} ${req?.url ?? ""}] ${err.message}`);
    res.status(status).json({ error: err.message ?? "Internal server error" });
}

/**
 * Forward error to Express next() if available, otherwise write JSON error response directly.
 */
export function handleErr(err, res, next) {
    if (typeof next === "function") {
        return next(err);
    }
    const status = err.status ?? (err.name === "ValidationError" || err.name === "CastError" ? 400 : 500);
    return res.status(status).json({ error: err.message ?? "Internal server error" });
}
