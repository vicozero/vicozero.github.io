// Cloud Functions para Sierra Madre · Seguridad Operativa
// Requiere plan Blaze para desplegar. En plan Spark, usar solo emulador local.
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

initializeApp();

// Validación server-side de una acción correctiva al crearse
exports.validateAction = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  const data = request.data || {};
  if (!data.description || String(data.description).trim().length < 5) {
    throw new HttpsError('invalid-argument', 'La descripción es obligatoria.');
  }
  if (!data.ownerAccountId) {
    throw new HttpsError('invalid-argument', 'El responsable es obligatorio.');
  }
  if (!data.due) {
    throw new HttpsError('invalid-argument', 'La fecha compromiso es obligatoria.');
  }
  const db = getFirestore();
  const ref = await db.collection('actions').add({
    ...data,
    status: 'Registrada',
    progress: 0,
    revision: 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
  });
  // Auditoría
  await db.collection('auditLog').add({
    actorUid: request.auth.uid,
    action: 'create_action',
    target: ref.id,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
});

// Registro de auditoría automático al crear un reporte
exports.auditReportCreate = onDocumentCreated('reports/{reportId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const db = getFirestore();
  await db.collection('auditLog').add({
    actorUid: snap.data().ownerAccountId || 'system',
    action: 'create_report',
    target: event.params.reportId,
    createdAt: FieldValue.serverTimestamp(),
  });
});

// Verificación de salud
exports.health = onCall(async () => ({ ok: true, service: 'sierra-madre-functions', ts: Date.now() }));
