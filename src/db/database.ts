import Dexie, { type Table } from 'dexie';
import type { StudyData } from '../domain/models';
import { ensure, integer, validateStudyData } from '../data/validation';
import { parseBackup } from '../domain/backup';
export { makeBackup, parseBackup, resetSubject } from '../domain/backup';

interface Document { key: string; data: StudyData; revision: number }
export class StudyDatabase extends Dexie {
  documents!: Table<Document, string>;
  constructor(name = 'mln122-study-web') {
    super(name);
    this.version(1).stores({documents:'key'});
    this.version(2).stores({documents:'key'}).upgrade(tx => tx.table('documents').toCollection().modify(doc => { doc.revision ??= 0; }));
  }
}
export class Repository {
  constructor(public db = new StudyDatabase()) {}
  async read() {
    const doc = await this.db.documents.get('study');
    if(doc) { validateStudyData(doc.data); ensure(integer(doc.revision), 'Revision lưu trữ không hợp lệ. Không tự ghi đè dữ liệu.'); }
    return doc;
  }
  async write(data: StudyData, expectedRevision: number) {
    validateStudyData(data);
    return this.db.transaction('rw',this.db.documents,async()=>{
      const previous=await this.db.documents.get('study');
      ensure((previous?.revision ?? 0) === expectedRevision, 'Một tab khác đã lưu dữ liệu mới. Hãy tải lại trang trước khi tiếp tục.');
      const revision=expectedRevision+1;
      await this.db.documents.put({key:'study',data,revision});
      return revision;
    });
  }
  async restore(source: string, expectedRevision: number) {
    const backup=parseBackup(source);
    const revision=await this.write(backup.data,expectedRevision);
    return {data:backup.data,revision};
  }
}
