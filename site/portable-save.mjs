import {validSave} from './engine.mjs?v=birth-timing-20261024';
import {encodeSaveRecord} from './save-codec.mjs?v=birth-timing-20261024';
import {inspectSaveText,SaveTransferError} from './save-transfer.mjs?v=birth-timing-20261024';

/** Prepare a portable file before creating a Blob or download link. The same
 * importer verifies the exact output bytes, expanded size and complete graph.
 * Reading/serializing never changes the life, browser storage or raw backups. */
export function createPortableSaveDownload(life,{settings={paused:true,speed:1},dataVersion}={}){
 if(!validSave(life))throw new SaveTransferError('SAVE_INVALID','유효한 진행 기록을 확인한 뒤 파일로 저장해 주세요.');
 const fileName='koreanlife-story-v2.json',mimeType='application/json';
 const payload={title:'한국인 시뮬레이션',life,settings,...(dataVersion===undefined?{}:{dataVersion})};
 const text=encodeSaveRecord(payload);
 // A download must be accepted by its own file-import path. This also checks
 // small plain JSON for depth, node, unsafe-key and settings constraints.
 const preview=inspectSaveText(text,{fileName,mimeType});
 return{text,fileName,mimeType,bytes:preview.bytes};
}
