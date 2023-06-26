ALTER TYPE reference_type_enum ADD VALUE 'lessons';

SELECT cron.schedule(
    'update-generation-status', -- name of the cron job
    '* * * * *', -- every minute
    $$
    UPDATE generation_log
    SET generation_status = 'timeout'
    WHERE generation_status = 'in_progress'
    AND (
        (reference_type = 'lessons' AND created_at < NOW() - INTERVAL '10 minutes') OR
        (reference_type <> 'lessons' AND created_at < NOW() - INTERVAL '3 minutes')
    );
    $$
);