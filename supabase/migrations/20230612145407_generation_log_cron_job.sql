ALTER TYPE generation_status_enum ADD VALUE 'timeout';

CREATE EXTENSION pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
    'update-generation-status', -- name of the cron job
    '* * * * *', -- every minute
    $$ 
    UPDATE generation_log 
    SET generation_status = 'timeout' 
    WHERE generation_status = 'in_progress' 
    AND created_at < NOW() - INTERVAL '3 minutes' 
    $$ 
);