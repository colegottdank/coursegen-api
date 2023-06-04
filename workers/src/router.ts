import { Router } from 'itty-router';
import { createClient } from '@supabase/supabase-js';
import { RequestWrapper } from './lib/RequestWrapper';

// now let's create a router (note the lack of "new")
const router = Router();

// POST course
router.post('/api/v1/courses', async (request, requestWrapper: RequestWrapper) => {
	const supabase = createClient(requestWrapper.getSupabaseUrl(), requestWrapper.getSupabaseServiceRoleKey());
	const content = await request.json();

	return new Response('Creating Course: ' + JSON.stringify(content));
});

router.get('/api/v1/courses', () => new Response('Courses Index!'));

// GET collection index
router.get('/api/todos', () => new Response('Todos Index!'));

// GET item
router.get('/api/todos/:id', ({ params }) => new Response(`Todo #${params.id}`));

// POST to the collection (we'll use async here)
router.post('/api/todos', async (request) => {
	const content = await request.json();

	return new Response('Creating Todo: ' + JSON.stringify(content));
});

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default router;
