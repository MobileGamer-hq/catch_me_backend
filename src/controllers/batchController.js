const BatchService = require("../services/batch.service");

/**
 * Handle batch requests for a single entity type.
 * POST /api/batch/:type  or  POST /api/users/batch, POST /api/posts/batch, etc.
 * Body: { ids: ["id1", "id2", ...] }
 */
const getBatchByType = async (req, res) => {
  try {
    const type = req.params.type || req.body.type;
    const ids = req.body.ids || req.body.items || [];

    if (!type) {
      return res.status(400).json({
        status: "FAILED",
        error: "Missing entity 'type'. Supported: users, posts, events, games",
      });
    }

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        status: "FAILED",
        error: "'ids' must be an array of document IDs",
      });
    }

    const result = await BatchService.fetchBatch(type, ids);

    return res.status(200).json({
      status: "SUCCESS",
      count: result.foundCount,
      data: result.data,
      meta: {
        totalRequested: result.totalRequested,
        cachedCount: result.cachedCount,
        fetchedFromDbCount: result.fetchedFromDbCount,
      },
    });
  } catch (error) {
    console.error("[batchController] getBatchByType error:", error);
    return res.status(500).json({
      status: "FAILED",
      error: error.message || "Failed to batch fetch items",
    });
  }
};

/**
 * Handle universal/multi-collection batch requests.
 * POST /api/batch
 * Body:
 *   Option A: { type: "users", ids: ["id1", "id2"] }
 *   Option B: { users: ["id1", "id2"], posts: ["p1", "p2"], events: ["e1"] }
 */
const getMultiBatch = async (req, res) => {
  try {
    const body = req.body || {};

    // If single type passed in body: { type: "users", ids: [...] }
    if (body.type && Array.isArray(body.ids)) {
      const result = await BatchService.fetchBatch(body.type, body.ids);
      return res.status(200).json({
        status: "SUCCESS",
        count: result.foundCount,
        data: result.data,
        meta: {
          totalRequested: result.totalRequested,
          cachedCount: result.cachedCount,
          fetchedFromDbCount: result.fetchedFromDbCount,
        },
      });
    }

    // Multi-entity batch
    const result = await BatchService.fetchMultiBatch(body);

    return res.status(200).json({
      status: "SUCCESS",
      data: result.data,
      meta: {
        cachedCount: result.cachedCount,
        fetchedFromDbCount: result.fetchedFromDbCount,
      },
    });
  } catch (error) {
    console.error("[batchController] getMultiBatch error:", error);
    return res.status(500).json({
      status: "FAILED",
      error: error.message || "Failed to execute multi-batch fetch",
    });
  }
};

module.exports = {
  getBatchByType,
  getMultiBatch,
};
