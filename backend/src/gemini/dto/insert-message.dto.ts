export class InsertMessageDto {
  message: string;
  userId?: string;
  context?: 'chat' | 'task_creation' | 'clarification';
  partialTask?: any;
}