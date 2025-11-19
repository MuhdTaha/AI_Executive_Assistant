export class TaskCreationDto {
  title: string;
  notes?: string;
  due_date?: string; // YYYY-MM-DD
  priority?: 'low' | 'med' | 'high';
  est_minutes?: number;
  clarification_needed?: boolean;
  clarification_question?: string;
}