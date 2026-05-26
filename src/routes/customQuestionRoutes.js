import express from 'express';
import { createClient } from '@supabase/supabase-js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

const getSupabase = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// PUBLIC — intake form fetches the active question on load
router.get('/:programId', async (req, res) => {
  const { programId } = req.params;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('custom_questions')
    .select('question_text, is_active')
    .eq('program_id', programId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch custom question:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.json(data || { question_text: null, is_active: false });
});

// PROTECTED — admin or matching-program supervisor can update
router.put('/:programId', authMiddleware, async (req, res) => {
  const { programId } = req.params;
  const { question_text, is_active } = req.body;
  const { uid, email, role } = req.user;
  const supabase = getSupabase();

  if (role !== 'admin') {
    if (role !== 'supervisor') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { data: assignments } = await supabase
      .from('user_assignments')
      .select('program_id')
      .eq('user_id', uid)
      .eq('program_id', programId);

    if (!assignments?.length) {
      return res.status(403).json({ error: 'You are not assigned to this program' });
    }
  }

  const { data, error } = await supabase
    .from('custom_questions')
    .upsert(
      {
        program_id: programId,
        question_text: question_text ?? null,
        is_active: is_active ?? true,
        updated_by_email: email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'program_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Failed to upsert custom question:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true, data });
});

export default router;
