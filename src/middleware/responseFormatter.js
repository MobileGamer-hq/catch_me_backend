/**
 * Response Formatter Middleware
 * Standardizes all Express JSON responses to include `status: "SUCCESS"` (for 2xx/3xx)
 * or `status: "FAILED"` (for 4xx/5xx).
 */
const responseFormatter = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
    const defaultStatus = isSuccess ? "SUCCESS" : "FAILED";

    let formattedBody;

    if (body === null || body === undefined) {
      formattedBody = { status: defaultStatus };
    } else if (Array.isArray(body)) {
      formattedBody = {
        status: defaultStatus,
        data: body,
      };
    } else if (typeof body === "object") {
      // Remove legacy boolean `success` if present and prioritize standardized status
      const { success, status, ...rest } = body;
      formattedBody = {
        status: status || defaultStatus,
        ...rest,
      };
    } else {
      // Primitives (string, number, boolean)
      if (isSuccess) {
        formattedBody = {
          status: defaultStatus,
          data: body,
        };
      } else {
        formattedBody = {
          status: defaultStatus,
          error: String(body),
        };
      }
    }

    return originalJson(formattedBody);
  };

  next();
};

module.exports = responseFormatter;
