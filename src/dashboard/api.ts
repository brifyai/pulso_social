import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

// ==================== SURVEYS ====================

export function useSurveys() {
  return useQuery(api['pulso/index'].listSurveys) || [];
}

export function useSurvey(id: string) {
  return useQuery(api['pulso/index'].getSurvey, { id: id as any });
}

export function useCreateSurvey() {
  return useMutation(api['pulso/index'].createSurvey);
}

export function useUpdateSurveyStatus() {
  return useMutation(api['pulso/index'].updateSurveyStatus);
}

export function useDeleteSurvey() {
  return useMutation(api['pulso/index'].deleteSurvey);
}

export function useSurveyResponses(surveyId: string) {
  return useQuery(api['pulso/index'].getSurveyResponses, { surveyId: surveyId as any }) || [];
}

export function useAddSurveyResponse() {
  return useMutation(api['pulso/index'].addSurveyResponse);
}

export function useSurveyStats(surveyId: string) {
  return useQuery(api['pulso/index'].getSurveyStats, { surveyId: surveyId as any });
}

// ==================== PANEL AGENTS ====================

export function usePanelAgents() {
  return useQuery(api['pulso/index'].listPanelAgents) || [];
}

export function usePanelAgent(playerId: string) {
  return useQuery(api['pulso/index'].getPanelAgent, { playerId });
}

export function useCreatePanelAgent() {
  return useMutation(api['pulso/index'].createPanelAgent);
}

export function useUpdatePanelAgent() {
  return useMutation(api['pulso/index'].updatePanelAgent);
}

export function useDeletePanelAgent() {
  return useMutation(api['pulso/index'].deletePanelAgent);
}

export function usePanelAgentsByGSE(gse: string) {
  return useQuery(api['pulso/index'].getPanelAgentsByGSE, { gse }) || [];
}

export function usePanelAgentsByRegion(region: string) {
  return useQuery(api['pulso/index'].getPanelAgentsByRegion, { region }) || [];
}

// ==================== DASHBOARD ====================

export function useDashboardStats() {
  return useQuery(api['pulso/index'].getDashboardStats);
}

// ==================== AGENTES VISUALES (EMBAJADORES) ====================

export function useVisibleAgents(worldId?: string) {
  return useQuery(api['pulso/index'].listVisibleAgents, { worldId }) || [];
}

export function useAllAgents(worldId?: string) {
  return useQuery(api['pulso/index'].listAllAgents, { worldId }) || [];
}

export function useRegionStats(worldId?: string) {
  return useQuery(api['pulso/index'].getRegionStats, { worldId });
}

export function useRegionCenters() {
  return useQuery(api['pulso/index'].getRegionCenters);
}
