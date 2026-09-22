import prisma from "../config/prisma.js";

const SENSITIVE_ACTIONS = [
  "user.delete",
  "user.change_password",
  "user.update_profile",
  "class.create",
  "class.close",
  "class.archive",
  "grade.create",
  "grade.update",
  "grade.bulk_create",
  "assessment.create",
  "assessment.delete",
  "enrollment.join",
  "enrollment.remove",
  "attendance.bulk_update",
  "auth.login_failed",
];

export function auditLog(action) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const metadata = {};

        if (req.params.classId) metadata.classId = req.params.classId;
        if (req.params.id) metadata.targetId = req.params.id;
        if (req.params.enrollmentId) metadata.enrollmentId = req.params.enrollmentId;
        if (req.params.sessionId) metadata.sessionId = req.params.sessionId;
        if (req.params.userId) metadata.targetUserId = req.params.userId;

        if (body && typeof body === "object") {
          if (body.message) metadata.responseMessage = body.message;
          if (body.count) metadata.count = body.count;
        }

        prisma.auditLog.create({
          data: {
            action,
            userId: req.user?.id || null,
            classId: req.params.classId || null,
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
          },
        }).catch((err) => {
          console.error("AuditLog write failed:", action, err?.message || err);
        });
      }

      return originalJson(body);
    };

    next();
  };
}

export { SENSITIVE_ACTIONS };
