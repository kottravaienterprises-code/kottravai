export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  budget_range?: string;
  service_interest?: string;
  inquiry?: string;
  source?: string;
  lead_type?: string;
  
  lead_score?: number;
  lead_temperature?: string;
  lead_quality?: string;
  buying_intent?: string;
  estimated_deal_size?: string;
  
  ai_summary?: string;
  ai_reasoning?: string;
  key_insights?: string;
  ai_next_action?: string;
  recommended_action?: string;
  
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiation' | 'won' | 'lost' | 'archived' | 'disqualified' | 'converted';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string;
  next_action?: string;
  
  last_contacted_at?: string;
  next_followup_at?: string;
  created_at: string;
  updated_at: string;
  sales_stage?: string;
  estimated_deal_value?: number;
  conversion_probability?: number;
  forecast_revenue?: number;
  closed_won_at?: string;
  closed_lost_at?: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  activity_description?: string;
  performed_by?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SalesRepresentative {
  id: string;
  name: string;
}

export interface LeadCRMPanelProps {
  lead: Lead;
  onUpdate: () => void;
}
