import { getModelDetailApiUrl } from '../config/apiConfig';

interface ModelTag {
  name: string;
  tag: string;
  id: string;
  size: string;
  context: string;
  input_type: string;
  updated_at: string;
  url: string;
}

interface ModelDetailData {
  name: string;
  description: string;
  summary: string;
  detail_html: string;
  types: string[];
  sizes: string[];
  pulls: number;
  updated_at: string;
  ollama_cmd: string;
  tags: ModelTag[];
  all_tags: ModelTag[];
  url: string;
  tags_url: string;
}

interface ModelDetailResponse {
  data: ModelDetailData;
  metadata: {
    api_version: string;
    model_name: string;
    fetched_at: string;
  };
}

export const fetchModelDetail = async (modelName: string): Promise<ModelDetailResponse> => {
  const response = await fetch(getModelDetailApiUrl(modelName));

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};
