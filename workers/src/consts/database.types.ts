export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      course: {
        Row: {
          created_at: string
          dates: string | null
          description: string
          id: string
          origin_course_id: string | null
          search_text: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dates?: string | null
          description: string
          id?: string
          origin_course_id?: string | null
          search_text: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dates?: string | null
          description?: string
          id?: string
          origin_course_id?: string | null
          search_text?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
      }
      course_item: {
        Row: {
          course_id: string
          created_at: string
          dates: string | null
          description: string | null
          id: string
          order_index: number
          parent_id: string | null
          title: string
          type: Database["public"]["Enums"]["course_item_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          dates?: string | null
          description?: string | null
          id?: string
          order_index: number
          parent_id?: string | null
          title: string
          type: Database["public"]["Enums"]["course_item_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          dates?: string | null
          description?: string | null
          id?: string
          order_index?: number
          parent_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["course_item_type"]
          updated_at?: string
          user_id?: string | null
        }
      }
      generation_log: {
        Row: {
          created_at: string
          generation_status: Database["public"]["Enums"]["generation_status_enum"]
          generator_user_id: string
          id: string
          owner_user_id: string
          reference_id: string
          reference_name: string
          reference_type: Database["public"]["Enums"]["reference_type_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          generation_status: Database["public"]["Enums"]["generation_status_enum"]
          generator_user_id: string
          id?: string
          owner_user_id: string
          reference_id: string
          reference_name: string
          reference_type: Database["public"]["Enums"]["reference_type_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          generation_status?: Database["public"]["Enums"]["generation_status_enum"]
          generator_user_id?: string
          id?: string
          owner_user_id?: string
          reference_id?: string
          reference_name?: string
          reference_type?: Database["public"]["Enums"]["reference_type_enum"]
          updated_at?: string
        }
      }
      lesson_origin_topic: {
        Row: {
          lesson_id: string
          topic_id: string
        }
        Insert: {
          lesson_id: string
          topic_id: string
        }
        Update: {
          lesson_id?: string
          topic_id?: string
        }
      }
      module_origin_lesson: {
        Row: {
          lesson_id: string
          module_id: string
        }
        Insert: {
          lesson_id: string
          module_id: string
        }
        Update: {
          lesson_id?: string
          module_id?: string
        }
      }
      profile: {
        Row: {
          first_name: string | null
          generating_status:
            | Database["public"]["Enums"]["generating_status"]
            | null
          id: string
          last_name: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          first_name?: string | null
          generating_status?:
            | Database["public"]["Enums"]["generating_status"]
            | null
          id: string
          last_name?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          first_name?: string | null
          generating_status?:
            | Database["public"]["Enums"]["generating_status"]
            | null
          id?: string
          last_name?: string | null
          updated_at?: string
          username?: string | null
        }
      }
      section: {
        Row: {
          content: string | null
          course_id: string | null
          created_at: string
          dates: string | null
          description: string
          id: number
          parent_id: number | null
          path: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          course_id?: string | null
          created_at?: string
          dates?: string | null
          description: string
          id?: number
          parent_id?: number | null
          path: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          course_id?: string | null
          created_at?: string
          dates?: string | null
          description?: string
          id?: number
          parent_id?: number | null
          path?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
      }
      topic: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          id: string
          lesson_id: string
          order_index: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          id?: string
          lesson_id: string
          order_index?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
          order_index?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_course_and_sections: {
        Args: {
          course_data: string
          section_data: string
          user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      course_item_type: "module" | "lesson"
      generating_status: "generating" | "idle"
      generation_status_enum: "in_progress" | "success" | "failure" | "timeout"
      reference_type_enum: "course" | "lesson" | "lessons"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          path_tokens: string[] | null
          updated_at: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

