// EXPORTS: projectDB, saveProjectToDB, loadProjectFromDB, loadAllProjectsFromDB, deleteProjectFromDB, updateProjectInDB, isIndexedDBAvailable
// IndexedDB 项目存储层（使用 idb 库封装）

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { IProject } from '@/types/project';

interface ProjectDB extends DBSchema {
  projects: {
    key: string;
    value: IProject;
    indexes: { 'by-updatedAt': number };
  };
}

const DB_NAME = 'thingflow-db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

let dbPromise: Promise<IDBPDatabase<ProjectDB>> | null = null;

export function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function getDB(): Promise<IDBPDatabase<ProjectDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ProjectDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by-updatedAt', 'updatedAt');
      },
    });
  }
  return dbPromise;
}

export async function saveProjectToDB(project: IProject): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, project);
}

export async function loadProjectFromDB(id: string): Promise<IProject | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function loadAllProjectsFromDB(): Promise<IProject[]> {
  const db = await getDB();
  const projects = await db.getAllFromIndex(STORE_NAME, 'by-updatedAt');
  // 按更新时间倒序
  return projects.reverse();
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function updateProjectInDB(project: IProject): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, project);
}
