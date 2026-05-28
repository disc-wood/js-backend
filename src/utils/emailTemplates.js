import { createClient } from '@supabase/supabase-js';

const getSupabase = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export async function getTemplate(id) {
  const { data } = await getSupabase()
    .from('email_templates')
    .select('subject, body')
    .eq('id', id)
    .maybeSingle();
  return data || null;
}

// Substitutes {{var}} placeholders and converts plain text to HTML paragraphs
export function renderTemplate(body, vars = {}) {
  let text = body;
  for (const [key, val] of Object.entries(vars)) {
    text = text.replaceAll(`{{${key}}}`, val ?? '');
  }
  return text
    .split('\n\n')
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}
