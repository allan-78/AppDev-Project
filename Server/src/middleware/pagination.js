export const pagination = (defaultLimit = 10, defaultSort = "createdAt", defaultOrder = "desc") => {
  return (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || defaultLimit));
    const skip = (page - 1) * limit;

    const sortField = req.query.sort || defaultSort;
    const sortOrder = req.query.order === "asc" ? 1 : -1;

    req.pagination = {
      page,
      limit,
      skip,
      sort: { [sortField]: sortOrder }
    };
    next();
  };
};
