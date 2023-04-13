#!/bin/bash

# Start Supabase
supabase start

# Wait for Supabase to start
echo "Waiting for Supabase to start..."
while ! supabase status > /dev/null 2>&1; do
  sleep 1
done
echo "Supabase started."

# Run Supabase functions
supabase functions serve --env-file=.env.local --import-map="./supabase/functions/import_map.json"
# supabase functions serve --env-file=.env.local new_course
# supabase functions serve --env-file=.env.local section_content
echo "OpenAI function started."