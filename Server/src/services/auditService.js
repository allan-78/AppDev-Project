import { AuditLog } from "../models/AuditLog.js";

export async function audit(actor, action, entity, entityId, metadata = {}) {
  return AuditLog.create({
    actor: actor?._id,
    action,
    entity,
    entityId: entityId?.toString(),
    metadata,
    community: actor?.community
  });
}
