import express from 'express';
import { createClient } from '@supabase/supabase-js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

const getSupabase = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// GET all templates
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('email_templates')
      .select('id, subject, body');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Failed to fetch email templates:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// PATCH a single template's subject and body (must already exist)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: 'subject and body are required' });
    }
    const { data, error } = await getSupabase()
      .from('email_templates')
      .update({ subject, body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true, template: data });
  } catch (err) {
    console.error('Failed to update email template:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// PUT — upsert (create or update) a template by id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: 'subject and body are required' });
    }
    const { data, error } = await getSupabase()
      .from('email_templates')
      .upsert({ id: req.params.id, subject, body, updated_at: new Date().toISOString() })
      .select()
      .maybeSingle();
    if (error) throw error;
    res.json({ success: true, template: data });
  } catch (err) {
    console.error('Failed to upsert email template:', err);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

export default router;
