export interface Tag {
  id: number;
  name: string;
  group_id: number | null;
  group_name: string | null;
  describes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Conversation {
  id: number;
  user_id: number;
  group_id: null | number;
  customer_id: number;
  auto_flow_id: number;
  auto_flow_name: string;
  status: number;
  source: number;
  source_channel: number;
  response_time: null | number;
  solve_time: null | number;
  score: null | number;
  problem_type: null | string;
  first_message: null | string;
  messages_count: null | number;
  created_at: number;
  updated_at: number;
  remark: null | string;
  country_code: null | string;
  customer_phone: string;
  business_phone: string;
  relate_session_id: string;
  tags: Tag[];
  conv_summary: string;
  call_audio_url: string;
}

export interface ConversationListResponse {
  code: number;
  message: string;
  traceId: string;
  data: {
    code: number;
    message: string | null;
    traceId: string | null;
    total: number;
    page_number: number;
    page_size: number;
    list: Conversation[];
    ext: null | any;
    notEmpty: boolean;
    totalPages: number;
    empty: boolean;
  };
}


export interface Message {
  id: null | number;
  msgId: string;
  conversationId: number;
  customerId: null | number;
  autoFlowId: number;
  direction: number;
  msgType: number | null;
  msgInfo: string | null;
  others: null | any;
  createTs: number;
}

export interface ConversationDetailResponse {
  code: number;
  message: string;
  traceId: string;
  data: Message[];
}

