import apiClient from './client'

export interface NeuronNode {
  id: number
  title: string
  slug: string
  description: string | null
  track: string
  section: string
  difficulty: string
  xp_reward: number
  prerequisites: number[]
  energy_score: number
  status: string
}

export interface NeuralEdge {
  source: number
  target: number
}

export interface NeuralMapData {
  nodes: NeuronNode[]
  edges: NeuralEdge[]
  tracks: TrackOverview[]
}

export interface TrackOverview {
  track: string
  name: string
  description: string
  total_nodes: number
  completed_nodes: number
}

export interface AgentNodeDetail {
  id: number
  title: string
  slug: string
  description: string | null
  content: string | null
  track: string
  section: string
  difficulty: string
  xp_reward: number
  starter_code: string | null
  hint: string | null
  prerequisites: number[]
  energy_score: number
  energy_detail: { understanding: number; implementation: number; optimization: number; creativity: number }
  status: string
  attempts: number
}

export interface AgentSubmitResult {
  status: string
  score: number
  energy_score: number
  energy_detail: { understanding: number; implementation: number; optimization: number; creativity: number }
  stdout: string | null
  stderr: string | null
  ai_analysis: string | null
  xp_earned: number
}

export async function getNeuralMap(): Promise<NeuralMapData> {
  const { data } = await apiClient.get<NeuralMapData>('/agent/map')
  return data
}

export async function getAgentNode(nodeId: number): Promise<AgentNodeDetail> {
  const { data } = await apiClient.get<AgentNodeDetail>(`/agent/nodes/${nodeId}`)
  return data
}

export async function submitAgentCode(nodeId: number, code: string): Promise<AgentSubmitResult> {
  const { data } = await apiClient.post<AgentSubmitResult>(`/agent/nodes/${nodeId}/submit`, { code })
  return data
}

export async function getAgentTracks(): Promise<TrackOverview[]> {
  const { data } = await apiClient.get<TrackOverview[]>('/agent/tracks')
  return data
}
