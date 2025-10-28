// Supabase configuration file
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmdwerlustnzjlfurnur.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZHdlcmx1c3RuempsZnVybnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzcwMTEsImV4cCI6MjA3NzIxMzAxMX0.5rZJFgjv0ipYSSrnfW1mRpwquI9GTibpaNNv1oTP6Iw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

