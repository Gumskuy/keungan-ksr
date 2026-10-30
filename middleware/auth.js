function requireAdmin(req, res, next) {
  if (!req.session.user) {
    if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.path.startsWith('/kas/toggle')) {
      return res.status(401).json({ error: 'Akses ditolak. Anda harus login sebagai admin untuk mengubah data.' });
    }
    return res.redirect('/login');
  }
  next();
}

module.exports = {
  requireLogin: requireAdmin,
  requireAdmin,
};
