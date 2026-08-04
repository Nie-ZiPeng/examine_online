export interface Class {
  id: number;
  name: string;
  grade?: string | null;
  description?: string | null;
  created_at: string;
}

export interface ClassCreate {
  name: string;
  grade?: string;
  description?: string;
}

export interface ClassUpdate {
  name?: string;
  grade?: string;
  description?: string;
}
