import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project } from '../types';

const PROJECTS_KEY = 'recut_projects';

export async function saveProject(project: Project): Promise<void> {
  const existing = await loadProjects();
  const idx = existing.findIndex(p => p.id === project.id);
  if (idx >= 0) existing[idx] = project;
  else existing.unshift(project);
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(existing));
}

export async function loadProjects(): Promise<Project[]> {
  const raw = await AsyncStorage.getItem(PROJECTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteProject(id: string): Promise<void> {
  const existing = await loadProjects();
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(existing.filter(p => p.id !== id)));
}
