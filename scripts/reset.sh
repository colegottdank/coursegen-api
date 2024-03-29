#!/bin/bash

# Start Supabase
supabase db reset

# Wait for Supabase to start
echo "Waiting for Supabase to start..."
while ! supabase status > /dev/null 2>&1; do
  sleep 1
done
echo "Supabase started."

# Run Supabase functions
supabase functions serve --env-file=.env.local new_course
echo "OpenAI function started."