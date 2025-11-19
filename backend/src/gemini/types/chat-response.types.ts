// gemini/types/chat-response.types.ts
export interface BaseChatResponse {
  response: string;
}

export interface ClarificationNeededResponse extends BaseChatResponse {
  needs_clarification: true;
  partial_task: any;
  ready_to_create?: false;
}

export interface ReadyToCreateResponse extends BaseChatResponse {
  ready_to_create: true;
  parsed_task: any;
  needs_clarification?: false;
}

export interface TaskCreatedResponse extends BaseChatResponse {
  task_created: true;
  task: any;
  parsed_task: any;
}

export interface RegularChatResponse extends BaseChatResponse {
  needs_clarification?: false;
  ready_to_create?: false;
  task_created?: false;
}

export type ChatResponse = 
  | RegularChatResponse 
  | ClarificationNeededResponse 
  | ReadyToCreateResponse 
  | TaskCreatedResponse;