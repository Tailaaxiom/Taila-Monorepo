export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string | null
          activity_type: string | null
          beneficiaries: number | null
          created_at: string
          created_by_code: string | null
          id: number
          impact_score: number | null
          location: string | null
          org_id: string
          programme_id: number | null
          title: string
        }
        Insert: {
          activity_date?: string | null
          activity_type?: string | null
          beneficiaries?: number | null
          created_at?: string
          created_by_code?: string | null
          id?: never
          impact_score?: number | null
          location?: string | null
          org_id: string
          programme_id?: number | null
          title: string
        }
        Update: {
          activity_date?: string | null
          activity_type?: string | null
          beneficiaries?: number | null
          created_at?: string
          created_by_code?: string | null
          id?: never
          impact_score?: number | null
          location?: string | null
          org_id?: string
          programme_id?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_programme_fk"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      // PROVISIONAL — activity_events does not exist in the live schema yet.
      // 0011_activity_events.sql is written but not run (no Supabase
      // credentials in this session, same situation as appointments and
      // summary_reports before it — see docs/EXECUTION.md). Built by
      // comparing against messages, a structurally similar existing table
      // (denormalized actor, immutable, no update policy). Column names
      // (user_code/user_name/role) were chosen to match a pre-existing
      // consumer, packages/core/src/kpi/sessions.ts — see the migration's
      // own comment. Replace wholesale once the migration is run and types
      // are regenerated for real — do not merge alongside the real shape.
      activity_events: {
        Row: {
          created_at: string
          department: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          org_id: string
          role: string | null
          summary: string
          user_code: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          org_id: string
          role?: string | null
          summary: string
          user_code?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          role?: string | null
          summary?: string
          user_code?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          attendees: string[]
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          org_id: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          org_id: string
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          org_id?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      // PROVISIONAL — approvals does not exist in the live schema yet.
      // 0012_approvals.sql is written but not run (no Supabase credentials
      // in this session — see docs/EXECUTION.md). Built by comparing
      // against summary_reports (a structurally similar existing table:
      // denormalized author, department, status enum, touch/freeze
      // triggers). Replace wholesale once the migration is run and types
      // are regenerated for real — do not merge alongside the real shape.
      approvals: {
        Row: {
          created_at: string
          department: string | null
          id: string
          note: string | null
          org_id: string
          req_items: string | null
          request_type: string
          requester_code: string
          requester_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          note?: string | null
          org_id: string
          req_items?: string | null
          request_type: string
          requester_code: string
          requester_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          note?: string | null
          org_id?: string
          req_items?: string | null
          request_type?: string
          requester_code?: string
          requester_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_setup_tokens: {
        Row: {
          attempts: number
          consumed_at: string | null
          created_at: string
          employee_id: string
          expires_at: string
          id: string
          issued_by: string | null
          org_id: string
          token_hash: string
        }
        Insert: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          employee_id: string
          expires_at: string
          id?: string
          issued_by?: string | null
          org_id: string
          token_hash: string
        }
        Update: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          employee_id?: string
          expires_at?: string
          id?: string
          issued_by?: string | null
          org_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_setup_tokens_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_setup_tokens_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_setup_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      // basic_salary, housing_allowance, transport_allowance,
      // other_allowances, annual_rent, nhf_opt_in are PROVISIONAL —
      // 0013_payroll_fields.sql is written but not run (no Supabase
      // credentials in this session — see docs/EXECUTION.md). The other
      // columns below are real, confirmed generated types. Replace the six
      // new columns wholesale once the migration is run and types are
      // regenerated for real.
      employees: {
        Row: {
          active: boolean
          annual_rent: number | null
          auth_user_id: string | null
          basic_salary: number | null
          can_schedule: boolean
          created_at: string
          department: string | null
          email: string | null
          employee_code: string
          extra_fields: Json | null
          extra_pages: string[]
          extra_roles: string[]
          full_name: string
          hourly_rate: number | null
          housing_allowance: number | null
          hub: string | null
          id: string
          job_role: string | null
          job_title: string | null
          last_login: string | null
          login_mode: string
          nhf_opt_in: boolean
          org_id: string
          other_allowances: number | null
          password_set_at: string | null
          phone: string | null
          role: string
          terms_accepted_at: string | null
          terms_accepted_version: string | null
          transport_allowance: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          annual_rent?: number | null
          auth_user_id?: string | null
          basic_salary?: number | null
          can_schedule?: boolean
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code: string
          extra_fields?: Json | null
          extra_pages?: string[]
          extra_roles?: string[]
          full_name: string
          hourly_rate?: number | null
          housing_allowance?: number | null
          hub?: string | null
          id?: string
          job_role?: string | null
          job_title?: string | null
          last_login?: string | null
          login_mode?: string
          nhf_opt_in?: boolean
          org_id: string
          other_allowances?: number | null
          password_set_at?: string | null
          phone?: string | null
          role: string
          terms_accepted_at?: string | null
          terms_accepted_version?: string | null
          transport_allowance?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          annual_rent?: number | null
          auth_user_id?: string | null
          basic_salary?: number | null
          can_schedule?: boolean
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code?: string
          extra_fields?: Json | null
          extra_pages?: string[]
          extra_roles?: string[]
          full_name?: string
          hourly_rate?: number | null
          housing_allowance?: number | null
          hub?: string | null
          id?: string
          job_role?: string | null
          job_title?: string | null
          last_login?: string | null
          login_mode?: string
          nhf_opt_in?: boolean
          org_id?: string
          other_allowances?: number | null
          password_set_at?: string | null
          phone?: string | null
          role?: string
          terms_accepted_at?: string | null
          terms_accepted_version?: string | null
          transport_allowance?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          budget_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          method: string | null
          note: string | null
          org_id: string
          recurring: boolean
          source: string | null
          spent_on: string | null
        }
        Insert: {
          amount: number
          budget_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          method?: string | null
          note?: string | null
          org_id: string
          recurring?: boolean
          source?: string | null
          spent_on?: string | null
        }
        Update: {
          amount?: number
          budget_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          method?: string | null
          note?: string | null
          org_id?: string
          recurring?: boolean
          source?: string | null
          spent_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_lines: {
        Row: {
          allocated: number
          budget_line: string
          created_at: string
          currency: string
          disbursed: number
          donor_codes: string[]
          id: string
          notes: string | null
          org_id: string
          period: string | null
          updated_at: string
        }
        Insert: {
          allocated?: number
          budget_line: string
          created_at?: string
          currency?: string
          disbursed?: number
          donor_codes?: string[]
          id?: string
          notes?: string | null
          org_id: string
          period?: string | null
          updated_at?: string
        }
        Update: {
          allocated?: number
          budget_line?: string
          created_at?: string
          currency?: string
          disbursed?: number
          donor_codes?: string[]
          id?: string
          notes?: string | null
          org_id?: string
          period?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      funders: {
        Row: {
          amount: number
          contribution_date: string | null
          created_at: string
          currency: string
          funder_name: string
          id: string
          notes: string | null
          org_id: string
          project_ref: string | null
          source_type: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          contribution_date?: string | null
          created_at?: string
          currency?: string
          funder_name: string
          id?: string
          notes?: string | null
          org_id: string
          project_ref?: string | null
          source_type?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          contribution_date?: string | null
          created_at?: string
          currency?: string
          funder_name?: string
          id?: string
          notes?: string | null
          org_id?: string
          project_ref?: string | null
          source_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      income: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          invoice_no: string | null
          note: string | null
          org_id: string
          payer_contact: string | null
          payer_name: string | null
          payer_type: string | null
          period: string | null
          project_ref: string | null
          receipt_no: string | null
          source: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          invoice_no?: string | null
          note?: string | null
          org_id: string
          payer_contact?: string | null
          payer_name?: string | null
          payer_type?: string | null
          period?: string | null
          project_ref?: string | null
          receipt_no?: string | null
          source?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          invoice_no?: string | null
          note?: string | null
          org_id?: string
          payer_contact?: string | null
          payer_name?: string | null
          payer_type?: string | null
          period?: string | null
          project_ref?: string | null
          receipt_no?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          activity_id: number | null
          caption: string | null
          created_at: string
          department: string | null
          donor_visible: boolean
          file_path: string
          file_type: string | null
          id: number
          org_id: string
          uploaded_by_code: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          activity_id?: number | null
          caption?: string | null
          created_at?: string
          department?: string | null
          donor_visible?: boolean
          file_path: string
          file_type?: string | null
          id?: never
          org_id: string
          uploaded_by_code?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          activity_id?: number | null
          caption?: string | null
          created_at?: string
          department?: string | null
          donor_visible?: boolean
          file_path?: string
          file_type?: string | null
          id?: never
          org_id?: string
          uploaded_by_code?: string | null
          uploaded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          org_id: string
          recipient_code: string
          refs: Json | null
          sender_code: string
          sender_name: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          org_id: string
          recipient_code: string
          refs?: Json | null
          sender_code: string
          sender_name: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          recipient_code?: string
          refs?: Json | null
          sender_code?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_branding: {
        Row: {
          invoice_template_url: string | null
          letterhead_url: string | null
          logo_url: string | null
          org_id: string
          primary_color: string | null
          receipt_template_url: string | null
          signature_url: string | null
          updated_at: string
        }
        Insert: {
          invoice_template_url?: string | null
          letterhead_url?: string | null
          logo_url?: string | null
          org_id: string
          primary_color?: string | null
          receipt_template_url?: string | null
          signature_url?: string | null
          updated_at?: string
        }
        Update: {
          invoice_template_url?: string | null
          letterhead_url?: string | null
          logo_url?: string | null
          org_id?: string
          primary_color?: string | null
          receipt_template_url?: string | null
          signature_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_branding_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          acct_type: string
          active: boolean
          base_currency: string
          client_name: string | null
          country: string
          created_at: string
          custom_activity_types: Json | null
          custom_statuses: Json | null
          custom_templates: Json | null
          dash_tiles: Json | null
          ends_on: string | null
          field_labels: Json | null
          group_id: string | null
          hubs: Json | null
          id: string
          metric_field: string | null
          metric_label: string | null
          modules: Json | null
          name: string
          org_panels: Json | null
          reporting_schedule: string | null
          sector: string
          staff_limit: number | null
          starts_on: string | null
          subscription_end: string | null
          subscription_start: string | null
          updated_at: string
        }
        Insert: {
          acct_type?: string
          active?: boolean
          base_currency?: string
          client_name?: string | null
          country?: string
          created_at?: string
          custom_activity_types?: Json | null
          custom_statuses?: Json | null
          custom_templates?: Json | null
          dash_tiles?: Json | null
          ends_on?: string | null
          field_labels?: Json | null
          group_id?: string | null
          hubs?: Json | null
          id: string
          metric_field?: string | null
          metric_label?: string | null
          modules?: Json | null
          name: string
          org_panels?: Json | null
          reporting_schedule?: string | null
          sector?: string
          staff_limit?: number | null
          starts_on?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string
        }
        Update: {
          acct_type?: string
          active?: boolean
          base_currency?: string
          client_name?: string | null
          country?: string
          created_at?: string
          custom_activity_types?: Json | null
          custom_statuses?: Json | null
          custom_templates?: Json | null
          dash_tiles?: Json | null
          ends_on?: string | null
          field_labels?: Json | null
          group_id?: string | null
          hubs?: Json | null
          id?: string
          metric_field?: string | null
          metric_label?: string | null
          modules?: Json | null
          name?: string
          org_panels?: Json | null
          reporting_schedule?: string | null
          sector?: string
          staff_limit?: number | null
          starts_on?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      // PROVISIONAL — performance_reviews does not exist in the live schema
      // yet. 0014_performance_reviews.sql is written but not run (no
      // Supabase credentials in this session, same situation as every new
      // table before it — see docs/EXECUTION.md). Built by comparing
      // against summary_reports (a structurally similar existing table:
      // denormalized author, period, status enum, touch/freeze triggers).
      // Replace wholesale once the migration is run and types are
      // regenerated for real — do not merge alongside the real shape.
      performance_reviews: {
        Row: {
          areas_for_growth: string | null
          created_at: string
          employee_code: string
          employee_name: string | null
          id: string
          notes: string | null
          org_id: string
          period: string
          rating: number | null
          reviewer_code: string | null
          reviewer_name: string | null
          status: string
          strengths: string | null
          updated_at: string
        }
        Insert: {
          areas_for_growth?: string | null
          created_at?: string
          employee_code: string
          employee_name?: string | null
          id?: string
          notes?: string | null
          org_id: string
          period: string
          rating?: number | null
          reviewer_code?: string | null
          reviewer_name?: string | null
          status?: string
          strengths?: string | null
          updated_at?: string
        }
        Update: {
          areas_for_growth?: string | null
          created_at?: string
          employee_code?: string
          employee_name?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          period?: string
          rating?: number | null
          reviewer_code?: string | null
          reviewer_name?: string | null
          status?: string
          strengths?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      programmes: {
        Row: {
          created_at: string
          id: number
          name: string
          org_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          org_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          org_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programmes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          actual_value: number | null
          created_at: string
          due_date: string | null
          id: string
          org_id: string
          project_id: string
          proof_note: string | null
          seq: number
          status: string
          submitted_at: string | null
          target_unit: string | null
          target_value: number | null
          title: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          org_id: string
          project_id: string
          proof_note?: string | null
          seq: number
          status?: string
          submitted_at?: string | null
          target_unit?: string | null
          target_value?: number | null
          title: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          org_id?: string
          project_id?: string
          proof_note?: string | null
          seq?: number
          status?: string
          submitted_at?: string | null
          target_unit?: string | null
          target_value?: number | null
          title?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: number
          kind: string
          location: string | null
          name: string
          org_id: string
          ref_code: string | null
          status: string | null
          target_count: number | null
          unit: string | null
        }
        Insert: {
          budget?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: never
          kind?: string
          location?: string | null
          name: string
          org_id: string
          ref_code?: string | null
          status?: string | null
          target_count?: number | null
          unit?: string | null
        }
        Update: {
          budget?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: never
          kind?: string
          location?: string | null
          name?: string
          org_id?: string
          ref_code?: string | null
          status?: string | null
          target_count?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      summary_reports: {
        Row: {
          author_code: string | null
          author_name: string | null
          content: string
          created_at: string
          department: string | null
          id: string
          org_id: string
          period: string
          status: string
          updated_at: string
        }
        Insert: {
          author_code?: string | null
          author_name?: string | null
          content: string
          created_at?: string
          department?: string | null
          id?: string
          org_id: string
          period: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_code?: string | null
          author_name?: string | null
          content?: string
          created_at?: string
          department?: string | null
          id?: string
          org_id?: string
          period?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "summary_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          blocked: boolean
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          deliverables_done: string | null
          deliverables_json: string | null
          dept: string | null
          descr: string | null
          due: string | null
          geofence_label: string | null
          geofence_lat: number | null
          geofence_lng: number | null
          geofence_m: number | null
          id: string
          label: string | null
          org_id: string
          priority: string | null
          project_id: string | null
          proof_required: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          blocked?: boolean
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          deliverables_done?: string | null
          deliverables_json?: string | null
          dept?: string | null
          descr?: string | null
          due?: string | null
          geofence_label?: string | null
          geofence_lat?: number | null
          geofence_lng?: number | null
          geofence_m?: number | null
          id?: string
          label?: string | null
          org_id: string
          priority?: string | null
          project_id?: string | null
          proof_required?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          blocked?: boolean
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          deliverables_done?: string | null
          deliverables_json?: string | null
          dept?: string | null
          descr?: string | null
          due?: string | null
          geofence_label?: string | null
          geofence_lat?: number | null
          geofence_lng?: number | null
          geofence_m?: number | null
          id?: string
          label?: string | null
          org_id?: string
          priority?: string | null
          project_id?: string | null
          proof_required?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const