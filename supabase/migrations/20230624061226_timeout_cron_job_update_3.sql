SELECT cron.schedule(
    'update-generation-status', -- name of the cron job
    '* * * * *', -- every minute
    $$
    UPDATE generation_log
    SET generation_status = 'timeout', updated_at = NOW()
    WHERE generation_status = 'in_progress'
    AND (
        (reference_type = 'lessons' AND created_at < NOW() - INTERVAL '20 minutes') OR
        (reference_type = 'lesson' AND created_at < NOW() - INTERVAL '20 minutes') OR
        (reference_type = 'course' AND created_at < NOW() - INTERVAL '20 minutes')
    );
    $$
);
