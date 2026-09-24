const COLLECTION = "kd_dashboard";
const DOCUMENT = "singleton";

function createRepository(app) {
  const collection = app.database().collection(COLLECTION);
  return {
    async get() {
      const result = await collection.doc(DOCUMENT).get();
      return result.data?.[0] || null;
    },
    async create(data) {
      await collection.doc(DOCUMENT).set(data);
      return data;
    },
    async update(data) {
      await collection.doc(DOCUMENT).update(data);
      return data;
    },
    async uploadSnapshot(buffer, version, previousFileId) {
      const cloudPath = `kd_snapshots/dashboard-${version}.png`;
      const uploaded = await app.uploadFile({ cloudPath, fileContent: buffer });
      if (previousFileId && previousFileId !== uploaded.fileID) {
        await app.deleteFile({ fileList: [previousFileId] }).catch(() => undefined);
      }
      return uploaded.fileID;
    },
    async getSnapshotUrl(fileID) {
      const result = await app.getTempFileURL({ fileList: [fileID] });
      const item = result.fileList?.[0];
      if (!item || item.code && item.code !== "SUCCESS") throw new Error("快照暂时不可用");
      return item.tempFileURL;
    },
  };
}

module.exports = { createRepository, COLLECTION, DOCUMENT };
